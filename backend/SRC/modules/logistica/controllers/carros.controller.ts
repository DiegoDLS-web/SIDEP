import { Request, Response } from 'express';
import * as carrosService from '../services/carros.service';

export const addCarro = async (req: Request, res: Response) => {
    try {
        const carro = await carrosService.crearCarro(req.body);
        res.status(201).json({ success: true, data: carro });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const editCarro = async (req: Request, res: Response) => {
    try {
        // Añadimos "as string"
        const carro = await carrosService.actualizarCarro(req.params.id as string, req.body);
        res.status(200).json({ success: true, data: carro });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

export const getCarros = async (req: Request, res: Response) => {
    try {
        const carros = await carrosService.obtenerCarros();
        res.status(200).json({ success: true, data: carros });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Error al obtener los carros' });
    }
};
export const toggleEstadoCarro = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { estadoOperativo } = req.body; 
        
        if (estadoOperativo === undefined) {
            return res.status(400).json({ success: false, message: 'Falta el estado operativo' });
        }

        // Añadimos "as string"
        const carro = await carrosService.cambiarEstadoOperativo(id as string, Number(estadoOperativo));
        res.status(200).json({ success: true, message: 'Estado del carro actualizado', data: carro });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};