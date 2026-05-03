import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { sendApiError } from '../lib/apiError.js';

export const licenciasRouter = Router();

const ROLES_REVISORES = new Set(['ADMIN', 'CAPITAN', 'TENIENTE']);
const CARGOS_REVISORES = new Set([
  'CAPITAN_COMPANIA',
  'TENIENTE_PRIMERO',
  'TENIENTE_SEGUNDO',
  'TENIENTE_TERCERO',
  'TENIENTE_CUARTO',
  'AYUDANTE_COMPANIA',
  'PRO_AYUDANTE_COMPANIA',
]);
const ESTADOS_VALIDOS = new Set(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'ANULADA']);
const uploadsLicenciasDir = path.resolve(process.cwd(), 'uploads/licencias');
fs.mkdirSync(uploadsLicenciasDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsLicenciasDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `licencia-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadLicencia = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const permitidos = new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ]);
    if (!permitidos.has(mime)) {
      cb(new Error('Formato de archivo no permitido'));
      return;
    }
    cb(null, true);
  },
});

function parseDate(value: unknown): Date | null {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function puedeRevisar(uid: number, rolRaw: string | undefined): Promise<boolean> {
  const rol = (rolRaw ?? '').trim().toUpperCase();
  if (ROLES_REVISORES.has(rol)) {
    return true;
  }
  const u = await prisma.usuario.findUnique({
    where: { id: uid },
    select: { cargoOficialidad: true },
  });
  const cargo = (u?.cargoOficialidad ?? '').trim().toUpperCase();
  return CARGOS_REVISORES.has(cargo);
}

licenciasRouter.get('/activas', async (req, res) => {
  const fecha = parseDate(req.query.fecha);
  if (!fecha) {
    sendApiError(res, 400, 'LICENCIAS_FECHA', 'fecha inválida (YYYY-MM-DD)');
    return;
  }
  const base = new Date(fecha);
  base.setHours(0, 0, 0, 0);
  try {
    const rows = await prisma.licenciaMedica.findMany({
      where: {
        estado: 'APROBADA',
        fechaInicio: { lte: base },
        fechaTermino: { gte: base },
      },
      select: {
        id: true,
        usuarioId: true,
        fechaInicio: true,
        fechaTermino: true,
        motivo: true,
      },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_ACTIVAS', 'No se pudo listar licencias activas');
  }
});

licenciasRouter.get('/resumen', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  const fecha = req.query.fecha ? parseDate(req.query.fecha) : new Date();
  if (!fecha) {
    sendApiError(res, 400, 'LICENCIAS_FECHA', 'fecha inválida (YYYY-MM-DD)');
    return;
  }
  try {
    const ok = await puedeRevisar(uid, req.user?.rol);
    if (!ok) {
      sendApiError(res, 403, 'LICENCIAS_FORBIDDEN_ROL', 'Acceso denegado por rol/cargo');
      return;
    }
    const base = new Date(fecha);
    base.setHours(0, 0, 0, 0);
    const [usuarios, licencias] = await Promise.all([
      prisma.usuario.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, rut: true, rol: true, cargoOficialidad: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.licenciaMedica.findMany({
        where: {
          estado: { in: ['PENDIENTE', 'APROBADA'] },
          fechaInicio: { lte: base },
          fechaTermino: { gte: base },
        },
        select: { usuarioId: true, estado: true },
      }),
    ]);
    const conLicenciaIds = new Set<number>();
    const mandoPermisoIds = new Set<number>();
    for (const l of licencias) {
      if (l.estado === 'APROBADA') {
        conLicenciaIds.add(l.usuarioId);
        continue;
      }
      if (l.estado === 'PENDIENTE') {
        mandoPermisoIds.add(l.usuarioId);
      }
    }
    for (const id of conLicenciaIds) {
      mandoPermisoIds.delete(id);
    }
    const conLicencia = usuarios.filter((u) => conLicenciaIds.has(u.id));
    const mandoPermiso = usuarios.filter((u) => mandoPermisoIds.has(u.id));
    const sinPermiso = usuarios.filter((u) => !conLicenciaIds.has(u.id) && !mandoPermisoIds.has(u.id));
    res.json({
      fecha: base.toISOString(),
      mandoPermiso,
      sinPermiso,
      conLicencia,
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_RESUMEN', 'No se pudo cargar resumen de licencias');
  }
});

licenciasRouter.get('/mis', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  try {
    const rows = await prisma.licenciaMedica.findMany({
      where: { usuarioId: uid },
      orderBy: { createdAt: 'desc' },
      include: {
        resueltoPor: { select: { id: true, nombre: true, rol: true } },
      },
      take: 300,
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_HISTORIAL', 'No se pudo listar historial de licencias');
  }
});

licenciasRouter.get('/adjuntos/:filename', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  const filename = path.basename(String(req.params.filename || ''));
  if (!filename) {
    sendApiError(res, 400, 'LICENCIAS_ARCHIVO', 'Archivo inválido');
    return;
  }
  try {
    const row = await prisma.licenciaMedica.findFirst({
      where: { archivoUrl: { endsWith: `/${filename}` } },
      select: { usuarioId: true },
    });
    if (!row) {
      sendApiError(res, 404, 'LICENCIAS_ADJUNTO_NO', 'Adjunto no encontrado');
      return;
    }
    const puedeVer = row.usuarioId === uid || (await puedeRevisar(uid, req.user?.rol));
    if (!puedeVer) {
      sendApiError(res, 403, 'LICENCIAS_ADJUNTO_FORBIDDEN', 'No autorizado para ver este adjunto');
      return;
    }
    const abs = path.resolve(uploadsLicenciasDir, filename);
    if (!abs.startsWith(uploadsLicenciasDir) || !fs.existsSync(abs)) {
      sendApiError(res, 404, 'LICENCIAS_ADJUNTO_NO', 'Adjunto no encontrado');
      return;
    }
    res.sendFile(abs);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_ADJUNTO_DESCARGA', 'No se pudo descargar adjunto');
  }
});

licenciasRouter.get('/', async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  try {
    const ok = await puedeRevisar(uid, req.user?.rol);
    if (!ok) {
      sendApiError(res, 403, 'LICENCIAS_FORBIDDEN_ROL', 'Acceso denegado por rol/cargo');
      return;
    }
    const estadoRaw = String(req.query.estado ?? '').trim().toUpperCase();
    const where = estadoRaw && ESTADOS_VALIDOS.has(estadoRaw) ? { estado: estadoRaw } : {};
    const rows = await prisma.licenciaMedica.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
      include: {
        usuario: {
          select: { id: true, nombre: true, rut: true, rol: true, cargoOficialidad: true },
        },
        resueltoPor: { select: { id: true, nombre: true, rol: true } },
      },
      take: 1000,
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_LIST', 'No se pudo listar licencias');
  }
});

licenciasRouter.post('/', uploadLicencia.single('adjunto'), async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  const fechaInicio = parseDate(req.body?.fechaInicio);
  const fechaTermino = parseDate(req.body?.fechaTermino);
  const motivo = String(req.body?.motivo ?? '').trim();
  const archivoUrl = req.file ? `/api/licencias/adjuntos/${req.file.filename}` : null;
  if (!fechaInicio || !fechaTermino || !motivo) {
    sendApiError(res, 400, 'LICENCIAS_CREAR_CAMPOS', 'fechaInicio, fechaTermino y motivo son obligatorios');
    return;
  }
  if (fechaTermino.getTime() < fechaInicio.getTime()) {
    sendApiError(res, 400, 'LICENCIAS_FECHAS_ORDEN', 'fechaTermino no puede ser menor a fechaInicio');
    return;
  }
  try {
    const created = await prisma.licenciaMedica.create({
      data: {
        usuarioId: uid,
        fechaInicio,
        fechaTermino,
        motivo,
        archivoUrl,
        estado: 'PENDIENTE',
      },
      include: {
        usuario: { select: { id: true, nombre: true, rol: true } },
      },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_CREAR', 'No se pudo crear licencia médica');
  }
});

licenciasRouter.patch('/:id', async (req, res) => {
  const uid = req.user?.uid;
  const id = Number(req.params.id);
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  if (!Number.isFinite(id) || id <= 0) {
    sendApiError(res, 400, 'LICENCIAS_ID', 'id inválido');
    return;
  }
  try {
    const row = await prisma.licenciaMedica.findUnique({ where: { id } });
    if (!row) {
      sendApiError(res, 404, 'LICENCIAS_NO_ENCONTRADA', 'Licencia no encontrada');
      return;
    }
    if (row.usuarioId !== uid) {
      sendApiError(res, 403, 'LICENCIAS_EDITAR_PROPIA', 'Solo puedes editar tus propias licencias');
      return;
    }
    if (row.estado !== 'PENDIENTE') {
      sendApiError(res, 400, 'LICENCIAS_EDITAR_ESTADO', 'Solo se puede editar una licencia PENDIENTE');
      return;
    }
    const data: Record<string, unknown> = {};
    if (req.body?.fechaInicio !== undefined) {
      const d = parseDate(req.body.fechaInicio);
      if (!d) {
        sendApiError(res, 400, 'LICENCIAS_FECHA_INICIO', 'fechaInicio inválida');
        return;
      }
      data.fechaInicio = d;
    }
    if (req.body?.fechaTermino !== undefined) {
      const d = parseDate(req.body.fechaTermino);
      if (!d) {
        sendApiError(res, 400, 'LICENCIAS_FECHA_TERMINO', 'fechaTermino inválida');
        return;
      }
      data.fechaTermino = d;
    }
    if (req.body?.motivo !== undefined) {
      const m = String(req.body.motivo ?? '').trim();
      if (!m) {
        sendApiError(res, 400, 'LICENCIAS_MOTIVO', 'motivo no puede ir vacío');
        return;
      }
      data.motivo = m;
    }
    if (req.body?.archivoUrl !== undefined) {
      data.archivoUrl = String(req.body.archivoUrl ?? '').trim() || null;
    }
    const fi = (data.fechaInicio as Date | undefined) ?? row.fechaInicio;
    const ft = (data.fechaTermino as Date | undefined) ?? row.fechaTermino;
    if (ft.getTime() < fi.getTime()) {
      sendApiError(res, 400, 'LICENCIAS_FECHAS_ORDEN', 'fechaTermino no puede ser menor a fechaInicio');
      return;
    }
    const updated = await prisma.licenciaMedica.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_ACTUALIZAR', 'No se pudo actualizar licencia médica');
  }
});

licenciasRouter.patch('/:id/estado', async (req, res) => {
  const uid = req.user?.uid;
  const id = Number(req.params.id);
  if (!uid) {
    sendApiError(res, 401, 'LICENCIAS_UNAUTHORIZED', 'No autorizado');
    return;
  }
  if (!Number.isFinite(id) || id <= 0) {
    sendApiError(res, 400, 'LICENCIAS_ID', 'id inválido');
    return;
  }
  const estado = String(req.body?.estado ?? '').trim().toUpperCase();
  if (!ESTADOS_VALIDOS.has(estado)) {
    sendApiError(res, 400, 'LICENCIAS_ESTADO', 'estado inválido');
    return;
  }
  try {
    const ok = await puedeRevisar(uid, req.user?.rol);
    if (!ok) {
      sendApiError(res, 403, 'LICENCIAS_FORBIDDEN_ROL', 'Acceso denegado por rol/cargo');
      return;
    }
    const updated = await prisma.licenciaMedica.update({
      where: { id },
      data: {
        estado,
        observacionResolucion: String(req.body?.observacionResolucion ?? '').trim() || null,
        resueltoPorId: uid,
        resueltoEn: new Date(),
      },
      include: {
        usuario: { select: { id: true, nombre: true, rol: true } },
        resueltoPor: { select: { id: true, nombre: true, rol: true } },
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'LICENCIAS_ESTADO_UPDATE', 'No se pudo cambiar estado de licencia');
  }
});

licenciasRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendApiError(res, 400, 'LICENCIAS_ADJUNTO_TAMANO', 'El archivo supera 8 MB');
      return;
    }
    sendApiError(res, 400, 'LICENCIAS_ADJUNTO_INVALIDO', 'Adjunto inválido');
    return;
  }
  if (err instanceof Error && err.message.includes('Formato de archivo no permitido')) {
    sendApiError(
      res,
      400,
      'LICENCIAS_ADJUNTO_FORMATO',
      'Formato no permitido. Usa PDF o imagen (PNG/JPG/WEBP/GIF).',
    );
    return;
  }
  next(err);
});
