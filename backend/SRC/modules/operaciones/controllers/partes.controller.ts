import { Request, Response } from 'express';
import * as partesService from '../services/partes.service';

export const crearParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const nuevoParte = await partesService.crearParteConRelaciones(req.body);
    return res.status(201).json(nuevoParte);
  } catch (error: any) {
    console.error('Error al crear parte:', error);
    return res.status(400).json({ message: error.message || 'Error al crear parte' });
  }
};

export const obtenerPartes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const partes = await partesService.obtenerTodos();
    return res.status(200).json(partes);
  } catch (error: any) {
    console.error('Error al obtener partes:', error);
    return res.status(500).json({ message: error.message || 'Error al obtener partes' });
  }
};

export const obtenerPagina = async (req: Request, res: Response): Promise<Response> => {
  try {
    const pagina = await partesService.listarPagina({
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      tipos: req.query.tipos as string | undefined,
      carros: req.query.carros as string | undefined,
      q: req.query.q as string | undefined,
      desde: req.query.desde as string | undefined,
      hasta: req.query.hasta as string | undefined,
      estado: req.query.estado as string | undefined,
      persona: req.query.persona as string | undefined,
    });
    return res.status(200).json(pagina);
  } catch (error: any) {
    console.error('Error al obtener página de partes:', error);
    return res.status(500).json({ message: error.message || 'Error al paginar partes' });
  }
};

export const obtenerMetricas = async (req: Request, res: Response): Promise<Response> => {
  try {
    const metricas = await partesService.obtenerMetricas();
    return res.status(200).json(metricas);
  } catch (error: any) {
    console.error('Error al obtener métricas de partes:', error);
    return res.status(500).json({ message: error.message || 'Error al obtener métricas' });
  }
};

export const obtenerPartePorId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = String(req.params.id);
    if (!id || id === 'undefined') {
      return res.status(400).json({ message: 'ID no proporcionado' });
    }

    const parte = await partesService.obtenerPorId(id);
    if (!parte) {
      return res.status(404).json({ message: 'Parte no encontrado' });
    }

    return res.status(200).json(parte);
  } catch (error: any) {
    console.error('Error al obtener parte por ID:', error);
    return res.status(500).json({ message: error.message || 'Error al obtener parte' });
  }
};

export const actualizarParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = String(req.params.id);
    const actualizado = await partesService.actualizarParte(id, req.body);
    if (!actualizado) {
      return res.status(404).json({ message: 'Parte no encontrado' });
    }
    return res.status(200).json(actualizado);
  } catch (error: any) {
    console.error('Error al actualizar parte:', error);
    return res.status(400).json({ message: error.message || 'Error al actualizar parte' });
  }
};

export const anularParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = String(req.params.id);
    await partesService.anularParte(id);
    return res.status(200).json({ success: true, message: 'Parte anulado correctamente' });
  } catch (error: any) {
    console.error('Error al anular parte:', error);
    return res.status(500).json({ message: error.message || 'Error al anular parte' });
  }
};
