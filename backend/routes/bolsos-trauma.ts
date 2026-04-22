import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const bolsosTraumaRouter = Router();

const includeChecklist = {
  carro: { select: { id: true, nomenclatura: true, nombre: true } },
  cuartelero: { select: { id: true, nombre: true, rol: true, firmaImagen: true } },
} as const;

type BolsoResumen = {
  numero: number;
  completitud: number;
  itemsFaltantes: number;
  status: 'complete' | 'incomplete';
};

function materialesDeBolso(b: {
  materiales?: Array<{ cantidadMinima?: number; cantidadActual?: number }>;
  ubicaciones?: Array<{ materiales?: Array<{ cantidadMinima?: number; cantidadActual?: number }> }>;
}): Array<{ cantidadMinima?: number; cantidadActual?: number }> {
  const direct = b.materiales ?? [];
  if (direct.length > 0) return direct;
  return (b.ubicaciones ?? []).flatMap((u) => u.materiales ?? []);
}

function bolsosDesdeDetalle(detalle: unknown): BolsoResumen[] {
  const d = detalle as {
    bolsos?: Array<{
      numero?: number;
      materiales?: Array<{ cantidadMinima?: number; cantidadActual?: number }>;
      ubicaciones?: Array<{ materiales?: Array<{ cantidadMinima?: number; cantidadActual?: number }> }>;
    }>;
  } | null;
  const bolsos = d?.bolsos ?? [];
  return bolsos.map((b, idx) => {
    const mats = materialesDeBolso(b);
    const total = mats.length;
    const ok = mats.filter((m) => (m.cantidadActual ?? 0) >= (m.cantidadMinima ?? 0)).length;
    const completitud = total > 0 ? Math.round((ok / total) * 100) : 100;
    const itemsFaltantes = Math.max(total - ok, 0);
    return {
      numero: b.numero ?? idx + 1,
      completitud,
      itemsFaltantes,
      status: itemsFaltantes > 0 ? 'incomplete' : 'complete',
    };
  });
}

/** Si aún no hay checklist TRAUMA, igual mostramos bolsos clicables (misma lógica que el registro). */
function cantidadBolsosPredeterminada(nomenclatura: string): number {
  if (nomenclatura === 'R-1') return 3;
  if (nomenclatura === 'BX-1') return 2;
  return 1;
}

function bolsosParaSelector(nomenclatura: string, detalle: unknown): BolsoResumen[] {
  const parsed = bolsosDesdeDetalle(detalle);
  if (parsed.length > 0) return parsed;
  const n = cantidadBolsosPredeterminada(nomenclatura);
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    completitud: 0,
    itemsFaltantes: 0,
    status: 'incomplete' as const,
  }));
}

bolsosTraumaRouter.get('/historial', async (req, res) => {
  const unidad = typeof req.query.unidad === 'string' ? req.query.unidad.trim() : '';
  const desdeRaw = typeof req.query.desde === 'string' ? req.query.desde.trim() : '';
  const hastaRaw = typeof req.query.hasta === 'string' ? req.query.hasta.trim() : '';

  const fechaFilter: { gte?: Date; lte?: Date } = {};
  if (desdeRaw) {
    const d = new Date(desdeRaw);
    if (Number.isNaN(d.getTime())) {
      res.status(400).json({ error: 'Fecha "desde" inválida' });
      return;
    }
    fechaFilter.gte = d;
  }
  if (hastaRaw) {
    const h = new Date(hastaRaw);
    if (Number.isNaN(h.getTime())) {
      res.status(400).json({ error: 'Fecha "hasta" inválida' });
      return;
    }
    h.setHours(23, 59, 59, 999);
    fechaFilter.lte = h;
  }

  try {
    const where = {
      tipo: 'TRAUMA',
      ...(unidad ? { carro: { nomenclatura: unidad } } : {}),
      ...(fechaFilter.gte || fechaFilter.lte ? { fecha: fechaFilter } : {}),
    } as const;

    const rows = await prisma.checklistCarro.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: includeChecklist,
      take: 2000,
    });

    const out = rows.map((r) => {
      const det = r.detalle as {
        bolsoNumero?: number;
        borrador?: boolean;
      } | null;
      return {
        id: r.id,
        fecha: r.fecha,
        unidad: r.carro.nomenclatura,
        carroNombre: r.carro.nombre,
        inspector: r.inspector,
        responsable: r.cuartelero.nombre,
        grupoGuardia: r.grupoGuardia,
        totalItems: r.totalItems,
        itemsOk: r.itemsOk,
        porcentaje:
          (r.totalItems ?? 0) > 0 ? Math.round(((r.itemsOk ?? 0) / (r.totalItems ?? 1)) * 100) : null,
        observaciones: r.observaciones,
        bolsoNumero: typeof det?.bolsoNumero === 'number' ? det.bolsoNumero : null,
        borrador: det?.borrador === true,
      };
    });

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar historial de bolsos de trauma' });
  }
});

