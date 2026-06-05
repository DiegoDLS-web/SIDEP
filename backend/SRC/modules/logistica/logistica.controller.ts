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
        const { carroId, cuarteleroId, resultadosMateriales } = req.body;

        // Validación estricta: nos aseguramos que Ignacio envíe todo lo necesario
        if (!carroId || !cuarteleroId || !resultadosMateriales || !Array.isArray(resultadosMateriales)) {
            return res.status(400).json({
                success: false,
                message: 'Faltan datos obligatorios o el formato de los materiales es incorrecto'
            });
        }

        // Si todo está bien, le pasamos el trabajo pesado al servicio
        const nuevoChecklist = await crearChecklist(carroId, cuarteleroId, resultadosMateriales);

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