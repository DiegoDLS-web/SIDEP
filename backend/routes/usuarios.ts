import { Router } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { registrarActividad } from '../lib/auditoria.js';
import {
  esCargoValido,
  esTipoVoluntarioValido,
  nombreCompletoDesdePartes,
  normalizarFirmaDataUrl,
  normalizarFotoPerfil,
} from '../lib/usuario-perfil.js';
import { sendApiError } from '../lib/apiError.js';
import { firstQueryString } from '../lib/httpQuery.js';

export const usuariosRouter = Router();

const ROLES_PUEDEN_ASIGNAR = new Set(['ADMIN', 'CAPITAN', 'TENIENTE']);

const selectUsuario = {
  id: true,
  nombre: true,
  rut: true,
  rol: true,
  email: true,
  telefono: true,
  activo: true,
  nombres: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  nacionalidad: true,
  grupoSanguineo: true,
  direccion: true,
  region: true,
  comuna: true,
  actividad: true,
  fechaNacimiento: true,
  fechaIngreso: true,
  tipoVoluntario: true,
  cuerpoBombero: true,
  compania: true,
  estadoVoluntario: true,
  cargoOficialidad: true,
  observacionesRegistro: true,
  firmaImagen: true,
  fotoPerfil: true,
  requiereCambioPassword: true,
  createdAt: true,
  updatedAt: true,
} as const;

function buildUsuarioListWhere(qRaw: string | undefined): Prisma.UsuarioWhereInput {
  const q = qRaw?.trim();
  if (!q) return {};
  const ic = { contains: q, mode: 'insensitive' as const };
  return {
    OR: [
      { nombre: ic },
      { nombres: ic },
      { apellidoPaterno: ic },
      { apellidoMaterno: ic },
      { rut: ic },
      { email: ic },
      { compania: ic },
      { rol: ic },
      { tipoVoluntario: ic },
      { cargoOficialidad: ic },
    ],
  };
}

function puedeAsignarRol(req: { user?: { rol?: string } }): boolean {
  const r = req.user?.rol?.trim().toUpperCase();
  return r ? ROLES_PUEDEN_ASIGNAR.has(r) : false;
}

function parseDate(s: unknown): Date | null {
  if (s == null || s === '') return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

function validarCreacionCompleta(body: Record<string, unknown>): string | null {
  const req = [
    'nombres',
    'apellidoPaterno',
    'apellidoMaterno',
    'rut',
    'nacionalidad',
    'direccion',
    'region',
    'comuna',
    'fechaNacimiento',
    'fechaIngreso',
    'email',
    'telefono',
    'tipoVoluntario',
    'cuerpoBombero',
    'compania',
    'estadoVoluntario',
    'cargoOficialidad',
    'rol',
  ] as const;
  for (const k of req) {
    const v = body[k];
    if (v === undefined || v === null || String(v).trim() === '') {
      return `Campo obligatorio faltante: ${k}`;
    }
  }
  if (!parseDate(body.fechaNacimiento)) return 'fechaNacimiento inválida';
  if (!parseDate(body.fechaIngreso)) return 'fechaIngreso inválida';
  if (!esTipoVoluntarioValido(String(body.tipoVoluntario))) return 'tipoVoluntario inválido';
  if (!esCargoValido(String(body.cargoOficialidad))) return 'cargoOficialidad inválido';
  const ev = String(body.estadoVoluntario).toUpperCase();
  if (ev !== 'VIGENTE' && ev !== 'INACTIVO') return 'estadoVoluntario debe ser VIGENTE o INACTIVO';
  return null;
}

usuariosRouter.get('/metricas', async (_req, res) => {
  try {
    const [totalSistema, activos, inactivos, conLicencia, suspension, rolesRows] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { activo: true } }),
      prisma.usuario.count({ where: { activo: false } }),
      prisma.usuario.count({
        where: { tipoVoluntario: { contains: 'LICENCIA', mode: 'insensitive' } },
      }),
      prisma.usuario.count({
        where: {
          OR: [
            { tipoVoluntario: { contains: 'SUSP', mode: 'insensitive' } },
            { estadoVoluntario: { contains: 'SUSP', mode: 'insensitive' } },
          ],
        },
      }),
      prisma.usuario.groupBy({ by: ['rol'], _count: { _all: true } }),
    ]);
    res.json({
      totalSistema,
      activos,
      inactivos,
      conLicencia,
      suspension,
      totalRoles: rolesRows.length,
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'USUARIOS_METRICAS', 'Error al obtener métricas de usuarios.');
  }
});

