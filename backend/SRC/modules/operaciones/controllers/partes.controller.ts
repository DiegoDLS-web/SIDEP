import { Request, Response } from 'express';
import * as partesService from '../services/partes.service';
import { ValidationError } from '../../../utils/errors/AppError';

function mensajeErrorParte(error: unknown, fallback: string): string {
  if (error instanceof ValidationError) {
    return error.errors?.join(' ') || error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function cuerpoErrorParte(error: unknown, fallback: string) {
  if (error instanceof ValidationError) {
    return {
      message: error.errors?.join(' ') || error.message,
      errors: error.errors,
    };
  }
  return { message: mensajeErrorParte(error, fallback) };
}

export const crearParte = async (req: Request, res: Response): Promise<Response> => {
  try {
    const nuevoParte = await partesService.crearParteConRelaciones(req.body);
    return res.status(201).json(nuevoParte);
  } catch (error: unknown) {
    console.error('Error al crear parte:', error);
    const msg = mensajeErrorParte(error, 'Error al crear parte');
    if (error instanceof ValidationError) {
      return res.status(400).json(cuerpoErrorParte(error, msg));
    }
    if (msg.includes('OBAC')) return res.status(400).json({ message: `${msg} Verifica que el usuario OBAC exista y esté activo.` });
    if (msg.includes('Clave')) return res.status(400).json({ message: `${msg} Revisa el tipo de emergencia seleccionado.` });
    if (msg.includes('Unique constraint') || msg.includes('correlativo')) {
      return res.status(409).json({ message: 'Ya existe un parte con ese correlativo. Intenta guardar de nuevo.' });
    }
    return res.status(400).json({ message: msg });
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
    const rolActor = (req as any).dbUser?.rol?.codigo as string | undefined;
    const actualizado = await partesService.actualizarParte(id, req.body, rolActor);
    if (!actualizado) {
      return res.status(404).json({ message: 'Parte no encontrado' });
    }
    return res.status(200).json(actualizado);
  } catch (error: unknown) {
    console.error('Error al actualizar parte:', error);
    return res.status(400).json(cuerpoErrorParte(error, 'Error al actualizar parte'));
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
