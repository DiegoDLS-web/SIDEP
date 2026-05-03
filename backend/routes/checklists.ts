import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireRoles } from '../middleware/roles.js';
import { sendApiError } from '../lib/apiError.js';
import { firstQueryString } from '../lib/httpQuery.js';

export const checklistsRouter = Router();

const includeChecklist = {
  carro: { select: { id: true, nomenclatura: true, nombre: true } },
  cuartelero: { select: { id: true, nombre: true, rol: true, firmaImagen: true } },
} as const;

type PlantillaMaterial = { nombre: string; cantidadRequerida: number };
type PlantillaUbicacion = { nombre: string; materiales: PlantillaMaterial[] };
type EstadoChecklist = 'COMPLETADO' | 'PENDIENTE' | 'CON_OBSERVACION';

function estadoChecklistDesdeTotalesYObs(
  totalItems: number | null | undefined,
  itemsOk: number | null | undefined,
  observaciones: string | null | undefined,
): EstadoChecklist {
  const total = Number(totalItems ?? 0);
  const ok = Number(itemsOk ?? 0);
  const tieneObs = String(observaciones ?? '').trim().length > 0;
  if (tieneObs) return 'CON_OBSERVACION';
  if (total > 0 && ok >= total) return 'COMPLETADO';
  return 'PENDIENTE';
}

function enrichVigencia<T extends { id: number }>(items: T[]): Array<T & { vigente: boolean; obsoleto: boolean }> {
  let latestId = -1;
  for (const row of items) {
    if (row.id > latestId) latestId = row.id;
  }
  return items.map((row) => ({
    ...row,
    vigente: row.id === latestId,
    obsoleto: row.id !== latestId,
  }));
}

function buildEraListWhere(query: Record<string, unknown>): Prisma.ChecklistCarroWhereInput {
  const where: Prisma.ChecklistCarroWhereInput = { tipo: 'ERA' };
  const unidad = firstQueryString(query.unidad)?.trim();
  if (unidad) {
    where.carro = { nomenclatura: unidad };
  }
  const desde = firstQueryString(query.desde);
  const hasta = firstQueryString(query.hasta);
  const desdeOk = Boolean(desde && !Number.isNaN(Date.parse(desde)));
  const hastaOk = Boolean(hasta && !Number.isNaN(Date.parse(hasta)));
  if (desdeOk || hastaOk) {
    const fechaFilter: Prisma.DateTimeFilter = {};
    if (desdeOk) fechaFilter.gte = new Date(desde!);
    if (hastaOk) {
      const d = new Date(hasta!);
      d.setHours(23, 59, 59, 999);
      fechaFilter.lte = d;
    }
    where.fecha = fechaFilter;
  }
  return where;
}

function enrichVigenciaPor<T extends { id: number }>(
  items: T[],
  keyFn: (row: T) => string | number,
): Array<T & { vigente: boolean; obsoleto: boolean }> {
  const latestByKey = new Map<string, number>();
  for (const row of items) {
    const key = String(keyFn(row));
    const prev = latestByKey.get(key) ?? -1;
    if (row.id > prev) latestByKey.set(key, row.id);
  }
  return items.map((row) => {
    const latest = latestByKey.get(String(keyFn(row))) ?? -1;
    return { ...row, vigente: row.id === latest, obsoleto: row.id !== latest };
  });
}

/** Plantillas ERA/TRAUMA persistentes por clave única (`__ALL__` aplica a toda nomenclatura). */
const CLAVE_PLANTILLAS_TRAUMA = 'CHECKLIST_TRAUMA_PLANTILLAS';
/** Plantillas ERA guardadas por nomenclatura (incluye `__ALL__` opcional como respaldo). */
const CLAVE_PLANTILLAS_ERA = 'CHECKLIST_ERA_PLANTILLAS';

