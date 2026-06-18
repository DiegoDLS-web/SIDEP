import { Request, Response } from 'express';
import * as checklistsService from '../services/checklists.service';
import { prisma } from '../../../prisma';

export const addPlantilla = async (req: Request, res: Response) => {
    try {
        const plantilla = await checklistsService.crearPlantilla(req.body);
        res.status(201).json({ success: true, data: plantilla });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const addEjecucion = async (req: Request, res: Response) => {
    try {
        const {
            carroId,
            revisorRut,
            plantillaId,
            resultadosMateriales,
            entidadTipo,
            firmaOficial,
            firmaInspector,
        } = req.body;
        if (!carroId || !revisorRut) {
            return res.status(400).json({ success: false, message: 'Faltan carroId o revisorRut' });
        }
        const checklist = await checklistsService.registrarEjecucion(
            String(carroId),
            String(revisorRut),
            plantillaId ? String(plantillaId) : undefined,
            resultadosMateriales ?? {},
            {
                entidadTipo: entidadTipo ? String(entidadTipo) : 'CARRO',
                firmaOficial: firmaOficial ?? null,
                firmaInspector: firmaInspector ?? null,
            },
        );
        res.status(201).json({ success: true, data: checklist });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getHistorial = async (req: Request, res: Response) => {
    try {
        const carroId = req.query.carroId as string;
        const historial = await checklistsService.obtenerHistorial(carroId);
        res.status(200).json({ success: true, data: historial });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
};
export const editPlantilla = async (req: Request, res: Response) => {
    try {
        // Añadimos "as string"
        const plantilla = await checklistsService.actualizarPlantilla(req.params.id as string, req.body);
        res.status(200).json({ success: true, data: plantilla });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getDetalleEjecucion = async (req: Request, res: Response) => {
    try {
        // Añadimos "as string"
        const detalle = await checklistsService.obtenerDetalleEjecucion(req.params.id as string);
        res.status(200).json({ success: true, data: detalle });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
export const obtenerPlantillas = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Corregido: Prisma utiliza 'checklistPlantilla' basándose en tu schema
    const plantillas = await prisma.checklistPlantilla.findMany({
      where: { activo: 1 }
    });
    return res.status(200).json({ success: true, data: plantillas });
  } catch (error: any) {
    console.error("Error al obtener plantillas:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};