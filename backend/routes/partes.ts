import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { siguienteCorrelativo } from '../lib/correlativo.js';
import { requireRoles } from '../middleware/roles.js';
import { registrarActividad } from '../lib/auditoria.js';
import { sendApiError } from '../lib/apiError.js';
import { formatFechaHoraChile } from '../lib/fechaChile.js';

export const partesRouter = Router();

const includeParte = {
  obac: { select: { id: true, nombre: true, rut: true, rol: true, firmaImagen: true } },
  unidades: {
    include: {
      carro: { select: { id: true, nomenclatura: true, patente: true } },
    },
  },
  pacientes: true,
} as const;

function firstQueryString(q: unknown): string | undefined {
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && typeof q[0] === 'string') return q[0];
  return undefined;
}

function buildParteListWhere(query: Record<string, unknown>): Prisma.ParteEmergenciaWhereInput {
  const where: Prisma.ParteEmergenciaWhereInput = {};
  const tipo = firstQueryString(query.tipo);
  if (tipo && tipo !== 'todos') {
    where.claveEmergencia = tipo;
  }
  const q = firstQueryString(query.q);
  if (q && q.trim()) {
    where.direccion = { contains: q.trim(), mode: 'insensitive' };
  }
  const desde = firstQueryString(query.desde);
  const hasta = firstQueryString(query.hasta);
  const desdeOk = Boolean(desde && !Number.isNaN(Date.parse(desde)));
  const hastaOk = Boolean(hasta && !Number.isNaN(Date.parse(hasta)));
  if (desdeOk || hastaOk) {
    const fechaFilter: Prisma.DateTimeFilter = {};
    if (desdeOk) fechaFilter.gte = new Date(desde!);
    if (hastaOk) fechaFilter.lte = new Date(hasta!);
    where.fecha = fechaFilter;
  }
  return where;
}

/** Listado paginado (filtros opcionales). Debe declararse antes de `/:id`. */
partesRouter.get('/pagina', async (req, res) => {
  const page = Math.max(1, parseInt(String(firstQueryString(req.query.page) ?? '1'), 10) || 1);
  const rawSize = parseInt(String(firstQueryString(req.query.pageSize) ?? '10'), 10) || 10;
  const pageSize = Math.min(200, Math.max(1, rawSize));
  const where = buildParteListWhere(req.query as Record<string, unknown>);
  try {
    const [total, rows] = await Promise.all([
      prisma.parteEmergencia.count({ where }),
      prisma.parteEmergencia.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: includeParte,
      }),
    ]);
    const items = rows.map((p) => ({
      ...p,
      fechaLegible: formatFechaHoraChile(p.fecha),
    }));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ items, total, page, pageSize, totalPages });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'PARTES_LIST_PAGINA', 'Error al listar partes con paginación.');
  }
});

/** Totales globales para tarjetas del listado (sin filtros de búsqueda). */
partesRouter.get('/metricas', async (_req, res) => {
  try {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const startYear = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const startMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const endMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    const [totalSistema, enAnioActual, enMesActual] = await Promise.all([
      prisma.parteEmergencia.count(),
      prisma.parteEmergencia.count({ where: { fecha: { gte: startYear } } }),
      prisma.parteEmergencia.count({
        where: { fecha: { gte: startMonth, lte: endMonth } },
      }),
    ]);
    res.json({ totalSistema, enAnioActual, enMesActual });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'PARTES_METRICAS', 'Error al obtener indicadores de partes.');
  }
});

partesRouter.get('/', async (_req, res) => {
  try {
    const partes = await prisma.parteEmergencia.findMany({
      orderBy: { fecha: 'desc' },
      include: includeParte,
    });
    res.json(partes);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'PARTES_LIST', 'Error al listar partes.');
  }
});

partesRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || !Number.isFinite(id) || id <= 0) {
    sendApiError(res, 400, 'PARTES_ID_INVALIDO', 'Identificador de parte inv�lido.');
    return;
  }
  try {
    const parte = await prisma.parteEmergencia.findUnique({
      where: { id },
      include: includeParte,
    });
    if (!parte) {
      sendApiError(res, 404, 'PARTES_NOT_FOUND', 'Parte no encontrado.');
      return;
    }
    res.json({ ...parte, fechaLegible: formatFechaHoraChile(parte.fecha) });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'PARTES_GET', 'Error al obtener el parte.');
  }
});