async function obtenerPlantillaTrauma(unidad: string): Promise<unknown | null> {
  const cfg = await prisma.configuracionSistema.findUnique({
    where: { clave: CLAVE_PLANTILLAS_TRAUMA },
    select: { valor: true },
  });
  const v = ((cfg?.valor ?? {}) as Record<string, unknown>) || {};
  const per = v[unidad];
  const all = v.__ALL__ ?? v.__default__;
  return (per ?? all) ?? null;
}

async function obtenerPlantillaEra(unidad: string): Promise<unknown | null> {
  const cfg = await prisma.configuracionSistema.findUnique({
    where: { clave: CLAVE_PLANTILLAS_ERA },
    select: { valor: true },
  });
  const v = ((cfg?.valor ?? {}) as Record<string, unknown>) || {};
  const per = v[unidad];
  const all = v.__ALL__ ?? v.__default__;
  return (per ?? all) ?? null;
}

async function obtenerPlantillaTipo(tipoRaw: string, unidad: string): Promise<unknown | null> {
  const tipo = tipoRaw.trim().toUpperCase();
  if (tipo === 'TRAUMA') {
    return obtenerPlantillaTrauma(unidad);
  }
  if (tipo === 'ERA') {
    return obtenerPlantillaEra(unidad);
  }
  return null;
}

async function guardarPlantillaTraumaGlobal(plantilla: unknown): Promise<void> {
  const cfg = await prisma.configuracionSistema.findUnique({
    where: { clave: CLAVE_PLANTILLAS_TRAUMA },
    select: { valor: true },
  });
  const prev = ((cfg?.valor ?? {}) as Record<string, unknown>) || {};
  const next: Record<string, unknown> = { ...prev, __ALL__: plantilla };
  await prisma.configuracionSistema.upsert({
    where: { clave: CLAVE_PLANTILLAS_TRAUMA },
    update: { valor: next as Prisma.InputJsonValue },
    create: { clave: CLAVE_PLANTILLAS_TRAUMA, valor: next as Prisma.InputJsonValue },
  });
}

async function guardarPlantillaEraPorUnidad(unidad: string, plantilla: unknown): Promise<void> {
  const cfg = await prisma.configuracionSistema.findUnique({
    where: { clave: CLAVE_PLANTILLAS_ERA },
    select: { valor: true },
  });
  const prev = ((cfg?.valor ?? {}) as Record<string, unknown>) || {};
  const next: Record<string, unknown> = { ...prev, [unidad]: plantilla };
  await prisma.configuracionSistema.upsert({
    where: { clave: CLAVE_PLANTILLAS_ERA },
    update: { valor: next as Prisma.InputJsonValue },
    create: { clave: CLAVE_PLANTILLAS_ERA, valor: next as Prisma.InputJsonValue },
  });
}

function calcularEstadoOperativo(totalItems: number | null | undefined, itemsOk: number | null | undefined): boolean {
  const total = Number(totalItems ?? 0);
  const ok = Number(itemsOk ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return true;
  }
  return Number.isFinite(ok) && ok >= total;
}

function normalizarPlantillaUnidad(raw: unknown): PlantillaUbicacion[] {
  if (!Array.isArray(raw)) return [];
  const out: PlantillaUbicacion[] = [];
  for (const u of raw) {
    if (!u || typeof u !== 'object') continue;
    const ru = u as { nombre?: unknown; materiales?: unknown };
    const nombre = String(ru.nombre ?? '').trim();
    if (!nombre) continue;
    const mats: PlantillaMaterial[] = [];
    if (Array.isArray(ru.materiales)) {
      for (const m of ru.materiales) {
        if (!m || typeof m !== 'object') continue;
        const rm = m as { nombre?: unknown; cantidadRequerida?: unknown };
        const matNombre = String(rm.nombre ?? '').trim();
        const cant = Number(rm.cantidadRequerida ?? 0);
        if (!matNombre) continue;
        mats.push({ nombre: matNombre, cantidadRequerida: Number.isFinite(cant) ? Math.max(0, Math.round(cant)) : 0 });
      }
    }
    out.push({ nombre, materiales: mats });
  }
  return out;
}

