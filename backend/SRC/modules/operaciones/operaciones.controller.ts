import { Request, Response } from 'express';
import { obtenerPartes, crearParteEmergencia } from './operaciones.service';

// 1. Controlador para enviar todos los partes al frontend
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

// 2. Controlador para recibir y guardar un nuevo Parte
export const registrarParte = async (req: Request, res: Response) => {
    try {
        const { correlativo, direccion, estadoId, claveId, obacId } = req.body;

        // Validación base: Evitamos que desde Angular nos manden un formulario a medias
        if (!correlativo || !direccion || !estadoId || !claveId || !obacId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios (correlativo, dirección, estado, clave u OBAC)'
            });
        }

        // Si todo viene bien, le pasamos el objeto completo al servicio
        const nuevoParte = await crearParteEmergencia(req.body);

        return res.status(201).json({
            success: true,
            message: 'Parte de emergencia registrado exitosamente',
            data: nuevoParte
        });

    } catch (error: any) {
        // Atrapamos errores (por ejemplo, si envían un correlativo que ya existe)
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Error interno al guardar el parte de emergencia'
        });
    }
};