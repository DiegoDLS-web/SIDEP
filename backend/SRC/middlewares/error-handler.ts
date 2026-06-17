import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors/AppError';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // 1. Errores controlados de la aplicación
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors ?? undefined,
    });
  }

  // 2. Errores de Prisma conocidos
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const campo = (err.meta?.target as string[])?.join(', ') || 'campo';
      return res.status(409).json({
        success: false,
        message: `Ya existe un registro con ese/a ${campo}.`,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado.',
      });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos enviados a la base de datos.',
    });
  }

  // 3. Error genérico — no exponer detalles internos
  console.error('[ERROR NO CONTROLADO]', err);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
};
