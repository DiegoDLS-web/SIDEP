import { Request, Response } from 'express';
import * as equipamientoService from '../services/equipamiento.service';

export const addBolsoTrauma = async (req: Request, res: Response) => {
    try {
        const bolso = await equipamientoService.registrarBolsoTrauma(req.body);
        res.status(201).json({ success: true, data: bolso });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
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
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getInventarioCarro = async (req: Request, res: Response) => {
    try {
        // Añadimos "as string"
        const inventario = await equipamientoService.obtenerInventarioCarro(req.params.carroId as string);
        res.status(200).json({ success: true, data: inventario });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error al obtener inventario' });
    }
};

export const getInventarioChecklistCarro = async (req: Request, res: Response) => {
    try {
        const data = await equipamientoService.obtenerInventarioChecklistCarro(req.params.carroId as string);
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
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
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getSelectorBolsos = async (req: Request, res: Response) => {
    try {
        const data = await equipamientoService.obtenerSelectorBolsos();
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error al obtener selector de bolsos' });
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error al obtener historial' });
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
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ message: error.message || 'Error al cargar unidad de bolso trauma' });
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
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ message: error.message || 'Error al guardar revisión de bolso trauma' });
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