type UnidadInput = {
  carroId: number;
  horaSalida: string;
  horaLlegada: string;
  hora6_0: string;
  hora6_3: string;
  hora6_9: string;
  hora6_10: string;
  kmSalida: number;
  kmLlegada: number;
};

type PacienteInput = { nombre: string; triage: string; edad?: number; rut?: string };

/** Parsea unidades; en modo borrador omite filas sin carro v?lido. */
function parseUnidades(unidades: unknown, esBorrador: boolean): UnidadInput[] | null {
  if (!Array.isArray(unidades)) {
    return esBorrador ? [] : null;
  }
  const out: UnidadInput[] = [];
  for (const raw of unidades) {
    if (!raw || typeof raw !== 'object') continue;
    const u = raw as Record<string, unknown>;
    const carroId = Number(u.carroId);
    if (!Number.isFinite(carroId) || carroId <= 0) {
      if (esBorrador) continue;
      return null;
    }
    const pickH = (key: string): string => {
      const v = u[key];
      return typeof v === 'string' ? v.trim() : '';
    };
    const hora6_0 = pickH('hora6_0') || pickH('horaSalida');
    const hora6_3 = pickH('hora6_3');
    const hora6_9 = pickH('hora6_9');
    const hora6_10 = pickH('hora6_10') || pickH('horaLlegada');
    const horaSalida = pickH('horaSalida') || hora6_0;
    const horaLlegada = pickH('horaLlegada') || hora6_10;
    if (!esBorrador && (!horaSalida || !horaLlegada)) {
      return null;
    }
    const kmSalida =
      typeof u.kmSalida === 'number'
        ? u.kmSalida
        : Number.parseInt(String(u.kmSalida ?? ''), 10) || 0;
    const kmLlegada =
      typeof u.kmLlegada === 'number'
        ? u.kmLlegada
        : Number.parseInt(String(u.kmLlegada ?? ''), 10) || 0;
    const padH = (h: string) => h || '00:00';
    out.push({
      carroId,
      horaSalida: padH(horaSalida),
      horaLlegada: padH(horaLlegada),
      hora6_0: padH(hora6_0),
      hora6_3: padH(hora6_3),
      hora6_9: padH(hora6_9),
      hora6_10: padH(hora6_10),
      kmSalida,
      kmLlegada,
    });
  }
  return out;
}

