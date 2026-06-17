import prisma from '../../../prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../../utils/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

export const getAsistenciasVoluntario = async (rut: string, anio?: number, mes?: number) => {
  if (!rut) {
    throw new ValidationError(['RUT del voluntario es requerido']);
  }

  const whereClause: any = {
    usuarioRut: rut,
    parte: {
      estadoId: { not: 3 }, // Not canceled
    },
  };

  if (anio) {
    const inicio = new Date(Date.UTC(anio, mes ? mes - 1 : 0, 1, 0, 0, 0));
    const fin = new Date(Date.UTC(anio, mes ? mes : 12, 0, 23, 59, 59, 999));
    whereClause.parte.fechaEmergencia = { gte: inicio, lte: fin };
  }

  return await prisma.asistenciaPersonal.findMany({
    where: whereClause,
    include: {
      parte: {
        select: {
          id: true,
          correlativo: true,
          fechaEmergencia: true,
          direccion: true,
          clave: {
            select: {
              codigo: true,
              nombre: true,
            },
          },
        },
      },
    },
    orderBy: {
      parte: {
        fechaEmergencia: 'desc',
      },
    },
  });
};

export const agregarAsistencia = async (parteId: string, usuarioRut: string) => {
  if (!parteId || !usuarioRut) {
    throw new ValidationError(['parteId y usuarioRut son requeridos']);
  }

  // 1. Verify parte exists and is not canceled
  const parte = await prisma.parteEmergencia.findUnique({
    where: { id: parteId },
  });

  if (!parte) {
    throw new NotFoundError('Parte de emergencia', parteId);
  }

  if (parte.estadoId === 3) {
    throw new ValidationError(['No se puede agregar asistencia a un parte anulado']);
  }

  // 2. Verify usuario exists and is active
  const usuario = await prisma.usuario.findUnique({
    where: { rut: usuarioRut },
  });

  if (!usuario) {
    throw new NotFoundError('Usuario', usuarioRut);
  }

  if (usuario.activo !== 1) {
    throw new ValidationError(['No se puede agregar asistencia a un voluntario inactivo']);
  }

  // 3. Verify unique constraint
  const existente = await prisma.asistenciaPersonal.findUnique({
    where: {
      parteId_usuarioRut: {
        parteId,
        usuarioRut,
      },
    },
  });

  if (existente) {
    throw new ConflictError('El voluntario ya está registrado en este parte');
  }

  // 4. Create assistance
  return await prisma.asistenciaPersonal.create({
    data: {
      id: uuidv4(),
      parteId,
      usuarioRut,
    },
    include: {
      usuario: {
        select: {
          nombres: true,
          apellidoPaterno: true,
          rol: true,
        },
      },
    },
  });
};

export const eliminarAsistencia = async (parteId: string, asistenciaId: string) => {
  if (!parteId || !asistenciaId) {
    throw new ValidationError(['parteId y asistenciaId son requeridos']);
  }

  // 1. Verify parte
  const parte = await prisma.parteEmergencia.findUnique({
    where: { id: parteId },
  });

  if (!parte) {
    throw new NotFoundError('Parte de emergencia', parteId);
  }

  if (parte.estadoId === 3) {
    throw new ValidationError(['No se puede modificar un parte anulado']);
  }

  // 2. Verify assistance exists and belongs to this parte
  const asistencia = await prisma.asistenciaPersonal.findUnique({
    where: { id: asistenciaId },
  });

  if (!asistencia) {
    throw new NotFoundError('Asistencia', asistenciaId);
  }

  if (asistencia.parteId !== parteId) {
    throw new ValidationError(['La asistencia no pertenece al parte especificado']);
  }

  // 3. Delete
  return await prisma.asistenciaPersonal.delete({
    where: { id: asistenciaId },
  });
};