async function obtenerPlantillaUnidad(unidad: string): Promise<PlantillaUbicacion[]> {
  const cfg = await prisma.configuracionSistema.findUnique({
    where: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS' },
    select: { valor: true },
  });
  const valor = (cfg?.valor ?? null) as Record<string, unknown> | null;
  const desdeCfg = normalizarPlantillaUnidad(valor?.[unidad]);
  if (desdeCfg.length > 0) return desdeCfg;
  const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad }, select: { id: true } });
  if (!carro) return [];
  const last = await prisma.checklistCarro.findFirst({
    where: { carroId: carro.id, tipo: 'UNIDAD' },
    orderBy: { fecha: 'desc' },
    select: { detalle: true },
  });
  const detalle = (last?.detalle ?? null) as { ubicaciones?: unknown } | null;
  return normalizarPlantillaUnidad(detalle?.ubicaciones);
}

/** GET plantilla opcional ERA/TRAUMA (TRAUMA: fallback `__ALL__` para todas las unidades). */
checklistsRouter.get('/plantillas/:tipo/:unidad', async (req, res) => {
  const tipo = String(req.params.tipo ?? '');
  const unidad = String(req.params.unidad ?? '').trim();
  if (!unidad) {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
    return;
  }
  try {
    const plantilla = await obtenerPlantillaTipo(tipo, unidad);
    res.json({ plantilla });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_PLANTILLA_CARGA', 'Error al cargar plantilla');
  }
});

checklistsRouter.put(
  '/plantillas/:tipo/:unidad',
  requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'),
  async (req, res) => {
    const tipo = String(req.params.tipo ?? '').trim().toUpperCase();
    const unidad = String(req.params.unidad ?? '').trim();
    if (!unidad) {
      sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
      return;
    }
    if (tipo !== 'TRAUMA' && tipo !== 'ERA') {
      sendApiError(res, 400, 'CHECKLIST_PLANTILLA_TIPO', 'Solo se pueden guardar plantillas TRAUMA o ERA');
      return;
    }
    const plantilla = (req.body as { plantilla?: unknown } | null)?.plantilla;
    if (plantilla === undefined || plantilla === null) {
      sendApiError(res, 400, 'CHECKLIST_PLANTILLA_CUERPO', 'Cuerpo inválido');
      return;
    }
    try {
      if (tipo === 'TRAUMA') {
        await guardarPlantillaTraumaGlobal(plantilla);
      } else {
        await guardarPlantillaEraPorUnidad(unidad, plantilla);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      sendApiError(
        res,
        500,
        tipo === 'TRAUMA' ? 'CHECKLIST_PLANTILLA_TRAUMA_GUARDAR' : 'CHECKLIST_PLANTILLA_ERA_GUARDAR',
        tipo === 'TRAUMA' ? 'Error al guardar plantilla trauma' : 'Error al guardar plantilla ERA',
      );
    }
  },
);

checklistsRouter.get('/unidad/:unidad/plantilla', async (req, res) => {
  const unidad = String(req.params.unidad ?? '').trim();
  if (!unidad) {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
    return;
  }
  try {
    const plantilla = await obtenerPlantillaUnidad(unidad);
    res.json({ unidad, ubicaciones: plantilla });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_UNIDAD_PLANTILLA_CARGA', 'Error al cargar plantilla de checklist unidad');
  }
});

checklistsRouter.put('/unidad/:unidad/plantilla', requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), async (req, res) => {
  const unidad = String(req.params.unidad ?? '').trim();
  if (!unidad) {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
    return;
  }
  const ubicaciones = normalizarPlantillaUnidad((req.body as { ubicaciones?: unknown } | null)?.ubicaciones);
  if (ubicaciones.length === 0) {
    sendApiError(
      res,
      400,
      'CHECKLIST_UNIDAD_PLANTILLA_VACIA',
      'La plantilla debe incluir al menos un compartimiento con materiales.',
    );
    return;
  }
  try {
    const cfg = await prisma.configuracionSistema.findUnique({
      where: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS' },
      select: { valor: true },
    });
    const previo = ((cfg?.valor ?? {}) as Record<string, unknown>) || {};
    const next: Record<string, unknown> = { ...previo, [unidad]: ubicaciones };
    await prisma.configuracionSistema.upsert({
      where: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS' },
      update: { valor: next as Prisma.InputJsonValue },
      create: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS', valor: next as Prisma.InputJsonValue },
    });
    res.json({ unidad, ubicaciones });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_UNIDAD_PLANTILLA_GUARDAR', 'Error al guardar plantilla de checklist unidad');
  }
});