bolsosTraumaRouter.get('/historial/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'Id inválido' });
    return;
  }
  try {
    const row = await prisma.checklistCarro.findFirst({
      where: { id, tipo: 'TRAUMA' },
      include: includeChecklist,
    });
    if (!row) {
      res.status(404).json({ error: 'Registro no encontrado' });
      return;
    }
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar registro de bolso trauma' });
  }
});

bolsosTraumaRouter.get('/selector', async (_req, res) => {
  try {
    const carros = await prisma.carro.findMany({
      orderBy: { nomenclatura: 'asc' },
      include: {
        checklists: {
          where: { tipo: 'TRAUMA' },
          orderBy: { fecha: 'desc' },
          take: 1,
          include: { cuartelero: { select: { nombre: true } } },
        },
      },
    });

    const out = carros.map((c) => {
      const ultimo = c.checklists[0] ?? null;
      const bolsos = bolsosParaSelector(c.nomenclatura, ultimo?.detalle);
      return {
        id: c.id,
        unidad: c.nomenclatura,
        nombre: c.nombre ?? `Unidad ${c.nomenclatura}`,
        cantidadBolsos: bolsos.length,
        ultimaRevision: ultimo
          ? {
              fecha: ultimo.fecha,
              responsable: ultimo.inspector ?? ultimo.cuartelero.nombre,
              completado: (ultimo.itemsOk ?? 0) >= (ultimo.totalItems ?? 0),
            }
          : null,
        bolsos,
      };
    });

    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar resumen de bolsos de trauma' });
  }
});

bolsosTraumaRouter.get('/:unidad', async (req, res) => {
  const unidad = req.params.unidad;
  if (!unidad) {
    res.status(400).json({ error: 'Unidad requerida' });
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad } });
    if (!carro) {
      res.status(404).json({ error: 'Unidad no encontrada' });
      return;
    }
    const checklist = await prisma.checklistCarro.findFirst({
      where: { carroId: carro.id, tipo: 'TRAUMA' },
      orderBy: { fecha: 'desc' },
      include: includeChecklist,
    });
    res.json({ unidad: carro.nomenclatura, carro, checklist });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener registro bolso trauma' });
  }
});

bolsosTraumaRouter.post('/:unidad', async (req, res) => {
  const unidad = req.params.unidad;
  const body = req.body as {
    cuarteleroId?: number;
    inspector?: string;
    grupoGuardia?: string;
    firmaOficial?: string;
    observaciones?: string;
    totalItems?: number;
    itemsOk?: number;
    detalle?: unknown;
  };
  if (!unidad || typeof body.cuarteleroId !== 'number') {
    res.status(400).json({ error: 'Unidad y cuarteleroId son requeridos' });
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: unidad } });
    if (!carro) {
      res.status(404).json({ error: 'Unidad no encontrada' });
      return;
    }
    const created = await prisma.checklistCarro.create({
      data: {
        carroId: carro.id,
        cuarteleroId: body.cuarteleroId,
        tipo: 'TRAUMA',
        inspector: body.inspector ?? null,
        grupoGuardia: body.grupoGuardia ?? null,
        firmaOficial: body.firmaOficial ?? null,
        observaciones: body.observaciones ?? null,
        totalItems: typeof body.totalItems === 'number' ? body.totalItems : null,
        itemsOk: typeof body.itemsOk === 'number' ? body.itemsOk : null,
        ...(body.detalle !== undefined ? { detalle: body.detalle as Prisma.InputJsonValue } : {}),
      },
      include: includeChecklist,
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar bolso trauma' });
  }
});
