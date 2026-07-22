"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarParte = exports.getPartes = void 0;
const operaciones_service_1 = require("./operaciones.service");
const getPartes = async (req, res) => {
    try {
        const partes = await (0, operaciones_service_1.obtenerPartes)();
        return res.status(200).json({
            success: true,
            data: partes
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener los partes de emergencia'
        });
    }
};
exports.getPartes = getPartes;
const registrarParte = async (req, res) => {
    try {
        // CORRECCIÓN: Extraemos obacRut, no obacId
        const { correlativo, direccion, estadoId, claveId, obacRut } = req.body;
        if (!correlativo || !direccion || !estadoId || !claveId || !obacRut) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios (correlativo, dirección, estado, clave u OBAC)'
            });
        }
        const nuevoParte = await (0, operaciones_service_1.crearParteEmergencia)(req.body);
        return res.status(201).json({
            success: true,
            message: 'Parte de emergencia registrado exitosamente',
            data: nuevoParte
        });
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || 'Error interno al guardar el parte de emergencia'
        });
    }
};
exports.registrarParte = registrarParte;
