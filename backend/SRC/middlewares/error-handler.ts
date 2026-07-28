import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { resolverErrorHttp } from '../utils/prisma-error.util';
import { logError } from '../utils/logger/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const resuelto = resolverErrorHttp(err);
  if (resuelto) {
    return res.status(resuelto.statusCode).json({
      success: false,
      message: resuelto.message,
      errors: resuelto.errors ?? undefined,
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos enviados a la base de datos.',
    });
  }

  // Error genérico — no exponer detalles internos
  logError(err, {
    context: 'errorHandler',
    path: req.originalUrl,
    method: req.method,
  });
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
};