checklistsRouter.get('/unidad/:unidad/historial', async (req, res) => {
  const unidad = req.params.unidad;
  if (!unidad) {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad } });
    if (!carro) {
      sendApiError(res, 404, 'CHECKLIST_UNIDAD_NO_ENCONTRADA', 'Unidad no encontrada');
      return;
    }
    const items = await prisma.checklistCarro.findMany({
      where: { carroId: carro.id, tipo: 'UNIDAD' },
      orderBy: { fecha: 'desc' },
      take: 100,
      include: includeChecklist,
    });
    const enriched = enrichVigencia(items).map((row) => ({
      ...row,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
    }));
    res.json(enriched);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_HISTORIAL_UNIDAD', 'Error al cargar historial de checklist');
  }
});

checklistsRouter.get('/unidad/:unidad/historial-era', async (req, res) => {
  const unidad = req.params.unidad;
  if (!unidad) {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad } });
    if (!carro) {
      sendApiError(res, 404, 'CHECKLIST_UNIDAD_NO_ENCONTRADA', 'Unidad no encontrada');
      return;
    }
    const items = await prisma.checklistCarro.findMany({
      where: { carroId: carro.id, tipo: 'ERA' },
      orderBy: { fecha: 'desc' },
      take: 100,
      include: includeChecklist,
    });
    const enriched = enrichVigencia(items).map((row) => ({
      ...row,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
    }));
    res.json(enriched);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_HISTORIAL_ERA_UNIDAD', 'Error al cargar historial ERA');
  }
});

checklistsRouter.get('/selector', async (_req, res) => {
  try {
    const carros = await prisma.carro.findMany({
      orderBy: { nomenclatura: 'asc' },
      include: {
        checklists: {
          where: { tipo: 'UNIDAD' },
          orderBy: { fecha: 'desc' },
          take: 1,
          include: { cuartelero: { select: { nombre: true } } },
        },
      },
    });

    const items = carros.map((c) => {
      const ultimo = c.checklists[0] ?? null;
      const total = ultimo?.totalItems ?? 0;
      const ok = ultimo?.itemsOk ?? 0;
      return {
        id: c.id,
        unidad: String(c.nomenclatura ?? '').trim() || `U-${c.id}`,
        nombre: (c.nombre ?? '').trim() || `Unidad ${String(c.nomenclatura ?? c.id)}`,
        imagenUrl: c.imagenUrl ?? null,
        ultimaRevision: ultimo
          ? {
              fecha: ultimo.fecha.toISOString(),
              inspector: ultimo.inspector ?? null,
              obac: ultimo.cuartelero?.nombre ?? null,
              responsable:
                (ultimo.inspector ?? '').trim() ||
                (ultimo.cuartelero?.nombre ?? '').trim() ||
                '—',
              completado: total > 0 ? ok >= total : true,
              estadoChecklist: estadoChecklistDesdeTotalesYObs(total, ok, ultimo.observaciones),
            }
          : null,
        itemsTotal: total,
        itemsOk: ok,
        itemsFaltantes: Math.max(total - ok, 0),
      };
    });

    res.json(items);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_SELECTOR', 'Error al cargar resumen checklist');
  }
});

