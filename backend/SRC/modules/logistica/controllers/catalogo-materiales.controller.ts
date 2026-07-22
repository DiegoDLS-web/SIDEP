import { Request, Response } from 'express';
import * as catalogoService from '../services/catalogo-materiales.service';
import { respuestaErrorJson } from '../../../utils/prisma-error.util';

function enviarError(res: Response, err: unknown, fallback: string): void {
  const { statusCode, body } = respuestaErrorJson(err, fallback);
  res.status(statusCode).json(body);
}

export const getMateriales = async (_req: Request, res: Response) => {
  try {
    const incluirInactivos = _req.query.incluirInactivos === '1';
    const data = await catalogoService.listarMateriales({ incluirInactivos });
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al listar materiales');
  }
};

export const postMaterial = async (req: Request, res: Response) => {
  try {
    const data = await catalogoService.crearMaterial(req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al crear material');
  }
};

export const patchMaterial = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    const data = await catalogoService.actualizarMaterial(id, req.body ?? {});
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al actualizar material');
  }
};

export const patchMaterialActivo = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    const activo = req.body?.activo !== false;
    const data = await catalogoService.cambiarActivoMaterial(id, activo);
    res.status(200).json({ success: true, data });
  } catch (error) {
    enviarError(res, error, 'Error al cambiar estado del material');
  }
};
