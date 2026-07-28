import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewares/async-handler';
import * as novedadesService from '../services/novedades.service';

function rutUsuario(req: Request): string {
  const rut = (req as any).user?.rut;
  if (!rut) throw new Error('No autorizado');
  return rut;
}

function esOficialidad(req: Request): boolean {
  const rol = String((req as any).user?.rol || '').toUpperCase();
  return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
}

export const getNovedades = asyncHandler(async (req: Request, res: Response) => {
  const filtros: Parameters<typeof novedadesService.listarNovedades>[0] = {};
  if (req.query.desde) filtros.desde = String(req.query.desde);
  if (req.query.hasta) filtros.hasta = String(req.query.hasta);
  if (req.query.categoria) filtros.categoria = String(req.query.categoria);
  if (req.query.importante === '1') filtros.importante = true;
  else if (req.query.importante === '0') filtros.importante = false;
  if (req.query.q) filtros.q = String(req.query.q);
  if (req.query.page) filtros.page = Number(req.query.page);
  if (req.query.pageSize) filtros.pageSize = Number(req.query.pageSize);
  const data = await novedadesService.listarNovedades(filtros);
  res.json(data);
});

export const postNovedad = asyncHandler(async (req: Request, res: Response) => {
  const data = await novedadesService.crearNovedad(rutUsuario(req), req.body);
  res.status(201).json(data);
});

export const patchNovedad = asyncHandler(async (req: Request, res: Response) => {
  const data = await novedadesService.actualizarNovedad(
    String(req.params.id),
    rutUsuario(req),
    esOficialidad(req),
    req.body,
  );
  res.json(data);
});

export const deleteNovedad = asyncHandler(async (req: Request, res: Response) => {
  await novedadesService.eliminarNovedad(String(req.params.id), rutUsuario(req), esOficialidad(req));
  res.json({ ok: true });
});
