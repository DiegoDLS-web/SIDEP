import prisma from '../../../prisma';
import crypto from 'crypto';

/**
 * Registra una acción en la tabla de auditoría.
 */
export const registrarAccion = async (params: {
  usuarioRut?: string | null;
  accion: string;
  entidad?: string | null;
  entidadId?: string | null;
  metodoHttp?: string | null;
  ruta?: string | null;
  ipOrigen?: string | null;
  userAgent?: string | null;
  detalle?: string | null;
  resultado?: string;
}) => {
  try {
    await prisma.auditoriaUsuario.create({
      data: {
        id: crypto.randomUUID(),
        usuarioRut: params.usuarioRut || null,
        accion: params.accion,
        entidad: params.entidad || null,
        entidadId: params.entidadId || null,
        metodoHttp: params.metodoHttp || null,
        ruta: params.ruta || null,
        ipOrigen: params.ipOrigen || null,
        userAgent: params.userAgent?.substring(0, 500) || null,
        detalle: params.detalle || null,
        resultado: params.resultado || 'OK',
      },
    });
  } catch (error) {
    // No lanzar error — la auditoría no debe bloquear la operación principal
    console.error('⚠️ Error al registrar auditoría:', error);
  }
};

/**
 * Listar registros de auditoría paginados con filtros opcionales.
 */
export const listarAuditoria = async (params: {
  page?: number | undefined;
  pageSize?: number | undefined;
  rut?: string | undefined;
  accion?: string | undefined;
  entidad?: string | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
}) => {
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);

  const where: any = {};
  if (params.rut) {
    where.usuarioRut = { contains: params.rut, mode: 'insensitive' };
  }
  if (params.accion) {
    where.accion = { contains: params.accion, mode: 'insensitive' };
  }
  if (params.entidad) {
    where.entidad = { contains: params.entidad, mode: 'insensitive' };
  }
  if (params.desde || params.hasta) {
    where.createdAt = {};
    if (params.desde) where.createdAt.gte = new Date(params.desde);
    if (params.hasta) where.createdAt.lte = new Date(params.hasta + 'T23:59:59.999Z');
  }

  const total = await prisma.auditoriaUsuario.count({ where });
  const skip = (page - 1) * pageSize;

  const items = await prisma.auditoriaUsuario.findMany({
    where,
    include: {
      usuario: {
        select: {
          rut: true,
          nombres: true,
          apellidoPaterno: true,
          apellidoMaterno: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize,
  });

  return {
    items: items.map((i: any) => ({
      id: i.id,
      usuarioRut: i.usuarioRut,
      usuarioNombre: i.usuario
        ? `${i.usuario.nombres} ${i.usuario.apellidoPaterno} ${i.usuario.apellidoMaterno}`.trim()
        : null,
      accion: i.accion,
      entidad: i.entidad,
      entidadId: i.entidadId,
      metodoHttp: i.metodoHttp,
      ruta: i.ruta,
      ipOrigen: i.ipOrigen,
      detalle: i.detalle,
      resultado: i.resultado,
      createdAt: i.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};
