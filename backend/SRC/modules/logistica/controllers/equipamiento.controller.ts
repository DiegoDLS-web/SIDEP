import { Request, Response } from 'express';
import * as equipamientoService from '../services/equipamiento.service';
import { respuestaErrorJson } from '../../../utils/prisma-error.util';

function enviarError(res: Response, err: unknown, fallback: string, asMessageOnly = false): void {
    const { statusCode, body } = respuestaErrorJson(err, fallback);
    if (asMessageOnly) {
        res.status(statusCode).json({ message: body.message });
        return;
    }
    res.status(statusCode).json(body);
}

export const addBolsoTrauma = async (req: Request, res: Response) => {
    try {
        const bolso = await equipamientoService.registrarBolsoTrauma(req.body);
        res.status(201).json({ success: true, data: bolso });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al registrar bolso de trauma');
    }
};
export const addMaterialCarro = async (req: Request, res: Response) => {
    try {
        const { carroId, materialId, cantidadObjetivo } = req.body;
        if (!carroId || !materialId || !cantidadObjetivo) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }
        const material = await equipamientoService.asignarMaterialCarro(req.body);
        res.status(201).json({ success: true, data: material });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al asignar material al carro');
    }
};

export const getInventarioCarro = async (req: Request, res: Response) => {
    try {
        const inventario = await equipamientoService.obtenerInventarioCarro(req.params.carroId as string);
        res.status(200).json({ success: true, data: inventario });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: 'Error al obtener inventario' });
    }
};

export const getInventarioChecklistCarro = async (req: Request, res: Response) => {
    try {
        const data = await equipamientoService.obtenerInventarioChecklistCarro(req.params.carroId as string);
        res.status(200).json({ success: true, data });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al obtener inventario de checklist');
    }
};

export const postSincronizarInventarioCarro = async (req: Request, res: Response) => {
    try {
        const carroId = String(req.params.carroId ?? '').trim();
        const ubicaciones = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];
        if (!carroId) {
            return res.status(400).json({ success: false, message: 'carroId requerido' });
        }
        const data = await equipamientoService.sincronizarInventarioDesdeUbicacionesCarro(carroId, ubicaciones);
        res.status(200).json({ success: true, data });
    } catch (error: unknown) {
        enviarError(res, error, 'Error al sincronizar inventario del carro');
    }
};

export const getSelectorBolsos = async (req: Request, res: Response) => {
    try {
        const data = await equipamientoService.obtenerSelectorBolsos();
        res.status(200).json(data);
    } catch (error: unknown) {
        enviarError(res, error, 'Error al obtener selector de bolsos', true);
    }
};

export const getHistorialBolsos = async (req: Request, res: Response) => {
    try {
        const filtros: { unidades?: string; desde?: string; hasta?: string } = {};
        if (req.query.unidades) filtros.unidades = String(req.query.unidades);
        if (req.query.desde) filtros.desde = String(req.query.desde);
        if (req.query.hasta) filtros.hasta = String(req.query.hasta);
        const data = await equipamientoService.obtenerHistorialBolsos(filtros);
        res.status(200).json(data);
    } catch (error: unknown) {
        enviarError(res, error, 'Error al obtener historial de bolsos', true);
    }
};

export const getUnidadBolsoTrauma = async (req: Request, res: Response) => {
    try {
        const unidad = String(req.params.unidad ?? '').trim();
        if (!unidad) {
            return res.status(400).json({ message: 'Unidad no indicada.' });
        }
        const data = await equipamientoService.obtenerUnidadBolsoTrauma(unidad);
        return res.status(200).json(data);
    } catch (error: unknown) {
        enviarError(res, error, 'Error al cargar unidad de bolso trauma', true);
    }
};

export const postRevisionBolsoTrauma = async (req: Request, res: Response) => {
    try {
        const unidad = String(req.params.unidad ?? '').trim();
        if (!unidad) {
            return res.status(400).json({ message: 'Unidad no indicada.' });
        }
        const data = await equipamientoService.guardarRevisionBolsoTrauma(unidad, req.body);
        return res.status(201).json(data);
    } catch (error: unknown) {
        enviarError(res, error, 'Error al guardar revisión de bolso trauma', true);
    }
};

export const getHistorialBolsoPorId = async (req: Request, res: Response) => {
    try {
        const data = await equipamientoService.obtenerHistorialBolsoPorId(String(req.params.id));
        res.status(200).json(data);
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error al obtener detalle del bolso' });
    }
};