partesRouter.post('/', requireRoles('TENIENTE', 'CAPITAN', 'ADMIN'), async (req, res) => {
  const body = req.body as {
    claveEmergencia?: string;
    direccion?: string;
    obacId?: number;
    fecha?: string;
    estado?: string;
    borrador?: boolean;
    unidades?: unknown;
    pacientes?: PacienteInput[];
    metadata?: unknown;
  };

  const esBorrador = body.estado === 'BORRADOR' || body.borrador === true;

  if (body.obacId === undefined || typeof body.obacId !== 'number' || !Number.isFinite(body.obacId)) {
    sendApiError(res, 400, 'PARTES_OBAC_REQUERIDO', 'obacId es requerido.');
    return;
  }

  const unidadesParsed = parseUnidades(body.unidades, esBorrador);
  if (unidadesParsed === null) {
    sendApiError(res, 400, 'PARTES_UNIDAD_INVALIDA', 'Datos de unidad inv�lidos.');
    return;
  }
  if (!esBorrador && unidadesParsed.length === 0) {
    sendApiError(res, 400, 'PARTES_UNIDAD_VACIA', 'Debe incluir al menos una unidad.');
    return;
  }

  let claveEmergencia = typeof body.claveEmergencia === 'string' ? body.claveEmergencia.trim() : '';
  let direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';

  if (!esBorrador) {
    if (!claveEmergencia) {
      sendApiError(res, 400, 'PARTES_CLAVE_REQUERIDA', 'claveEmergencia es requerida.');
      return;
    }
    if (!direccion) {
      sendApiError(res, 400, 'PARTES_DIRECCION_REQUERIDA', 'direccion es requerida.');
      return;
    }
  } else {
    if (!claveEmergencia) claveEmergencia = '10-9';
    if (!direccion) direccion = '��� Borrador (sin direcci?n)';
  }

  const pacientes = Array.isArray(body.pacientes) ? body.pacientes : [];
  for (const p of pacientes) {
    if (typeof p.nombre !== 'string' || typeof p.triage !== 'string') {
      sendApiError(res, 400, 'PARTES_PACIENTE_INVALIDO', 'Datos de paciente inv�lidos.');
      return;
    }
  }

  const fecha = body.fecha ? new Date(body.fecha) : new Date();
  if (Number.isNaN(fecha.getTime())) {
    sendApiError(res, 400, 'PARTES_FECHA_INVALIDA', 'fecha inv�lida.');
    return;
  }

  const estado =
    typeof body.estado === 'string' && body.estado.trim()
      ? body.estado.trim().toUpperCase()
      : esBorrador
        ? 'BORRADOR'
        : 'PENDIENTE';

  let metadata: Prisma.InputJsonValue | undefined;
  if (
    body.metadata !== undefined &&
    body.metadata !== null &&
    typeof body.metadata === 'object' &&
    !Array.isArray(body.metadata)
  ) {
    metadata = body.metadata as Prisma.InputJsonValue;
  }

  try {
    const correlativo = await siguienteCorrelativo();

    const unidadesCreate = unidadesParsed.map((u) => ({
      carroId: u.carroId,
      horaSalida: u.horaSalida,
      horaLlegada: u.horaLlegada,
      hora6_0: u.hora6_0,
      hora6_3: u.hora6_3,
      hora6_9: u.hora6_9,
      hora6_10: u.hora6_10,
      kmSalida: u.kmSalida,
      kmLlegada: u.kmLlegada,
    }));

    const data: Prisma.ParteEmergenciaCreateInput = {
      correlativo,
      claveEmergencia,
      direccion,
      fecha,
      estado,
      obac: { connect: { id: body.obacId } },
    };
    if (metadata !== undefined) {
      data.metadata = metadata;
    }
    if (unidadesCreate.length > 0) {
      data.unidades = { create: unidadesCreate };
    }
    if (pacientes.length > 0) {
      data.pacientes = {
        create: pacientes.map((p) => ({
          nombre: p.nombre.trim(),
          triage: p.triage.trim().toUpperCase(),
          edad:
            typeof p.edad === 'number' && Number.isFinite(p.edad) ? Math.floor(p.edad) : null,
          rut: typeof p.rut === 'string' && p.rut.trim() ? p.rut.trim() : null,
        })),
      };
    }

    const parte = await prisma.parteEmergencia.create({
      data,
      include: includeParte,
    });

    await registrarActividad({
      usuarioId: req.user?.uid,
      accion: 'PARTE_CREADO',
      modulo: 'PARTES',
      referencia: `parte:${parte.id}`,
    });

    res.status(201).json(parte);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'PARTES_CREATE', 'Error al crear parte.');
  }
});