usuariosRouter.get('/pagina', async (req, res) => {
  const page = Math.max(1, parseInt(String(firstQueryString(req.query.page) ?? '1'), 10) || 1);
  const rawSize = parseInt(String(firstQueryString(req.query.pageSize) ?? '9'), 10) || 9;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const q = firstQueryString(req.query.q);
  const where = buildUsuarioListWhere(q);
  try {
    const [total, rows] = await Promise.all([
      prisma.usuario.count({ where }),
      prisma.usuario.findMany({
        where,
        select: selectUsuario,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ items: rows, total, page, pageSize, totalPages });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'USUARIOS_LIST_PAGINA', 'Error al listar usuarios con paginación.');
  }
});

usuariosRouter.get('/', async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: selectUsuario,
      orderBy: { nombre: 'asc' },
    });
    res.json(usuarios);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'USUARIOS_LIST', 'Error al listar usuarios');
  }
});

usuariosRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    sendApiError(res, 400, 'USUARIOS_ID_INVALIDO', 'ID inválido.');
    return;
  }
  try {
    const u = await prisma.usuario.findUnique({ where: { id }, select: selectUsuario });
    if (!u) {
      sendApiError(res, 404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado.');
      return;
    }
    res.json(u);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'USUARIO_DETALLE', 'Error al obtener usuario.');
  }
});

usuariosRouter.post('/', async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const err = validarCreacionCompleta(body);
  if (err) {
    sendApiError(res, 400, 'USUARIOS_VALIDACION', err);
    return;
  }
  const bodyRol = String(body.rol ?? '').trim().toUpperCase();
  try {
    const rol = await prisma.rolUsuario.findFirst({ where: { nombre: bodyRol, activo: true } });
    if (!rol) {
      sendApiError(res, 400, 'USUARIOS_ROL_INVALIDO', 'El rol indicado no existe o está inactivo');
      return;
    }
    let firma: string | null = null;
    if (body.firmaImagen != null && String(body.firmaImagen).trim() !== '') {
      try {
        firma = normalizarFirmaDataUrl(String(body.firmaImagen));
      } catch (e) {
        sendApiError(res, 400, 'USUARIOS_FIRMA_INVALIDA', e instanceof Error ? e.message : 'Firma inválida');
        return;
      }
    }
    let fotoPerfil: string | null = null;
    if (body.fotoPerfil != null && String(body.fotoPerfil).trim() !== '') {
      try {
        fotoPerfil = normalizarFotoPerfil(String(body.fotoPerfil));
      } catch (e) {
        sendApiError(
          res,
          400,
          'USUARIOS_FOTO_INVALIDA',
          e instanceof Error ? e.message : 'Foto de perfil inválida',
        );
        return;
      }
    }
    const nombres = String(body.nombres).trim();
    const apellidoPaterno = String(body.apellidoPaterno).trim();
    const apellidoMaterno = String(body.apellidoMaterno).trim();
    const nombre = nombreCompletoDesdePartes({ nombres, apellidoPaterno, apellidoMaterno }) || 'Sin nombre';
    const ev = String(body.estadoVoluntario).toUpperCase();
    const activo = ev !== 'INACTIVO';

    const gsRaw = body.grupoSanguineo;
    const grupoSanguineo =
      gsRaw != null && String(gsRaw).trim() !== '' ? String(gsRaw).trim() : null;
    const actRaw = body.actividad;
    const actividad = actRaw != null && String(actRaw).trim() !== '' ? String(actRaw).trim() : null;

    const passwordInicial = 'primera1958';
    const creado = await prisma.usuario.create({
      data: {
        nombre,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        rut: String(body.rut).trim(),
        nacionalidad: String(body.nacionalidad).trim(),
        grupoSanguineo,
        direccion: String(body.direccion).trim(),
        region: String(body.region).trim(),
        comuna: String(body.comuna).trim(),
        actividad,
        fechaNacimiento: parseDate(body.fechaNacimiento),
        fechaIngreso: parseDate(body.fechaIngreso),
        email: String(body.email).trim().toLowerCase(),
        telefono: String(body.telefono).trim(),
        tipoVoluntario: String(body.tipoVoluntario).trim(),
        cuerpoBombero: String(body.cuerpoBombero).trim(),
        compania: String(body.compania).trim(),
        estadoVoluntario: ev,
        cargoOficialidad: String(body.cargoOficialidad).trim(),
        observacionesRegistro: body.observacionesRegistro
          ? String(body.observacionesRegistro).trim()
          : null,
        firmaImagen: firma,
        fotoPerfil,
        rol: bodyRol,
        activo,
        requiereCambioPassword: true,
        password: await bcrypt.hash(passwordInicial, 10),
      },
      select: selectUsuario,
    });
    await registrarActividad({
      usuarioId: req.user?.uid,
      accion: 'USUARIO_CREADO',
      modulo: 'USUARIOS',
      referencia: `usuario:${creado.id}`,
    });
    res.status(201).json(creado);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'USUARIOS_CREAR', 'Error al crear usuario (revisa rut/email únicos)');
  }
});

