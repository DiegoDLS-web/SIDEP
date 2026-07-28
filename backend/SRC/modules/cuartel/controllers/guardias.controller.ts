import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewares/async-handler';
import * as guardiasService from '../services/guardias.service';

function rutUsuario(req: Request): string {
  const rut = (req as any).user?.rut;
  if (!rut) throw new Error('No autorizado');
  return rut;
}

export const getCalendarioGuardias = asyncHandler(async (req: Request, res: Response) => {
  const anio = Number(req.query.anio);
  const mes = Number(req.query.mes);
  const data = await guardiasService.calendarioMensualGuardias(anio, mes);
  res.json(data);
});

export const getGuardias = asyncHandler(async (req: Request, res: Response) => {
  const filtros: Parameters<typeof guardiasService.listarGuardias>[0] = {};
  if (req.query.desde) filtros.desde = String(req.query.desde);
  if (req.query.hasta) filtros.hasta = String(req.query.hasta);
  if (req.query.grupo) filtros.grupo = String(req.query.grupo);
  const data = await guardiasService.listarGuardias(filtros);
  res.json(data);
});

export const getResumenGuardias = asyncHandler(async (req: Request, res: Response) => {
  const fecha = (req.query.fecha as string) || new Date().toISOString().slice(0, 10);
  const data = await guardiasService.resumenGuardias(fecha);
  res.json(data);
});

export const getGuardia = asyncHandler(async (req: Request, res: Response) => {
  const data = await guardiasService.obtenerGuardia(String(req.params.id));
  res.json(data);
});

export const postGuardia = asyncHandler(async (req: Request, res: Response) => {
  const data = await guardiasService.crearGuardia(rutUsuario(req), req.body);
  res.status(201).json(data);
});

export const patchGuardia = asyncHandler(async (req: Request, res: Response) => {
  const data = await guardiasService.actualizarGuardia(String(req.params.id), req.body);
  res.json(data);
});

export const deleteGuardia = asyncHandler(async (req: Request, res: Response) => {
  await guardiasService.eliminarGuardia(String(req.params.id));
  res.json({ ok: true });
});
