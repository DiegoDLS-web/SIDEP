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
exports.anularParte = exports.actualizarParte = exports.obtenerPartePorId = exports.obtenerMetricas = exports.obtenerPagina = exports.obtenerPartes = exports.crearParte = void 0;
const partesService = __importStar(require("../services/partes.service"));
const AppError_1 = require("../../../utils/errors/AppError");
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
function mensajeErrorParte(error, fallback) {
    if (error instanceof AppError_1.ValidationError) {
        return error.errors?.join(' ') || error.message;
    }
    const resuelto = (0, prisma_error_util_1.resolverErrorHttp)(error);
    if (resuelto)
        return resuelto.message;
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return fallback;
}
function cuerpoErrorParte(error, fallback) {
    if (error instanceof AppError_1.ValidationError) {
        return {
            message: error.errors?.join(' ') || error.message,
            errors: error.errors,
        };
    }
    const resuelto = (0, prisma_error_util_1.resolverErrorHttp)(error);
    if (resuelto) {
        return { message: resuelto.message, errors: resuelto.errors };
    }
    return { message: (0, prisma_error_util_1.mensajeErrorCliente)(error, fallback) };
}
const crearParte = async (req, res) => {
    try {
        const nuevoParte = await partesService.crearParteConRelaciones(req.body);
        return res.status(201).json(nuevoParte);
    }
    catch (error) {
        console.error('Error al crear parte:', error);
        const msg = mensajeErrorParte(error, 'Error al crear parte');
        const status = (0, prisma_error_util_1.statusErrorCliente)(error, 400);
        if (error instanceof AppError_1.ValidationError) {
            return res.status(400).json(cuerpoErrorParte(error, msg));
        }
        if (msg.includes('OBAC')) {
            return res.status(400).json({ message: `${msg} Verifica que el usuario OBAC exista y esté activo.` });
        }
        if (msg.includes('clave de emergencia') || msg.includes('Clave')) {
            return res.status(400).json({ message: `${msg} Revisa el tipo de emergencia seleccionado.` });
        }
        return res.status(status).json(cuerpoErrorParte(error, msg));
    }
};
exports.crearParte = crearParte;
const obtenerPartes = async (req, res) => {
    try {
        const partes = await partesService.obtenerTodos();
        return res.status(200).json(partes);
    }
    catch (error) {
        console.error('Error al obtener partes:', error);
        return res.status(500).json({ message: error.message || 'Error al obtener partes' });
    }
};
exports.obtenerPartes = obtenerPartes;
const obtenerPagina = async (req, res) => {
    try {
        const pagina = await partesService.listarPagina({
            page: req.query.page ? Number(req.query.page) : undefined,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
            tipos: req.query.tipos,
            carros: req.query.carros,
            q: req.query.q,
            desde: req.query.desde,
            hasta: req.query.hasta,
            estado: req.query.estado,
            persona: req.query.persona,
        });
        return res.status(200).json(pagina);
    }
    catch (error) {
        console.error('Error al obtener página de partes:', error);
        return res.status(500).json({ message: error.message || 'Error al paginar partes' });
    }
};
exports.obtenerPagina = obtenerPagina;
const obtenerMetricas = async (req, res) => {
    try {
        const metricas = await partesService.obtenerMetricas();
        return res.status(200).json(metricas);
    }
    catch (error) {
        console.error('Error al obtener métricas de partes:', error);
        return res.status(500).json({ message: error.message || 'Error al obtener métricas' });
    }
};
exports.obtenerMetricas = obtenerMetricas;
const obtenerPartePorId = async (req, res) => {
    try {
        const id = String(req.params.id);
        if (!id || id === 'undefined') {
            return res.status(400).json({ message: 'ID no proporcionado' });
        }
        const parte = await partesService.obtenerPorId(id);
        if (!parte) {
            return res.status(404).json({ message: 'Parte no encontrado' });
        }
        return res.status(200).json(parte);
    }
    catch (error) {
        console.error('Error al obtener parte por ID:', error);
        return res.status(500).json({ message: error.message || 'Error al obtener parte' });
    }
};
exports.obtenerPartePorId = obtenerPartePorId;
const actualizarParte = async (req, res) => {
    try {
        const id = String(req.params.id);
        const rolActor = req.dbUser?.rol?.codigo;
        const actualizado = await partesService.actualizarParte(id, req.body, rolActor);
        if (!actualizado) {
            return res.status(404).json({ message: 'Parte no encontrado' });
        }
        return res.status(200).json(actualizado);
    }
    catch (error) {
        console.error('Error al actualizar parte:', error);
        const status = (0, prisma_error_util_1.statusErrorCliente)(error, 400);
        return res.status(status).json(cuerpoErrorParte(error, 'Error al actualizar parte'));
    }
};
exports.actualizarParte = actualizarParte;
const anularParte = async (req, res) => {
    try {
        const id = String(req.params.id);
        await partesService.anularParte(id);
        return res.status(200).json({ success: true, message: 'Parte anulado correctamente' });
    }
    catch (error) {
        console.error('Error al anular parte:', error);
        const status = (0, prisma_error_util_1.statusErrorCliente)(error, 500);
        return res.status(status).json(cuerpoErrorParte(error, 'Error al anular parte'));
    }
};
exports.anularParte = anularParte;
