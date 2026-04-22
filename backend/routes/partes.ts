import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { siguienteCorrelativo } from '../lib/correlativo.js';
import { requireRoles } from '../middleware/roles.js';
import { registrarActividad } from '../lib/auditoria.js';

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

partesRouter.get('/', async (_req, res) => {
  try {
    const partes = await prisma.parteEmergencia.findMany({
      orderBy: { fecha: 'desc' },
      include: includeParte,
    });
    res.json(partes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al listar partes' });
  }
});

partesRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || !Number.isFinite(id)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  try {
    const parte = await prisma.parteEmergencia.findUnique({
      where: { id },
      include: includeParte,
    });
    if (!parte) {
      res.status(404).json({ error: 'Parte no encontrado' });
      return;
    }
    res.json(parte);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener parte' });
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

/** Parsea unidades; en modo borrador omite filas sin carro válido. */
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
    res.status(400).json({ error: 'obacId es requerido' });
    return;
  }

  const unidadesParsed = parseUnidades(body.unidades, esBorrador);
  if (unidadesParsed === null) {
    res.status(400).json({ error: 'Datos de unidad inválidos' });
    return;
  }
  if (!esBorrador && unidadesParsed.length === 0) {
    res.status(400).json({ error: 'Debe incluir al menos una unidad' });
    return;
  }

  let claveEmergencia = typeof body.claveEmergencia === 'string' ? body.claveEmergencia.trim() : '';
  let direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';

  if (!esBorrador) {
    if (!claveEmergencia) {
      res.status(400).json({ error: 'claveEmergencia es requerida' });
      return;
    }
    if (!direccion) {
      res.status(400).json({ error: 'direccion es requerida' });
      return;
    }
  } else {
    if (!claveEmergencia) claveEmergencia = '10-9';
    if (!direccion) direccion = '��� Borrador (sin dirección)';
  }

  const pacientes = Array.isArray(body.pacientes) ? body.pacientes : [];
  for (const p of pacientes) {
    if (typeof p.nombre !== 'string' || typeof p.triage !== 'string') {
      res.status(400).json({ error: 'Datos de paciente inválidos' });
      return;
    }
  }

  const fecha = body.fecha ? new Date(body.fecha) : new Date();
  if (Number.isNaN(fecha.getTime())) {
    res.status(400).json({ error: 'fecha inválida' });
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
    res.status(500).json({ error: 'Error al crear parte' });
  }
});

partesRouter.patch('/:id', requireRoles('TENIENTE', 'CAPITAN', 'ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id) || !Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }
  const body = req.body as {
    claveEmergencia?: string;
    direccion?: string;
    fecha?: string;
    estado?: string;
  };
  const data: {
    claveEmergencia?: string;
    direccion?: string;
    fecha?: Date;
    estado?: string;
  } = {};
  if (body.claveEmergencia !== undefined) {
    if (typeof body.claveEmergencia !== 'string' || !body.claveEmergencia.trim()) {
      res.status(400).json({ error: 'claveEmergencia inválida' });
      return;
    }
    data.claveEmergencia = body.claveEmergencia.trim();
  }
  if (body.direccion !== undefined) {
    if (typeof body.direccion !== 'string' || !body.direccion.trim()) {
      res.status(400).json({ error: 'direccion inválida' });
      return;
    }
    data.direccion = body.direccion.trim();
  }
  if (body.estado !== undefined) {
    if (typeof body.estado !== 'string' || !body.estado.trim()) {
      res.status(400).json({ error: 'estado inválido' });
      return;
    }
    data.estado = body.estado.trim().toUpperCase();
  }
  if (body.fecha !== undefined) {
    const fecha = new Date(body.fecha);
    if (Number.isNaN(fecha.getTime())) {
      res.status(400).json({ error: 'fecha inválida' });
      return;
    }
    data.fecha = fecha;
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No se enviaron cambios' });
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
      detalle: data,
    });
    res.json(parte);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar parte' });
  }
});
