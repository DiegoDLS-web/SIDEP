import crypto from 'crypto';
import prisma from '../../../prisma';
import { mapUsuarioBasico } from '../utils/usuario-map.util';

const INCLUDE_NOVEDAD = {
  autor: { include: { rol: true, cargo: true } },
};

function mapNovedad(n: any) {
  return {
    id: n.id,
    fechaHora: n.fechaHora.toISOString(),
    categoria: n.categoria,
    titulo: n.titulo,
    descripcion: n.descripcion,
    grupoGuardia: n.grupoGuardia,
    importante: n.importante === 1,
    autorRut: n.autorRut,
    autor: mapUsuarioBasico(n.autor),
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

function parseFechaInicio(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function parseFechaFin(key: string): Date {
  return new Date(`${key}T23:59:59.999Z`);
}

export async function listarNovedades(filtros: {
  desde?: string;
  hasta?: string;
  categoria?: string;
  importante?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 20;
  const where: any = {};
  if (filtros.categoria) where.categoria = filtros.categoria;
  if (filtros.importante !== undefined) where.importante = filtros.importante ? 1 : 0;
  if (filtros.desde || filtros.hasta) {
    where.fechaHora = {};
    if (filtros.desde) where.fechaHora.gte = parseFechaInicio(filtros.desde);
    if (filtros.hasta) where.fechaHora.lte = parseFechaFin(filtros.hasta);
  }
  if (filtros.q?.trim()) {
    const q = filtros.q.trim();
    where.OR = [
      { titulo: { contains: q, mode: 'insensitive' } },
      { descripcion: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.libroNovedad.count({ where }),
    prisma.libroNovedad.findMany({
      where,
      include: INCLUDE_NOVEDAD,
      orderBy: { fechaHora: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapNovedad),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function crearNovedad(
  autorRut: string,
  data: {
    fechaHora: string | Date;
    categoria: string;
    titulo: string;
    descripcion: string;
    grupoGuardia?: string | null;
    importante?: boolean;
  },
) {
  const row = await prisma.libroNovedad.create({
    data: {
      id: crypto.randomUUID(),
      fechaHora: new Date(data.fechaHora),
      categoria: data.categoria,
      titulo: data.titulo.trim(),
      descripcion: data.descripcion.trim(),
      grupoGuardia: data.grupoGuardia || null,
      importante: data.importante ? 1 : 0,
      autorRut,
    },
    include: INCLUDE_NOVEDAD,
  });
  return mapNovedad(row);
}

export async function actualizarNovedad(
  id: string,
  autorRut: string,
  esOficialidad: boolean,
  data: Partial<{
    fechaHora: string | Date;
    categoria: string;
    titulo: string;
    descripcion: string;
    grupoGuardia: string | null;
    importante: boolean;
  }>,
) {
  const existente = await prisma.libroNovedad.findUnique({ where: { id } });
  if (!existente) throw new Error('Novedad no encontrada');
  if (!esOficialidad && existente.autorRut !== autorRut) {
    throw new Error('Solo el autor u oficialidad pueden editar esta novedad');
  }
  const row = await prisma.libroNovedad.update({
    where: { id },
    data: {
      ...(data.fechaHora !== undefined ? { fechaHora: new Date(data.fechaHora) } : {}),
      ...(data.categoria ? { categoria: data.categoria } : {}),
      ...(data.titulo ? { titulo: data.titulo.trim() } : {}),
      ...(data.descripcion ? { descripcion: data.descripcion.trim() } : {}),
      ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
      ...(data.importante !== undefined ? { importante: data.importante ? 1 : 0 } : {}),
    },
    include: INCLUDE_NOVEDAD,
  });
  return mapNovedad(row);
}

export async function eliminarNovedad(id: string, autorRut: string, esOficialidad: boolean) {
  const existente = await prisma.libroNovedad.findUnique({ where: { id } });
  if (!existente) throw new Error('Novedad no encontrada');
  if (!esOficialidad && existente.autorRut !== autorRut) {
    throw new Error('Solo el autor u oficialidad pueden eliminar esta novedad');
  }
  await prisma.libroNovedad.delete({ where: { id } });
  return true;
}
