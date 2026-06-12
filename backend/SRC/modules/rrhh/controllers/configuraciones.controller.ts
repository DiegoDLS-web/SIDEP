import { Request, Response } from 'express';
import * as configuracionesService from '../services/configuraciones.service';

export const obtenerConfiguraciones = async (req: Request, res: Response) => {
  try {
    const dto = await configuracionesService.obtenerConfiguracionesService();
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET CONFIGURACIONES:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
  }
};

export const actualizarConfiguraciones = async (req: Request, res: Response) => {
  try {
    const dto = await configuracionesService.actualizarConfiguracionesService(req.body);
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR CONFIGURACIONES:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar configuraciones' });
  }
};

export const subirLogoCompania = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const fileData = req.file as any;
    const nuevaUrl = fileData.path;
    const nuevoPublicId = fileData.filename;

    const path = await configuracionesService.actualizarLogoCompania(nuevaUrl, nuevoPublicId);

    return res.status(200).json({
      ok: true,
      path
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN SUBIR LOGO COMPAÑIA:', error);
    return res.status(500).json({ ok: false, error: 'Error al subir el logo' });
  }
};

export const actualizarTiposEmergencia = async (req: Request, res: Response) => {
  try {
    const { tiposEmergencia } = req.body;
    const dto = await configuracionesService.actualizarTiposEmergenciaService(tiposEmergencia);
    return res.status(200).json(dto);
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR TIPOS EMERGENCIA:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar tipos de emergencia' });
  }
};
