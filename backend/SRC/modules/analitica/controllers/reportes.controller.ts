import { Request, Response } from 'express';
import { asyncHandler } from '../../../middlewares/async-handler';
import { getEmergenciasReporte } from '../services/emergencias-reporte.service';
import { getCuadroHonorReporte } from '../services/cuadro-honor.service';
import { getAnaliticaOperacionalReporte } from '../services/analitica-operacional.service';
import { getDashboardResumen } from '../services/dashboard.service';

export const getEmergencias = asyncHandler(async (req: Request, res: Response) => {
  const { desde, hasta } = req.query as { desde?: string; hasta?: string };
  const data = await getEmergenciasReporte(desde, hasta);
  res.status(200).json(data);
});

export const getCuadroHonor = asyncHandler(async (req: Request, res: Response) => {
  const anio = req.query.anio ? parseInt(req.query.anio as string, 10) : undefined;
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : undefined;
  const data = await getCuadroHonorReporte(anio, mes);
  res.status(200).json(data);
});

export const getAnaliticaOperacional = asyncHandler(async (req: Request, res: Response) => {
  const anio = req.query.anio ? parseInt(req.query.anio as string, 10) : undefined;
  const mes = req.query.mes ? parseInt(req.query.mes as string, 10) : undefined;
  const data = await getAnaliticaOperacionalReporte(anio, mes);
  res.status(200).json(data);
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const anio = req.query.anio ? parseInt(req.query.anio as string, 10) : undefined;
  const clave = req.query.clave as string | undefined;
  const carroId = req.query.carroId ? parseInt(req.query.carroId as string, 10) : undefined;
  const data = await getDashboardResumen(anio, clave, carroId);
  res.status(200).json(data);
});
