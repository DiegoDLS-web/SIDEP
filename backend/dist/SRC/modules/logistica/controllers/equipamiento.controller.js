"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistorialBolsoPorId = exports.postRevisionBolsoTrauma = exports.getUnidadBolsoTrauma = exports.getHistorialBolsos = exports.getSelectorBolsos = exports.postSincronizarInventarioCarro = exports.getInventarioChecklistCarro = exports.getInventarioCarro = exports.addMaterialCarro = exports.addBolsoTrauma = void 0;
const equipamientoService = __importStar(require("../services/equipamiento.service"));
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
function enviarError(res, err, fallback, asMessageOnly = false) {
    const { statusCode, body } = (0, prisma_error_util_1.respuestaErrorJson)(err, fallback);
    if (asMessageOnly) {
        res.status(statusCode).json({ message: body.message });
        return;
    }
    res.status(statusCode).json(body);
}
const addBolsoTrauma = async (req, res) => {
    try {
        const bolso = await equipamientoService.registrarBolsoTrauma(req.body);
        res.status(201).json({ success: true, data: bolso });
    }
    catch (error) {
        enviarError(res, error, 'Error al registrar bolso de trauma');
    }
};
exports.addBolsoTrauma = addBolsoTrauma;
const addMaterialCarro = async (req, res) => {
    try {
        const { carroId, materialId, cantidadObjetivo } = req.body;
        if (!carroId || !materialId || !cantidadObjetivo) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }
        const material = await equipamientoService.asignarMaterialCarro(req.body);
        res.status(201).json({ success: true, data: material });
    }
    catch (error) {
        enviarError(res, error, 'Error al asignar material al carro');
    }
};
exports.addMaterialCarro = addMaterialCarro;
const getInventarioCarro = async (req, res) => {
    try {
        const inventario = await equipamientoService.obtenerInventarioCarro(req.params.carroId);
        res.status(200).json({ success: true, data: inventario });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener inventario' });
    }
};
exports.getInventarioCarro = getInventarioCarro;
const getInventarioChecklistCarro = async (req, res) => {
    try {
        const data = await equipamientoService.obtenerInventarioChecklistCarro(req.params.carroId);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener inventario de checklist');
    }
};
exports.getInventarioChecklistCarro = getInventarioChecklistCarro;
const postSincronizarInventarioCarro = async (req, res) => {
    try {
        const carroId = String(req.params.carroId ?? '').trim();
        const ubicaciones = Array.isArray(req.body?.ubicaciones) ? req.body.ubicaciones : [];
        if (!carroId) {
            return res.status(400).json({ success: false, message: 'carroId requerido' });
        }
        const data = await equipamientoService.sincronizarInventarioDesdeUbicacionesCarro(carroId, ubicaciones);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al sincronizar inventario del carro');
    }
};
exports.postSincronizarInventarioCarro = postSincronizarInventarioCarro;
const getSelectorBolsos = async (req, res) => {
    try {
        const data = await equipamientoService.obtenerSelectorBolsos();
        res.status(200).json(data);
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener selector de bolsos', true);
    }
};
exports.getSelectorBolsos = getSelectorBolsos;
const getHistorialBolsos = async (req, res) => {
    try {
        const filtros = {};
        if (req.query.unidades)
            filtros.unidades = String(req.query.unidades);
        if (req.query.desde)
            filtros.desde = String(req.query.desde);
        if (req.query.hasta)
            filtros.hasta = String(req.query.hasta);
        const data = await equipamientoService.obtenerHistorialBolsos(filtros);
        res.status(200).json(data);
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener historial de bolsos', true);
    }
};
exports.getHistorialBolsos = getHistorialBolsos;
const getUnidadBolsoTrauma = async (req, res) => {
    try {
        const unidad = String(req.params.unidad ?? '').trim();
        if (!unidad) {
            return res.status(400).json({ message: 'Unidad no indicada.' });
        }
        const data = await equipamientoService.obtenerUnidadBolsoTrauma(unidad);
        return res.status(200).json(data);
    }
    catch (error) {
        enviarError(res, error, 'Error al cargar unidad de bolso trauma', true);
    }
};
exports.getUnidadBolsoTrauma = getUnidadBolsoTrauma;
const postRevisionBolsoTrauma = async (req, res) => {
    try {
        const unidad = String(req.params.unidad ?? '').trim();
        if (!unidad) {
            return res.status(400).json({ message: 'Unidad no indicada.' });
        }
        const data = await equipamientoService.guardarRevisionBolsoTrauma(unidad, req.body);
        return res.status(201).json(data);
    }
    catch (error) {
        enviarError(res, error, 'Error al guardar revisión de bolso trauma', true);
    }
};
exports.postRevisionBolsoTrauma = postRevisionBolsoTrauma;
const getHistorialBolsoPorId = async (req, res) => {
    try {
        const data = await equipamientoService.obtenerHistorialBolsoPorId(String(req.params.id));
        res.status(200).json(data);
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error al obtener detalle del bolso' });
    }
};
exports.getHistorialBolsoPorId = getHistorialBolsoPorId;
