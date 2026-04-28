import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type { Prisma } from '@prisma/client';
import { prisma } from './lib/prisma.js';
import { partesRouter } from './routes/partes.js';
import { checklistsRouter } from './routes/checklists.js';
import { bolsosTraumaRouter } from './routes/bolsos-trauma.js';
import { usuariosRouter } from './routes/usuarios.js';
import { configuracionesRouter } from './routes/configuraciones.js';
import { rolesRouter } from './routes/roles.js';
import { authRouter } from './routes/auth.js';
import { auditoriaRouter } from './routes/auditoria.js';
import { reportesRouter } from './routes/reportes.js';
import { dashboardRouter } from './routes/dashboard.js';
import { licenciasRouter } from './routes/licencias.js';
import { requireAuth } from './middleware/auth.js';
import { requireRoles } from './middleware/roles.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '12mb' }));

function buildCarroPatch(body: unknown): Prisma.CarroUpdateInput {
  if (!body || typeof body !== 'object') {
    return {};
  }
  const b = body as Record<string, unknown>;
  const data: Prisma.CarroUpdateInput = {};

  const setStr = (key: keyof Prisma.CarroUpdateInput) => {
    if (!(key in b)) {
      return;
    }
    const v = b[key as string];
    if (v === null || v === '') {
      (data as Record<string, unknown>)[key as string] = null;
    } else {
      (data as Record<string, unknown>)[key as string] = String(v);
    }
  };

  const setDate = (key: keyof Prisma.CarroUpdateInput) => {
    if (!(key in b)) {
      return;
    }
    const v = b[key as string];
    if (v === null || v === '') {
      (data as Record<string, unknown>)[key as string] = null;
    } else {
      const d = new Date(String(v));
      (data as Record<string, unknown>)[key as string] = Number.isNaN(d.getTime()) ? null : d;
    }
  };

  setStr('ultimoConductor');
  setStr('conductorAsignado');
  setStr('descripcionUltimoMantenimiento');
  setStr('ultimoInspector');
  setStr('firmaUltimoInspector');

  setDate('ultimoMantenimiento');
  setDate('proximoMantenimiento');
  setDate('proximaRevisionTecnica');
  setDate('ultimaRevisionBombaAgua');
  setDate('fechaUltimaInspeccion');

  return data;
}

async function resolverCarroId(param: string): Promise<number | null> {
  const idNum = Number(param);
  const isNumericId = !Number.isNaN(idNum) && Number.isFinite(idNum) && String(idNum) === param;
  if (isNumericId) {
    const c = await prisma.carro.findUnique({ where: { id: idNum }, select: { id: true } });
    return c?.id ?? null;
  }
  const c = await prisma.carro.findUnique({ where: { nomenclatura: param }, select: { id: true } });
  return c?.id ?? null;
}

app.use('/api/auth', authRouter);

app.get('/api/status', (req, res) => {
  res.json({ mensaje: 'Backend de SIDEP 100% operativo' });
});

app.use('/api/usuarios', requireAuth, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), usuariosRouter);
app.use('/api/roles', requireAuth, requireRoles('ADMIN'), rolesRouter);
app.use('/api/configuraciones', requireAuth, requireRoles('ADMIN'), configuracionesRouter);
app.use('/api/auditoria', requireAuth, requireRoles('ADMIN', 'CAPITAN'), auditoriaRouter);
app.use('/api/partes', requireAuth, partesRouter);
app.use('/api/checklists', requireAuth, checklistsRouter);
app.use('/api/bolsos-trauma', requireAuth, bolsosTraumaRouter);
app.use('/api/reportes', requireAuth, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), reportesRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/licencias', requireAuth, licenciasRouter);

app.get('/api/carros', requireAuth, async (_req, res) => {
  try {
    const carros = await prisma.carro.findMany({ orderBy: { nomenclatura: 'asc' } });
    res.json(carros);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar carros' });
  }
});

/** Historial de snapshots de mantención de todos los carros (filtros opcionales por query). */
app.get('/api/carros/historial-general', requireAuth, async (req, res) => {
  try {
    const carroIdRaw = req.query.carroId;
    const desdeRaw = req.query.desde;
    const hastaRaw = req.query.hasta;

    const where: Prisma.CarroRegistroHistorialWhereInput = {};

    if (carroIdRaw != null && String(carroIdRaw).trim() !== '') {
      const n = Number(carroIdRaw);
      if (!Number.isNaN(n)) {
        where.carroId = n;
      }
    }

    const creadoEn: { gte?: Date; lte?: Date } = {};
    if (desdeRaw != null && String(desdeRaw).trim() !== '') {
      const d = new Date(String(desdeRaw));
      if (!Number.isNaN(d.getTime())) {
        creadoEn.gte = d;
      }
    }
    if (hastaRaw != null && String(hastaRaw).trim() !== '') {
      const d = new Date(String(hastaRaw));
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        creadoEn.lte = d;
      }
    }
    if (creadoEn.gte != null || creadoEn.lte != null) {
      where.creadoEn = creadoEn;
    }

    const rows = await prisma.carroRegistroHistorial.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      take: 2000,
      include: { carro: { select: { id: true, nomenclatura: true, nombre: true, patente: true } } },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar historial general de carros' });
  }
});

app.get('/api/carros/:id', requireAuth, async (req, res) => {
  const rawParam = req.params.id;
  const param = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  if (!param) {
    res.status(400).json({ error: 'Parámetro requerido' });
    return;
  }
  try {
    const idNum = Number(param);
    const isNumericId = !Number.isNaN(idNum) && Number.isFinite(idNum) && String(idNum) === param;

    const carro = isNumericId
      ? await prisma.carro.findUnique({
          where: { id: idNum },
          include: { historialRegistros: { orderBy: { creadoEn: 'desc' }, take: 100 } },
        })
      : await prisma.carro.findUnique({
          where: { nomenclatura: param },
          include: { historialRegistros: { orderBy: { creadoEn: 'desc' }, take: 100 } },
        });

    if (!carro) {
      res.status(404).json({ error: 'Carro no encontrado' });
      return;
    }
    res.json(carro);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener carro' });
  }
});

app.patch('/api/carros/:id', requireAuth, async (req, res) => {
  const rawParam = req.params.id;
  const param = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  if (!param) {
    res.status(400).json({ error: 'Parámetro requerido' });
    return;
  }
  try {
    const carroId = await resolverCarroId(param);
    if (carroId == null) {
      res.status(404).json({ error: 'Carro no encontrado' });
      return;
    }

    const updateData = buildCarroPatch(req.body);
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'Sin campos para actualizar' });
      return;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const carro = await tx.carro.update({
        where: { id: carroId },
        data: updateData,
      });
      await tx.carroRegistroHistorial.create({
        data: {
          carroId: carro.id,
          ultimoMantenimiento: carro.ultimoMantenimiento,
          proximoMantenimiento: carro.proximoMantenimiento,
          proximaRevisionTecnica: carro.proximaRevisionTecnica,
          ultimaRevisionBombaAgua: carro.ultimaRevisionBombaAgua,
          descripcionUltimoMantenimiento: carro.descripcionUltimoMantenimiento,
          ultimoInspector: carro.ultimoInspector,
          firmaUltimoInspector: carro.firmaUltimoInspector,
          fechaUltimaInspeccion: carro.fechaUltimaInspeccion,
          ultimoConductor: carro.ultimoConductor,
        },
      });
      return tx.carro.findUnique({
        where: { id: carroId },
        include: { historialRegistros: { orderBy: { creadoEn: 'desc' }, take: 100 } },
      });
    });

    res.json(resultado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar carro' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
