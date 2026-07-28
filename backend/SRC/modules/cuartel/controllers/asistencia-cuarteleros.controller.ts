import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewares/async-handler';
import * as asistenciaService from '../services/asistencia-cuarteleros.service';

function rutUsuario(req: Request): string {
  const rut = (req as any).user?.rut;
  if (!rut) throw new Error('No autorizado');
  return rut;
}

export const getPlanillaAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const desde = String(req.query.desde ?? '');
  const hasta = String(req.query.hasta ?? '');
  const filtros: Parameters<typeof asistenciaService.obtenerPlanillaAsistencia>[0] = { desde, hasta };
  if (req.query.grupo) filtros.grupo = String(req.query.grupo);
  const data = await asistenciaService.obtenerPlanillaAsistencia(filtros);
  res.json(data);
});

export const postCeldaAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const data = await asistenciaService.upsertCeldaAsistencia(rutUsuario(req), req.body);
  res.status(200).json(data);
});

export const getAsistencias = asyncHandler(async (req: Request, res: Response) => {
  const filtros: Parameters<typeof asistenciaService.listarAsistencias>[0] = {};
  if (req.query.fecha) filtros.fecha = String(req.query.fecha);
  if (req.query.desde) filtros.desde = String(req.query.desde);
  if (req.query.hasta) filtros.hasta = String(req.query.hasta);
  if (req.query.grupo) filtros.grupo = String(req.query.grupo);
  if (req.query.presente === '1') filtros.presente = true;
  else if (req.query.presente === '0') filtros.presente = false;
  if (req.query.page) filtros.page = Number(req.query.page);
  if (req.query.pageSize) filtros.pageSize = Number(req.query.pageSize);
  const data = await asistenciaService.listarAsistencias(filtros);
  res.json(data);
});

export const getResumenAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const fecha = (req.query.fecha as string) || new Date().toISOString().slice(0, 10);
  const data = await asistenciaService.resumenAsistencia(fecha);
  res.json(data);
});

export const postAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const data = await asistenciaService.registrarAsistencia(rutUsuario(req), req.body);
  res.status(201).json(data);
});

export const patchAsistencia = asyncHandler(async (req: Request, res: Response) => {
  const data = await asistenciaService.actualizarAsistencia(
    String(req.params.id),
    rutUsuario(req),
    req.body,
  );
  res.json(data);
});

export const deleteAsistencia = asyncHandler(async (req: Request, res: Response) => {
  await asistenciaService.eliminarAsistencia(String(req.params.id));
  res.json({ ok: true });
});
