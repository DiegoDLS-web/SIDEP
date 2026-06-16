import { Request, Response } from 'express';
import * as partesService from '../services/partes.service';

export const crearParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = req.body;
    const nuevoParte = await partesService.crearParteConRelaciones(data);
    return res.status(201).json({ success: true, data: nuevoParte });
  } catch (error: any) {
    console.error("Error al crear parte:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerPartes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const partes = await partesService.obtenerTodos();
    return res.status(200).json({ success: true, data: partes });
  } catch (error: any) {
    console.error("Error al obtener partes:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerPartePorId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = String(req.params.id);
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: 'ID no proporcionado' });
    }
    
    const parte = await partesService.obtenerPorId(id);
    if (!parte) {
      return res.status(404).json({ success: false, message: 'Parte no encontrado' });
    }
    
    return res.status(200).json({ success: true, data: parte });
  } catch (error: any) {
    console.error("Error al obtener parte por ID:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const actualizarParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = String(req.params.id);
    const data = req.body;
    const actualizado = await partesService.actualizarParte(id, data);
    return res.status(200).json({ success: true, data: actualizado });
  } catch (error: any) {
    console.error("Error al actualizar parte:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const anularParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = String(req.params.id);
    await partesService.anularParte(id);
    return res.status(200).json({ success: true, message: 'Parte anulado correctamente' });
  } catch (error: any) {
    console.error("Error al anular parte:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};