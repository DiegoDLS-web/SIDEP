"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarChecklist = exports.getCarros = void 0;
const logistica_service_1 = require("./logistica.service");
// 1. Controlador para enviar la lista de carros a Angular
const getCarros = async (req, res) => {
    try {
        const carros = await (0, logistica_service_1.obtenerCarrosActivos)();
        return res.status(200).json({
            success: true,
            data: carros
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los carros desde la base de datos'
        });
    }
};
exports.getCarros = getCarros;
// 2. Controlador para recibir y guardar el formulario del checklist
const registrarChecklist = async (req, res) => {
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
        const nuevoChecklist = await (0, logistica_service_1.crearChecklist)(carroId, revisorRut, plantillaId, resultadosMateriales);
        return res.status(201).json({
            success: true,
            message: 'Checklist registrado exitosamente',
            data: nuevoChecklist
        });
    }
    catch (error) {
        // Atrapamos cualquier error (como si mandan un carroId que no existe)
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Error interno al guardar el checklist'
        });
    }
};
exports.registrarChecklist = registrarChecklist;
