import { Request, Response } from 'express';
import * as inventariosService from '../services/inventarios.service';
import { respuestaErrorJson } from '../../../utils/prisma-error.util';

function enviarError(res: Response, err: unknown, fallback: string): void {
  const { statusCode, body } = respuestaErrorJson(err, fallback);
  res.status(statusCode).json(body);
}

function rutUsuario(req: Request): string | null {
  const user = (req as Request & { user?: { rut?: string } }).user;
  return user?.rut?.trim() || null;
}

export const getResumen = async (_req: Request, res: Response) => {
  try {
    const data = await inventariosService.obtenerResumen();
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al obtener resumen de inventarios');
  }
};

export const getStockBodega = async (_req: Request, res: Response) => {
  try {
    const data = await inventariosService.listarStockBodega();
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar stock de bodega');
  }
};

export const getInventarioCarros = async (_req: Request, res: Response) => {
  try {
    const data = await inventariosService.listarInventarioCarros();
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar inventario por carro');
  }
};

export const getMovimientosBodega = async (req: Request, res: Response) => {
  try {
    const materialIdRaw = req.query.materialId ? Number(req.query.materialId) : NaN;
    const opts: { limit: number; materialId?: number } = { limit: 100 };
    if (!Number.isNaN(materialIdRaw) && materialIdRaw > 0) {
      opts.materialId = materialIdRaw;
    }
    const data = await inventariosService.listarMovimientos(opts);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar movimientos de bodega');
  }
};

export const postMovimientoBodega = async (req: Request, res: Response) => {
  try {
    const { materialId, tipo, cantidad, motivo } = req.body ?? {};
    if (!materialId || !tipo || cantidad === undefined) {
      return res.status(400).json({ success: false, message: 'materialId, tipo y cantidad son obligatorios' });
    }
    const data = await inventariosService.registrarMovimientoBodega({
      materialId: Number(materialId),
      tipo: String(tipo).toUpperCase() as 'ENTRADA' | 'SALIDA' | 'AJUSTE',
      cantidad: Number(cantidad),
      motivo: motivo ?? null,
      usuarioRut: rutUsuario(req),
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al registrar movimiento de bodega');
  }
};