checklistsRouter.get('/unidad/:unidad', async (req, res) => {
  const unidad = req.params.unidad;
  if (!unidad) {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_REQUERIDA', 'Unidad requerida');
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad } });
    if (!carro) {
      sendApiError(res, 404, 'CHECKLIST_UNIDAD_NO_ENCONTRADA', 'Unidad no encontrada');
      return;
    }
    const checklist = await prisma.checklistCarro.findFirst({
      where: { carroId: carro.id, tipo: 'UNIDAD' },
      orderBy: { fecha: 'desc' },
      include: includeChecklist,
    });
    res.json({
      unidad: carro.nomenclatura,
      carro,
      checklist: checklist
        ? {
            ...checklist,
            estadoChecklist: estadoChecklistDesdeTotalesYObs(
              checklist.totalItems,
              checklist.itemsOk,
              checklist.observaciones,
            ),
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_UNIDAD_OBTENER', 'Error al obtener checklist de unidad');
  }
});

checklistsRouter.post('/unidad/:unidad', async (req, res) => {
  const unidad = req.params.unidad;
  const body = req.body as {
    cuarteleroId?: number;
    inspector?: string;
    grupoGuardia?: string;
    firmaOficial?: string;
    firmaInspector?: string;
    observaciones?: string;
    totalItems?: number;
    itemsOk?: number;
    detalle?: unknown;
  };
  const cuarteleroUnidadId = body.cuarteleroId;
  if (!unidad || typeof cuarteleroUnidadId !== 'number') {
    sendApiError(res, 400, 'CHECKLIST_UNIDAD_CUARTELERO', 'Unidad y cuarteleroId son requeridos');
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad } });
    if (!carro) {
      sendApiError(res, 404, 'CHECKLIST_UNIDAD_NO_ENCONTRADA', 'Unidad no encontrada');
      return;
    }
    const totalItems = typeof body.totalItems === 'number' ? body.totalItems : null;
    const itemsOk = typeof body.itemsOk === 'number' ? body.itemsOk : null;
    const estadoOperativoCarro = calcularEstadoOperativo(totalItems, itemsOk);
    const esBorrador = Boolean(
      body.detalle &&
        typeof body.detalle === 'object' &&
        !Array.isArray(body.detalle) &&
        (body.detalle as { borrador?: boolean }).borrador === true,
    );
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.checklistCarro.create({
        data: {
          carroId: carro.id,
          cuarteleroId: cuarteleroUnidadId,
          tipo: 'UNIDAD',
          inspector: body.inspector ?? null,
          grupoGuardia: body.grupoGuardia ?? null,
          firmaOficial: body.firmaOficial ?? null,
          firmaInspector: body.firmaInspector ?? null,
          observaciones: body.observaciones ?? null,
          totalItems,
          itemsOk,
          ...(body.detalle !== undefined
            ? { detalle: body.detalle as Prisma.InputJsonValue }
            : {}),
        },
        include: includeChecklist,
      });
      if (!esBorrador) {
        await tx.carro.update({
          where: { id: carro.id },
          data: { estadoOperativo: estadoOperativoCarro },
        });
      }
      return row;
    });
    res.status(201).json({
      ...created,
      vigente: true,
      obsoleto: false,
      estadoOperativoCarro: esBorrador ? undefined : estadoOperativoCarro,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(created.totalItems, created.itemsOk, created.observaciones),
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_UNIDAD_GUARDAR', 'Error al guardar checklist de unidad');
  }
});

