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