partesRouter.patch('/:id', requireRoles('TENIENTE', 'CAPITAN', 'ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || !Number.isFinite(id) || id <= 0) {
    sendApiError(res, 400, 'PARTES_ID_INVALIDO', 'Identificador de parte inv�lido.');
    return;
  }
  const body = req.body as {
    claveEmergencia?: string;
    direccion?: string;
    fecha?: string;
    estado?: string;
    obacId?: number;
    unidades?: unknown;
    pacientes?: PacienteInput[];
    metadata?: unknown | null;
  };
  const data: {
    claveEmergencia?: string;
    direccion?: string;
    fecha?: Date;
    estado?: string;
    obac?: { connect: { id: number } };
    metadata?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    unidades?: { deleteMany: Record<string, never>; create: UnidadInput[] };
    pacientes?: {
      deleteMany: Record<string, never>;
      create: Array<{ nombre: string; triage: string; edad: number | null; rut: string | null }>;
    };
  } = {};
  if (body.claveEmergencia !== undefined) {
    if (typeof body.claveEmergencia !== 'string' || !body.claveEmergencia.trim()) {
      sendApiError(res, 400, 'PARTES_CLAVE_INVALIDA', 'claveEmergencia inv�lida.');
      return;
    }
    data.claveEmergencia = body.claveEmergencia.trim();
  }
  if (body.direccion !== undefined) {
    if (typeof body.direccion !== 'string' || !body.direccion.trim()) {
      sendApiError(res, 400, 'PARTES_DIRECCION_INVALIDA', 'direccion inv�lida.');
      return;
    }
    data.direccion = body.direccion.trim();
  }
  if (body.estado !== undefined) {
    if (typeof body.estado !== 'string' || !body.estado.trim()) {
      sendApiError(res, 400, 'PARTES_ESTADO_INVALIDO', 'estado inv�lido.');
      return;
    }
    data.estado = body.estado.trim().toUpperCase();
  }
  if (body.fecha !== undefined) {
    const fecha = new Date(body.fecha);
    if (Number.isNaN(fecha.getTime())) {
      sendApiError(res, 400, 'PARTES_FECHA_INVALIDA', 'fecha inv�lida.');
      return;
    }
    data.fecha = fecha;
  }
  if (body.obacId !== undefined) {
    if (typeof body.obacId !== 'number' || !Number.isFinite(body.obacId) || body.obacId <= 0) {
      sendApiError(res, 400, 'PARTES_OBAC_INVALIDO', 'obacId inv�lido.');
      return;
    }
    data.obac = { connect: { id: body.obacId } };
  }
  if (body.metadata !== undefined) {
    if (body.metadata === null) {
      data.metadata = Prisma.JsonNull;
    } else if (typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
      data.metadata = body.metadata as Prisma.InputJsonValue;
    } else {
      sendApiError(res, 400, 'PARTES_METADATA_INVALIDA', 'metadata inv�lida.');
      return;
    }
  }
  if (body.unidades !== undefined) {
    const estadoEvaluado = (body.estado ?? '').trim().toUpperCase();
    const esBorrador = estadoEvaluado === 'BORRADOR';
    const unidadesParsed = parseUnidades(body.unidades, esBorrador);
    if (unidadesParsed === null) {
      sendApiError(res, 400, 'PARTES_UNIDAD_INVALIDA', 'Datos de unidad inv�lidos.');
      return;
    }
    if (!esBorrador && unidadesParsed.length === 0) {
      sendApiError(res, 400, 'PARTES_UNIDAD_VACIA', 'Debe incluir al menos una unidad.');
      return;
    }
    data.unidades = {
      deleteMany: {},
      create: unidadesParsed,
    };
  }
  if (body.pacientes !== undefined) {
    if (!Array.isArray(body.pacientes)) {
      sendApiError(res, 400, 'PARTES_PACIENTES_INVALIDOS', 'pacientes inv�lidos.');
      return;
    }
    for (const p of body.pacientes) {
      if (typeof p.nombre !== 'string' || typeof p.triage !== 'string') {
        sendApiError(res, 400, 'PARTES_PACIENTE_INVALIDO', 'Datos de paciente inv�lidos.');
        return;
      }
    }
    data.pacientes = {
      deleteMany: {},
      create: body.pacientes.map((p) => ({
        nombre: p.nombre.trim(),
        triage: p.triage.trim().toUpperCase(),
        edad:
          typeof p.edad === 'number' && Number.isFinite(p.edad) ? Math.floor(p.edad) : null,
        rut: typeof p.rut === 'string' && p.rut.trim() ? p.rut.trim() : null,
      })),
    };
  }
  if (Object.keys(data).length === 0) {
    sendApiError(res, 400, 'PARTES_PATCH_VACIO', 'No se enviaron cambios.');
    return;
  }
  try {
    const parte = await prisma.parteEmergencia.update({
      where: { id },
      data,
      include: includeParte,
    });
    await registrarActividad({
      usuarioId: req.user?.uid,
      accion: 'PARTE_ACTUALIZADO',
      modulo: 'PARTES',
      referencia: `parte:${id}`,
    });
    res.json(parte);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'PARTES_PATCH', 'Error al actualizar parte.');
  }
});
