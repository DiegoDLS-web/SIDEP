import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación.',
          errors: err.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      next(err);
    }
  };

export const validateQuery = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Express 5 expone req.query como getter de solo lectura; validar sin reasignar.
      schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación en parámetros.',
          errors: err.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      next(err);
    }
  };
