import crypto from 'crypto';
import prisma from '../../../prisma';
import { mapUsuarioBasico } from '../utils/usuario-map.util';

const INCLUDE_GUARDIA = {
  cuartelero: { include: { rol: true, cargo: true } },
  obac: { include: { rol: true, cargo: true } },
  registradoPor: { include: { rol: true, cargo: true } },
  miembros: { include: { usuario: { include: { rol: true, cargo: true } } } },
};

function mapGuardia(g: any) {
  return {
    id: g.id,
    fecha: g.fecha.toISOString().slice(0, 10),
    grupo: g.grupo,
    tipoTurno: g.tipoTurno,
    cuarteleroRut: g.cuarteleroRut,
    obacRut: g.obacRut,
    observaciones: g.observaciones,
    cuartelero: mapUsuarioBasico(g.cuartelero),
    obac: mapUsuarioBasico(g.obac),
    registradoPor: mapUsuarioBasico(g.registradoPor),
    miembros: (g.miembros ?? []).map((m: any) => ({
      id: m.id,
      usuarioRut: m.usuarioRut,
      rolEnGuardia: m.rolEnGuardia,
      usuario: mapUsuarioBasico(m.usuario),
    })),
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

function parseFechaLocal(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

export async function listarGuardias(filtros: { desde?: string; hasta?: string; grupo?: string }) {
  const where: any = {};
  if (filtros.grupo) where.grupo = filtros.grupo;
  if (filtros.desde || filtros.hasta) {
    where.fecha = {};
    if (filtros.desde) where.fecha.gte = parseFechaLocal(filtros.desde);
    if (filtros.hasta) where.fecha.lte = parseFechaLocal(filtros.hasta);
  }
  const rows = await prisma.guardiaTurno.findMany({
    where,
    include: INCLUDE_GUARDIA,
    orderBy: [{ fecha: 'desc' }, { grupo: 'asc' }],
  });
  return rows.map(mapGuardia);
}

export async function resumenGuardias(fechaKey: string) {
  const fecha = parseFechaLocal(fechaKey);
  const turnos = await prisma.guardiaTurno.findMany({
    where: { fecha },
    include: INCLUDE_GUARDIA,
    orderBy: { grupo: 'asc' },
  });
  return {
    fecha: fechaKey,
    turnos: turnos.map(mapGuardia),
    gruposCubiertos: turnos.length,
    totalMiembros: turnos.reduce((acc, t) => acc + t.miembros.length, 0),
  };
}

export async function obtenerGuardia(id: string) {
  const row = await prisma.guardiaTurno.findUnique({ where: { id }, include: INCLUDE_GUARDIA });
  if (!row) throw new Error('Turno de guardia no encontrado');
  return mapGuardia(row);
}

export async function crearGuardia(
  registradoPorRut: string,
  data: {
    fecha: string;
    grupo: string;
    tipoTurno?: string;
    cuarteleroRut?: string | null;
    obacRut?: string | null;
    observaciones?: string | null;
    miembrosRut?: string[];
  },
) {
  const id = crypto.randomUUID();
  const miembros = [...new Set((data.miembrosRut ?? []).filter(Boolean))];
  const created = await prisma.$transaction(async (tx) => {
    const turno = await tx.guardiaTurno.create({
      data: {
        id,
        fecha: parseFechaLocal(data.fecha),
        grupo: data.grupo,
        tipoTurno: data.tipoTurno ?? '24H',
        cuarteleroRut: data.cuarteleroRut || null,
        obacRut: data.obacRut || null,
        observaciones: data.observaciones?.trim() || null,
        registradoPorRut,
      },
    });
    if (miembros.length) {
      await tx.guardiaMiembro.createMany({
        data: miembros.map((rut) => ({
          id: crypto.randomUUID(),
          guardiaId: turno.id,
          usuarioRut: rut,
        })),
      });
    }
    return tx.guardiaTurno.findUnique({ where: { id: turno.id }, include: INCLUDE_GUARDIA });
  });
  return mapGuardia(created);
}

export async function actualizarGuardia(
  id: string,
  data: Partial<{
    fecha: string;
    grupo: string;
    tipoTurno: string;
    cuarteleroRut: string | null;
    obacRut: string | null;
    observaciones: string | null;
    miembrosRut: string[];
  }>,
) {
  const existente = await prisma.guardiaTurno.findUnique({ where: { id } });
  if (!existente) throw new Error('Turno de guardia no encontrado');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.guardiaTurno.update({
      where: { id },
      data: {
        ...(data.fecha ? { fecha: parseFechaLocal(data.fecha) } : {}),
        ...(data.grupo ? { grupo: data.grupo } : {}),
        ...(data.tipoTurno ? { tipoTurno: data.tipoTurno } : {}),
        ...(data.cuarteleroRut !== undefined ? { cuarteleroRut: data.cuarteleroRut || null } : {}),
        ...(data.obacRut !== undefined ? { obacRut: data.obacRut || null } : {}),
        ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
      },
    });
    if (data.miembrosRut) {
      const miembros = [...new Set(data.miembrosRut.filter(Boolean))];
      await tx.guardiaMiembro.deleteMany({ where: { guardiaId: id } });
      if (miembros.length) {
        await tx.guardiaMiembro.createMany({
          data: miembros.map((rut) => ({
            id: crypto.randomUUID(),
            guardiaId: id,
            usuarioRut: rut,
          })),
        });
      }
    }
    return tx.guardiaTurno.findUnique({ where: { id }, include: INCLUDE_GUARDIA });
  });
  return mapGuardia(updated);
}

export async function eliminarGuardia(id: string) {
  await prisma.guardiaTurno.delete({ where: { id } });
  return true;
}