checklistsRouter.get('/era/ultimos-por-unidad', async (_req, res) => {
  try {
    const carros = await prisma.carro.findMany({
      select: { id: true },
      orderBy: { nomenclatura: 'asc' },
    });
    const rowList = await Promise.all(
      carros.map((c) =>
        prisma.checklistCarro.findFirst({
          where: { carroId: c.id, tipo: 'ERA' },
          orderBy: { fecha: 'desc' },
          include: includeChecklist,
        }),
      ),
    );
    const rows = rowList.filter((r): r is NonNullable<(typeof rowList)[number]> => r != null);
    const enriched = enrichVigenciaPor(rows, (r) => r.carroId).map((row) => ({
      ...row,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
    }));
    res.json(enriched);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_ERA_ULTIMOS', 'Error al cargar últimos ERA por unidad.');
  }
});

checklistsRouter.get('/era/pagina', async (req, res) => {
  const page = Math.max(1, parseInt(String(firstQueryString(req.query.page) ?? '1'), 10) || 1);
  const rawSize = parseInt(String(firstQueryString(req.query.pageSize) ?? '10'), 10) || 10;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const where = buildEraListWhere(req.query as Record<string, unknown>);
  try {
    const [total, checks] = await Promise.all([
      prisma.checklistCarro.count({ where }),
      prisma.checklistCarro.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: includeChecklist,
      }),
    ]);
    const enriched = enrichVigenciaPor(checks, (r) => r.carroId).map((row) => ({
      ...row,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
    }));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ items: enriched, total, page, pageSize, totalPages });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_ERA_PAGINA', 'Error al listar checklist ERA paginado.');
  }
});

checklistsRouter.get('/era', async (_req, res) => {
  try {
    const checks = await prisma.checklistCarro.findMany({
      where: { tipo: 'ERA' },
      orderBy: { fecha: 'desc' },
      take: 30,
      include: includeChecklist,
    });
    const enriched = enrichVigenciaPor(checks, (r) => r.carroId).map((row) => ({
      ...row,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
    }));
    res.json(enriched);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_ERA_LIST', 'Error al listar checklist ERA');
  }
});

checklistsRouter.post('/era', async (req, res) => {
  const body = req.body as {
    unidad?: string;
    cuarteleroId?: number;
    inspector?: string;
    grupoGuardia?: string;
    firmaOficial?: string;
    firmaInspector?: string;
    observaciones?: string;
    totalItems?: number;
    itemsOk?: number;
    detalle?: unknown;
  };
  if (!body.unidad || typeof body.cuarteleroId !== 'number') {
    sendApiError(res, 400, 'CHECKLIST_ERA_CUARTELERO', 'unidad y cuarteleroId son requeridos');
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: body.unidad } });
    if (!carro) {
      sendApiError(res, 404, 'CHECKLIST_UNIDAD_NO_ENCONTRADA', 'Unidad no encontrada');
      return;
    }
    const totalItems = typeof body.totalItems === 'number' ? body.totalItems : null;
    const itemsOk = typeof body.itemsOk === 'number' ? body.itemsOk : null;
    const created = await prisma.checklistCarro.create({
      data: {
        carroId: carro.id,
        cuarteleroId: body.cuarteleroId,
        tipo: 'ERA',
        inspector: body.inspector ?? null,
        grupoGuardia: body.grupoGuardia ?? null,
        firmaOficial: body.firmaOficial ?? null,
        firmaInspector: body.firmaInspector ?? null,
        observaciones: body.observaciones ?? null,
        totalItems,
        itemsOk,
        ...(body.detalle !== undefined
          ? { detalle: body.detalle as Prisma.InputJsonValue }
          : {}),
      },
      include: includeChecklist,
    });
    res.status(201).json({
      ...created,
      vigente: true,
      obsoleto: false,
      estadoChecklist: estadoChecklistDesdeTotalesYObs(created.totalItems, created.itemsOk, created.observaciones),
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CHECKLIST_ERA_GUARDAR', 'Error al guardar checklist ERA');
  }
});
