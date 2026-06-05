import { Request, Response } from 'express';
import { obtenerCarrosActivos, crearChecklist } from './logistica.service';

// 1. Controlador para enviar la lista de carros a Angular
export const getCarros = async (req: Request, res: Response) => {
    try {
        const carros = await obtenerCarrosActivos();
        
        return res.status(200).json({
            success: true,
            data: carros
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los carros desde la base de datos'
        });
    }
};

// 2. Controlador para recibir y guardar el formulario del checklist
export const registrarChecklist = async (req: Request, res: Response) => {
    try {
        // CORRECCIÓN: Se extrae plantillaId y se usa revisorRut (coherente con el nuevo MER)
        const { carroId, revisorRut, plantillaId, resultadosMateriales } = req.body;

        // Validación estricta: incluimos los 4 campos obligatorios
        if (!carroId || !revisorRut || !plantillaId || !resultadosMateriales || !Array.isArray(resultadosMateriales)) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios (carroId, revisorRut, plantillaId) o el formato de los materiales es incorrecto'
            });
        }

        // CORRECCIÓN: Se pasan los 4 argumentos requeridos por el servicio
        const nuevoChecklist = await crearChecklist(carroId, revisorRut, plantillaId, resultadosMateriales);

        return res.status(201).json({
            success: true,
            message: 'Checklist registrado exitosamente',
            data: nuevoChecklist
        });

    } catch (error: any) {
        // Atrapamos cualquier error (como si mandan un carroId que no existe)
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Error interno al guardar el checklist'
        });
    }
};