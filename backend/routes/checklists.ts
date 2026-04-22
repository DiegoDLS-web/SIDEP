import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const checklistsRouter = Router();

const includeChecklist = {
  carro: { select: { id: true, nomenclatura: true, nombre: true } },
  cuartelero: { select: { id: true, nombre: true, rol: true, firmaImagen: true } },
} as const;

checklistsRouter.get('/unidad/:unidad/historial', async (req, res) => {
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
    const items = await prisma.checklistCarro.findMany({
      where: { carroId: carro.id, tipo: 'UNIDAD' },
      orderBy: { fecha: 'desc' },
      take: 100,
      include: includeChecklist,
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar historial de checklist' });
  }
});

checklistsRouter.get('/unidad/:unidad/historial-era', async (req, res) => {
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
    const items = await prisma.checklistCarro.findMany({
      where: { carroId: carro.id, tipo: 'ERA' },
      orderBy: { fecha: 'desc' },
      take: 100,
      include: includeChecklist,
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cargar historial ERA' });
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
    res.status(500).json({ error: 'Error al cargar resumen checklist' });
  }
});

checklistsRouter.get('/unidad/:unidad', async (req, res) => {
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
      where: { carroId: carro.id, tipo: 'UNIDAD' },
      orderBy: { fecha: 'desc' },
      include: includeChecklist,
    });
    res.json({ unidad: carro.nomenclatura, carro, checklist });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener checklist de unidad' });
  }
});

checklistsRouter.post('/unidad/:unidad', async (req, res) => {
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
        tipo: 'UNIDAD',
        inspector: body.inspector ?? null,
        grupoGuardia: body.grupoGuardia ?? null,
        firmaOficial: body.firmaOficial ?? null,
        observaciones: body.observaciones ?? null,
        totalItems: typeof body.totalItems === 'number' ? body.totalItems : null,
        itemsOk: typeof body.itemsOk === 'number' ? body.itemsOk : null,
        ...(body.detalle !== undefined
          ? { detalle: body.detalle as Prisma.InputJsonValue }
          : {}),
      },
      include: includeChecklist,
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar checklist de unidad' });
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
    res.json(checks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar checklist ERA' });
  }
});

checklistsRouter.post('/era', async (req, res) => {
  const body = req.body as {
    unidad?: string;
    cuarteleroId?: number;
    inspector?: string;
    grupoGuardia?: string;
    firmaOficial?: string;
    observaciones?: string;
    totalItems?: number;
    itemsOk?: number;
    detalle?: unknown;
  };
  if (!body.unidad || typeof body.cuarteleroId !== 'number') {
    res.status(400).json({ error: 'unidad y cuarteleroId son requeridos' });
    return;
  }
  try {
    const carro = await prisma.carro.findUnique({ where: { nomenclatura: body.unidad } });
    if (!carro) {
      res.status(404).json({ error: 'Unidad no encontrada' });
      return;
    }
    const created = await prisma.checklistCarro.create({
      data: {
        carroId: carro.id,
        cuarteleroId: body.cuarteleroId,
        tipo: 'ERA',
        inspector: body.inspector ?? null,
        grupoGuardia: body.grupoGuardia ?? null,
        firmaOficial: body.firmaOficial ?? null,
        observaciones: body.observaciones ?? null,
        totalItems: typeof body.totalItems === 'number' ? body.totalItems : null,
        itemsOk: typeof body.itemsOk === 'number' ? body.itemsOk : null,
        ...(body.detalle !== undefined
          ? { detalle: body.detalle as Prisma.InputJsonValue }
          : {}),
      },
      include: includeChecklist,
    });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar checklist ERA' });
  }
});
