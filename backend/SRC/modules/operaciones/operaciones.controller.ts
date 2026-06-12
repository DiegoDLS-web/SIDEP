import { Request, Response } from 'express';
import { obtenerPartes, crearParteEmergencia } from './operaciones.service';

export const getPartes = async (req: Request, res: Response) => {
    try {
        const partes = await obtenerPartes();
        
        return res.status(200).json({
            success: true,
            data: partes
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los partes de emergencia'
        });
    }
};

export const registrarParte = async (req: Request, res: Response) => {
    try {
        // CORRECCIÓN: Extraemos obacRut, no obacId
        const { correlativo, direccion, estadoId, claveId, obacRut } = req.body;

        if (!correlativo || !direccion || !estadoId || !claveId || !obacRut) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios (correlativo, dirección, estado, clave u OBAC)'
            });
        }

        const nuevoParte = await crearParteEmergencia(req.body);

        return res.status(201).json({
            success: true,
            message: 'Parte de emergencia registrado exitosamente',
            data: nuevoParte
        });

    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Error interno al guardar el parte de emergencia'
        });
    }
};