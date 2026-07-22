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
exports.deleteAsistenciaDirecta = exports.postAsistenciaDirecta = exports.deleteAsistencia = exports.postAsistencia = exports.getAsistenciasVoluntario = void 0;
const async_handler_1 = require("../../../middlewares/async-handler");
const asistenciasService = __importStar(require("../services/asistencias.service"));
const AppError_1 = require("../../../utils/errors/AppError");
exports.getAsistenciasVoluntario = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const rut = req.query.rut;
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : undefined;
    const mes = req.query.mes ? parseInt(req.query.mes, 10) : undefined;
    if (!rut) {
        throw new AppError_1.ValidationError(['RUT es requerido']);
    }
    const data = await asistenciasService.getAsistenciasVoluntario(rut, anio, mes);
    res.status(200).json(data);
});
exports.postAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { parteId } = req.params;
    const { usuarioRut } = req.body;
    if (!parteId) {
        throw new AppError_1.ValidationError(['parteId es requerido en la ruta']);
    }
    if (!usuarioRut) {
        throw new AppError_1.ValidationError(['usuarioRut es requerido en el cuerpo']);
    }
    const data = await asistenciasService.agregarAsistencia(parteId, usuarioRut);
    res.status(201).json(data);
});
exports.deleteAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { parteId, asistenciaId } = req.params;
    if (!parteId || !asistenciaId) {
        throw new AppError_1.ValidationError(['parteId y/o asistenciaId son requeridos']);
    }
    const data = await asistenciasService.eliminarAsistencia(parteId, asistenciaId);
    res.status(200).json({
        success: true,
        message: 'Asistencia eliminada correctamente',
        data,
    });
});
exports.postAsistenciaDirecta = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { parteId, usuarioRut } = req.body;
    if (!parteId) {
        throw new AppError_1.ValidationError(['parteId es requerido en el cuerpo']);
    }
    if (!usuarioRut) {
        throw new AppError_1.ValidationError(['usuarioRut es requerido en el cuerpo']);
    }
    const data = await asistenciasService.agregarAsistencia(String(parteId), String(usuarioRut));
    res.status(201).json(data);
});
exports.deleteAsistenciaDirecta = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { asistenciaId } = req.params;
    const parteId = String(req.query.parteId || req.body?.parteId || '');
    if (!parteId || !asistenciaId) {
        throw new AppError_1.ValidationError(['parteId (query/body) y asistenciaId son requeridos']);
    }
    const data = await asistenciasService.eliminarAsistencia(parteId, asistenciaId);
    res.status(200).json({
        success: true,
        message: 'Asistencia eliminada correctamente',
        data,
    });
});