usuariosRouter.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    sendApiError(res, 400, 'USUARIOS_ID_INVALIDO', 'ID inválido');
    return;
  }
  const body = req.body as Record<string, unknown>;
  if (body.rol !== undefined && !puedeAsignarRol(req)) {
    sendApiError(res, 403, 'USUARIOS_ROL_SIN_PERMISO', 'No autorizado a modificar el rol');
    return;
  }
  try {
    if (body.rol !== undefined) {
      const rolNormalizado = String(body.rol).trim().toUpperCase();
      const rol = await prisma.rolUsuario.findFirst({ where: { nombre: rolNormalizado, activo: true } });
      if (!rol) {
        sendApiError(res, 400, 'USUARIOS_ROL_INVALIDO', 'El rol indicado no existe o está inactivo');
        return;
      }
    }
    let firma: string | null | undefined;
    if (body.firmaImagen !== undefined) {
      const raw = body.firmaImagen;
      if (raw === null || raw === '') {
        firma = null;
      } else {
        try {
          firma = normalizarFirmaDataUrl(String(raw));
        } catch (e) {
          sendApiError(res, 400, 'USUARIOS_FIRMA_INVALIDA', e instanceof Error ? e.message : 'Firma inválida');
          return;
        }
      }
    }

    let fotoPerfilParche: string | null | undefined;
    if (body.fotoPerfil !== undefined) {
      const rawFoto = body.fotoPerfil;
      if (rawFoto === null || rawFoto === '') {
        fotoPerfilParche = null;
      } else {
        try {
          fotoPerfilParche = normalizarFotoPerfil(String(rawFoto));
        } catch (e) {
          sendApiError(
            res,
            400,
            'USUARIOS_FOTO_INVALIDA',
            e instanceof Error ? e.message : 'Foto de perfil inválida',
          );
          return;
        }
      }
    }

    const data: Record<string, unknown> = {};
    const setStr = (k: string, v: unknown) => {
      if (v === undefined) return;
      if (v === null || v === '') {
        data[k] = null;
        return;
      }
      data[k] = String(v).trim();
    };

    if (body.nombre !== undefined) setStr('nombre', body.nombre);
    if (body.nombres !== undefined) setStr('nombres', body.nombres);
    if (body.apellidoPaterno !== undefined) setStr('apellidoPaterno', body.apellidoPaterno);
    if (body.apellidoMaterno !== undefined) setStr('apellidoMaterno', body.apellidoMaterno);
    if (body.rut !== undefined) setStr('rut', body.rut);
    if (body.nacionalidad !== undefined) setStr('nacionalidad', body.nacionalidad);
    if (body.grupoSanguineo !== undefined) setStr('grupoSanguineo', body.grupoSanguineo);
    if (body.direccion !== undefined) setStr('direccion', body.direccion);
    if (body.region !== undefined) setStr('region', body.region);
    if (body.comuna !== undefined) setStr('comuna', body.comuna);
    if (body.actividad !== undefined) setStr('actividad', body.actividad);
    if (body.tipoVoluntario !== undefined) {
      const t = String(body.tipoVoluntario).trim();
      if (!esTipoVoluntarioValido(t)) {
        sendApiError(res, 400, 'USUARIOS_TIPO_VOLUNTARIO', 'tipoVoluntario inválido');
        return;
      }
      data.tipoVoluntario = t;
    }
    if (body.cuerpoBombero !== undefined) setStr('cuerpoBombero', body.cuerpoBombero);
    if (body.compania !== undefined) setStr('compania', body.compania);
    if (body.cargoOficialidad !== undefined) {
      const c = String(body.cargoOficialidad).trim();
      if (!esCargoValido(c)) {
        sendApiError(res, 400, 'USUARIOS_CARGO', 'cargoOficialidad inválido');
        return;
      }
      data.cargoOficialidad = c;
    }
    if (body.observacionesRegistro !== undefined) {
      data.observacionesRegistro =
        body.observacionesRegistro === null || body.observacionesRegistro === ''
          ? null
          : String(body.observacionesRegistro).trim();
    }
    if (body.email !== undefined) {
      data.email =
        body.email === null || body.email === '' ? null : String(body.email).trim().toLowerCase();
    }
    if (body.telefono !== undefined) {
      data.telefono = body.telefono === null || body.telefono === '' ? null : String(body.telefono).trim();
    }
    if (body.activo !== undefined) data.activo = Boolean(body.activo);
    if (body.rol !== undefined) data.rol = String(body.rol).trim().toUpperCase();
    if (body.fechaNacimiento !== undefined) {
      data.fechaNacimiento = parseDate(body.fechaNacimiento);
    }
    if (body.fechaIngreso !== undefined) {
      data.fechaIngreso = parseDate(body.fechaIngreso);
    }
    if (body.estadoVoluntario !== undefined) {
      const ev = String(body.estadoVoluntario).toUpperCase();
      if (ev !== 'VIGENTE' && ev !== 'INACTIVO') {
        sendApiError(res, 400, 'USUARIOS_ESTADO_VOLUNTARIO', 'estadoVoluntario inválido');
        return;
      }
      data.estadoVoluntario = ev;
      data.activo = ev !== 'INACTIVO';
    }
    if (firma !== undefined) {
      data.firmaImagen = firma;
    }
    if (fotoPerfilParche !== undefined) {
      data.fotoPerfil = fotoPerfilParche;
    }

    const actual = await prisma.usuario.findUnique({ where: { id } });
    if (!actual) {
      sendApiError(res, 404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
      return;
    }

    const nombres = (data.nombres as string | undefined) ?? actual.nombres;
    const ap = (data.apellidoPaterno as string | undefined) ?? actual.apellidoPaterno;
    const am = (data.apellidoMaterno as string | undefined) ?? actual.apellidoMaterno;
    const comp = nombreCompletoDesdePartes({
      nombres: nombres ?? '',
      apellidoPaterno: ap ?? '',
      apellidoMaterno: am ?? '',
    });
    if (comp) {
      data.nombre = comp;
    }

    if (Object.keys(data).length === 0) {
      const u = await prisma.usuario.findUnique({ where: { id }, select: selectUsuario });
      if (!u) {
        sendApiError(res, 404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
        return;
      }
      res.json(u);
      return;
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data: data as Prisma.UsuarioUpdateInput,
      select: selectUsuario,
    });
    await registrarActividad({
      usuarioId: req.user?.uid,
      accion: 'USUARIO_ACTUALIZADO',
      modulo: 'USUARIOS',
      referencia: `usuario:${actualizado.id}`,
    });
    res.json(actualizado);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      sendApiError(res, 400, 'USUARIOS_DUPLICADO', 'El correo o RUT ya está registrado en otra cuenta.');
      return;
    }
    console.error(e);
    sendApiError(res, 500, 'USUARIOS_ACTUALIZAR', 'Error al actualizar usuario');
  }
});

usuariosRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || id <= 0) {
    sendApiError(res, 400, 'USUARIOS_ID_INVALIDO', 'ID inválido');
    return;
  }
  const rol = req.user?.rol?.trim().toUpperCase();
  if (rol !== 'ADMIN') {
    sendApiError(res, 403, 'USUARIOS_DELETE_ROL', 'Solo ADMIN puede eliminar usuarios');
    return;
  }
  if (req.user?.uid === id) {
    sendApiError(res, 400, 'USUARIOS_DELETE_SELF', 'No puedes eliminar tu propio usuario');
    return;
  }
  try {
    const existe = await prisma.usuario.findUnique({ where: { id }, select: { id: true } });
    if (!existe) {
      sendApiError(res, 404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
      return;
    }
    await prisma.usuario.delete({ where: { id } });
    await registrarActividad({
      usuarioId: req.user?.uid,
      accion: 'USUARIO_ELIMINADO',
      modulo: 'USUARIOS',
      referencia: `usuario:${id}`,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    try {
      const now = new Date().toISOString();
      const prev = await prisma.usuario.findUnique({
        where: { id },
        select: { observacionesRegistro: true },
      });
      if (!prev) {
        sendApiError(res, 404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
        return;
      }
      const nota = `[${now}] Baja automática: no se pudo eliminar físicamente el usuario.`;
      const observacionesRegistro = [prev.observacionesRegistro?.trim(), nota]
        .filter(Boolean)
        .join('\n');
      await prisma.usuario.update({
        where: { id },
        data: {
          activo: false,
          estadoVoluntario: 'INACTIVO',
          observacionesRegistro,
        },
      });
      await registrarActividad({
        usuarioId: req.user?.uid,
        accion: 'USUARIO_BAJA_POR_REFERENCIAS',
        modulo: 'USUARIOS',
        referencia: `usuario:${id}`,
      });
      res.status(200).json({
        ok: true,
        softDeleted: true,
        message:
          'No se pudo eliminar físicamente el usuario, pero se dio de baja automáticamente.',
      });
    } catch (softErr) {
      console.error(softErr);
      sendApiError(
        res,
        500,
        'USUARIOS_DELETE_FALLBACK',
        'No se pudo eliminar ni dar de baja automáticamente al usuario.',
      );
    }
  }
});
