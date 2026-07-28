import crypto from 'crypto';
import prisma from '../../../prisma';
import { mapUsuarioBasico } from '../utils/usuario-map.util';

const INCLUDE_ASISTENCIA = {
  usuario: { include: { rol: true, cargo: true } },
  registradoPor: { include: { rol: true, cargo: true } },
};

function mapAsistencia(a: any) {
  return {
    id: a.id,
    fecha: a.fecha.toISOString().slice(0, 10),
    usuarioRut: a.usuarioRut,
    grupoGuardia: a.grupoGuardia,
    presente: a.presente === 1,
    horaEntrada: a.horaEntrada,
    horaSalida: a.horaSalida,
    observaciones: a.observaciones,
    usuario: mapUsuarioBasico(a.usuario),
    registradoPor: mapUsuarioBasico(a.registradoPor),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function parseFechaLocal(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

export async function listarAsistencias(filtros: {
  fecha?: string;
  desde?: string;
  hasta?: string;
  grupo?: string;
  presente?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 50;
  const where: any = {};
  if (filtros.grupo) where.grupoGuardia = filtros.grupo;
  if (filtros.presente !== undefined) where.presente = filtros.presente ? 1 : 0;
  if (filtros.fecha) {
    where.fecha = parseFechaLocal(filtros.fecha);
  } else if (filtros.desde || filtros.hasta) {
    where.fecha = {};
    if (filtros.desde) where.fecha.gte = parseFechaLocal(filtros.desde);
    if (filtros.hasta) where.fecha.lte = parseFechaLocal(filtros.hasta);
  }

  const [total, rows] = await Promise.all([
    prisma.asistenciaCuartelero.count({ where }),
    prisma.asistenciaCuartelero.findMany({
      where,
      include: INCLUDE_ASISTENCIA,
      orderBy: [{ fecha: 'desc' }, { usuario: { apellidoPaterno: 'asc' } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapAsistencia),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function resumenAsistencia(fechaKey: string) {
  const fecha = parseFechaLocal(fechaKey);
  const rows = await prisma.asistenciaCuartelero.findMany({
    where: { fecha },
    include: INCLUDE_ASISTENCIA,
  });
  const presentes = rows.filter((r) => r.presente === 1).length;
  return {
    fecha: fechaKey,
    total: rows.length,
    presentes,
    ausentes: rows.length - presentes,
    items: rows.map(mapAsistencia),
  };
}

export async function registrarAsistencia(
  registradoPorRut: string,
  data: {
    fecha: string;
    usuarioRut: string;
    grupoGuardia?: string | null;
    presente?: boolean;
    horaEntrada?: string | null;
    horaSalida?: string | null;
    observaciones?: string | null;
  },
) {
  const row = await prisma.asistenciaCuartelero.upsert({
    where: {
      fecha_usuarioRut: {
        fecha: parseFechaLocal(data.fecha),
        usuarioRut: data.usuarioRut,
      },
    },
    create: {
      id: crypto.randomUUID(),
      fecha: parseFechaLocal(data.fecha),
      usuarioRut: data.usuarioRut,
      grupoGuardia: data.grupoGuardia || null,
      presente: data.presente === false ? 0 : 1,
      horaEntrada: data.horaEntrada || null,
      horaSalida: data.horaSalida || null,
      observaciones: data.observaciones?.trim() || null,
      registradoPorRut,
    },
    update: {
      grupoGuardia: data.grupoGuardia || null,
      presente: data.presente === false ? 0 : 1,
      horaEntrada: data.horaEntrada || null,
      horaSalida: data.horaSalida || null,
      observaciones: data.observaciones?.trim() || null,
      registradoPorRut,
    },
    include: INCLUDE_ASISTENCIA,
  });
  return mapAsistencia(row);
}

export async function actualizarAsistencia(
  id: string,
  registradoPorRut: string,
  data: Partial<{
    grupoGuardia: string | null;
    presente: boolean;
    horaEntrada: string | null;
    horaSalida: string | null;
    observaciones: string | null;
  }>,
) {
  const existente = await prisma.asistenciaCuartelero.findUnique({ where: { id } });
  if (!existente) throw new Error('Registro de asistencia no encontrado');
  const row = await prisma.asistenciaCuartelero.update({
    where: { id },
    data: {
      ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
      ...(data.presente !== undefined ? { presente: data.presente ? 1 : 0 } : {}),
      ...(data.horaEntrada !== undefined ? { horaEntrada: data.horaEntrada || null } : {}),
      ...(data.horaSalida !== undefined ? { horaSalida: data.horaSalida || null } : {}),
      ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
      registradoPorRut,
    },
    include: INCLUDE_ASISTENCIA,
  });
  return mapAsistencia(row);
}

export async function eliminarAsistencia(id: string) {
  await prisma.asistenciaCuartelero.delete({ where: { id } });
  return true;
}
