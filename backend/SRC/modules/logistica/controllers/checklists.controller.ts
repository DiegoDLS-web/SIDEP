import { Request, Response } from 'express';
import * as checklistsService from '../services/checklists.service';
import { prisma } from '../../../prisma';
import { respuestaErrorJson } from '../../../utils/prisma-error.util';

function enviarError(res: Response, err: unknown, fallback: string): void {
  const { statusCode, body } = respuestaErrorJson(err, fallback);
  res.status(statusCode).json(body);
}

export const addPlantilla = async (req: Request, res: Response) => {
    try {
        const plantilla = await checklistsService.crearPlantilla(req.body);
        res.status(201).json({ success: true, data: plantilla });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al crear plantilla de checklist');
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
    } catch (error: unknown) {
        enviarError(res, error, 'Error al registrar checklist');
    }
};

export const getHistorial = async (req: Request, res: Response) => {
    try {
        const carroId = req.query.carroId as string | undefined;
        const entidadTipo = req.query.entidadTipo as string | undefined;
        const excluirBorradores = req.query.excluirBorradores !== '0';
        const historial = await checklistsService.obtenerHistorial(carroId, {
            ...(entidadTipo ? { entidadTipo } : {}),
            excluirBorradores,
        });
        res.status(200).json({ success: true, data: historial });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
};

export const getHistorialBatch = async (req: Request, res: Response) => {
    try {
        const raw = String(req.query.carroIds ?? '').trim();
        const carroIds = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        const entidadTipo = req.query.entidadTipo as string | undefined;
        const data = await checklistsService.obtenerHistorialBatch(carroIds, {
            ...(entidadTipo ? { entidadTipo } : {}),
            excluirBorradores: req.query.excluirBorradores !== '0',
        });
        res.status(200).json({ success: true, data });
    } catch {
        res.status(500).json({ success: false, message: 'Error al obtener historial batch' });
    }
};
export const editPlantilla = async (req: Request, res: Response) => {
    try {
        // Añadimos "as string"
        const plantilla = await checklistsService.actualizarPlantilla(req.params.id as string, req.body);
        res.status(200).json({ success: true, data: plantilla });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al actualizar plantilla de checklist');
    }
};

export const getDetalleEjecucion = async (req: Request, res: Response) => {
    try {
        const detalle = await checklistsService.obtenerDetalleEjecucion(req.params.id as string);
        res.status(200).json({ success: true, data: detalle });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al obtener detalle de checklist');
    }
};

export const patchEstadoEjecucion = async (req: Request, res: Response) => {
    try {
        const { estadoChecklist, motivo, fechaEfectiva } = req.body ?? {};
        if (!estadoChecklist) {
            return res.status(400).json({ success: false, message: 'Falta estadoChecklist' });
        }
        const actorRut = (req as any).user?.rut as string | undefined;
        const opts: { motivo: string; fechaEfectiva: string; actorRut?: string } = {
            motivo: String(motivo ?? ''),
            fechaEfectiva: String(fechaEfectiva ?? ''),
        };
        if (actorRut) opts.actorRut = actorRut;
        const { ejecucion, estadoAnterior, estadoNuevo, motivo: motivoOk, fechaEfectiva: fechaOk } =
            await checklistsService.actualizarEstadoEjecucion(String(req.params.id), String(estadoChecklist), opts);
        res.status(200).json({
            success: true,
            data: ejecucion,
            estadoAnterior,
            estadoNuevo,
            motivo: motivoOk,
            fechaEfectiva: fechaOk,
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const obtenerPlantillas = async (req: Request, res: Response): Promise<void> => {
  try {
    const plantillas = await prisma.checklistPlantilla.findMany({
      where: { activo: 1 }
    });
    res.status(200).json({ success: true, data: plantillas });
  } catch (error: unknown) {
    console.error("Error al obtener plantillas:", error);
    enviarError(res, error, 'Error al obtener plantillas');
  }
};