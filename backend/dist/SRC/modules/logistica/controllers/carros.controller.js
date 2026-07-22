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
exports.obtenerCarroPorId = exports.toggleEstadoCarro = exports.getCarros = exports.getHistorialGeneralCarros = exports.editMantenimientoHistorial = exports.editCarro = exports.addCarro = void 0;
const carrosService = __importStar(require("../services/carros.service"));
const addCarro = async (req, res) => {
    try {
        const carro = await carrosService.crearCarro(req.body);
        res.status(201).json({ success: true, data: carro });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
exports.addCarro = addCarro;
const editCarro = async (req, res) => {
    try {
        const carro = await carrosService.actualizarCarro(req.params.id, req.body);
        res.status(200).json({ success: true, data: carro });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
exports.editCarro = editCarro;
const editMantenimientoHistorial = async (req, res) => {
    try {
        const fila = await carrosService.actualizarMantenimientoHistorial(req.params.id, req.body);
        res.status(200).json({ success: true, data: fila });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
exports.editMantenimientoHistorial = editMantenimientoHistorial;
const getHistorialGeneralCarros = async (req, res) => {
    try {
        const { carroId, desde, hasta } = req.query;
        const filtros = {};
        if (typeof carroId === 'string' && carroId.trim()) {
            filtros.carroId = carroId.trim();
        }
        if (typeof desde === 'string' && desde.trim()) {
            filtros.desde = desde.trim();
        }
        if (typeof hasta === 'string' && hasta.trim()) {
            filtros.hasta = hasta.trim();
        }
        const filas = await carrosService.historialMantenimientoGeneral(filtros);
        res.status(200).json(filas);
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
exports.getHistorialGeneralCarros = getHistorialGeneralCarros;
const getCarros = async (req, res) => {
    try {
        const carros = await carrosService.obtenerCarros();
        res.status(200).json({ success: true, data: carros });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los carros' });
    }
};
exports.getCarros = getCarros;
const toggleEstadoCarro = async (req, res) => {
    try {
        const { id } = req.params;
        const { estadoOperativo, motivo, fechaEfectiva } = req.body;
        if (estadoOperativo === undefined) {
            return res.status(400).json({ success: false, message: 'Falta el estado operativo' });
        }
        const estado = Number(estadoOperativo);
        if (![0, 1, 2].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado operativo inválido (0=fuera de servicio, 1=operativa, 2=mantención)',
            });
        }
        const resultado = await carrosService.cambiarEstadoOperativo(id, estado, {
            motivo: String(motivo ?? ''),
            fechaEfectiva: String(fechaEfectiva ?? ''),
        });
        res.status(200).json({
            success: true,
            message: 'Estado del carro actualizado',
            data: resultado.carro,
            motivo: resultado.motivo,
            fechaEfectiva: resultado.fechaEfectiva,
            estadoAnterior: resultado.estadoAnterior,
            estadoNuevo: estado,
        });
    }
    catch (error) {
        const status = error.statusCode || 500;
        const message = Array.isArray(error.errors) && error.errors.length > 0
            ? error.errors.join(' ')
            : error.message || 'Error al actualizar estado';
        res.status(status).json({ success: false, message, errors: error.errors });
    }
};
exports.toggleEstadoCarro = toggleEstadoCarro;
const obtenerCarroPorId = async (req, res) => {
    try {
        const id = String(req.params.id);
        const carro = await carrosService.obtenerCarroEnriquecido(id);
        return res.status(200).json({ success: true, data: carro });
    }
    catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
exports.obtenerCarroPorId = obtenerCarroPorId;
