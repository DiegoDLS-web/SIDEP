import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewares/async-handler';
import * as asistenciasService from '../services/asistencias.service';
import { ValidationError } from '../../../utils/errors/AppError';

export const getAsistenciasVoluntario = asyncHandler(async (req: Request, res: Response) => {
  const rut = req.query.rut as string;
  const anio = req.query.anio ? parseInt(req.query.anio as string, 10) : undefined;
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : undefined;

  if (!rut) {
    throw new ValidationError(['RUT es requerido']);
  }

  const data = await asistenciasService.getAsistenciasVoluntario(rut, anio, mes);
  res.status(200).json(data);
});

export const postAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const { parteId } = req.params as { parteId: string };
  const { usuarioRut } = req.body;

  if (!parteId) {
    throw new ValidationError(['parteId es requerido en la ruta']);
  }
  if (!usuarioRut) {
    throw new ValidationError(['usuarioRut es requerido en el cuerpo']);
  }

  const data = await asistenciasService.agregarAsistencia(parteId, usuarioRut);
  res.status(201).json(data);
});

export const deleteAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const { parteId, asistenciaId } = req.params as { parteId: string; asistenciaId: string };

  if (!parteId || !asistenciaId) {
    throw new ValidationError(['parteId y/o asistenciaId son requeridos']);
  }

  const data = await asistenciasService.eliminarAsistencia(parteId, asistenciaId);
  res.status(200).json({
    success: true,
    message: 'Asistencia eliminada correctamente',
    data,
  });
});
