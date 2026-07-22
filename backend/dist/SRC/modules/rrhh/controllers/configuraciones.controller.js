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
exports.actualizarTiposEmergencia = exports.subirLogoCompania = exports.actualizarConfiguraciones = exports.obtenerConfiguracionOperativa = exports.obtenerConfiguraciones = void 0;
const configuracionesService = __importStar(require("../services/configuraciones.service"));
const obtenerConfiguraciones = async (req, res) => {
    try {
        const dto = await configuracionesService.obtenerConfiguracionesService();
        return res.status(200).json(dto);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET CONFIGURACIONES:', error);
        return res.status(500).json({ success: false, error: 'Error al obtener configuraciones' });
    }
};
exports.obtenerConfiguraciones = obtenerConfiguraciones;
const obtenerConfiguracionOperativa = async (req, res) => {
    try {
        const dto = await configuracionesService.obtenerConfiguracionOperativaService();
        return res.status(200).json(dto);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET CONFIGURACION OPERATIVA:', error);
        return res.status(500).json({ success: false, error: 'Error al obtener configuración operativa' });
    }
};
exports.obtenerConfiguracionOperativa = obtenerConfiguracionOperativa;
const actualizarConfiguraciones = async (req, res) => {
    try {
        const dto = await configuracionesService.actualizarConfiguracionesService(req.body);
        return res.status(200).json(dto);
    }
    catch (error) {
        console.error('🔥 ERROR EN ACTUALIZAR CONFIGURACIONES:', error);
        return res.status(500).json({ success: false, error: 'Error al actualizar configuraciones' });
    }
};
exports.actualizarConfiguraciones = actualizarConfiguraciones;
const subirLogoCompania = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
        }
        const fileData = req.file;
        const nuevaUrl = fileData.path;
        const nuevoPublicId = fileData.filename;
        const path = await configuracionesService.actualizarLogoCompania(nuevaUrl, nuevoPublicId);
        return res.status(200).json({
            ok: true,
            path
        });
    }
    catch (error) {
        console.error('🔥 ERROR EN SUBIR LOGO COMPAÑIA:', error);
        return res.status(500).json({ ok: false, error: 'Error al subir el logo' });
    }
};
exports.subirLogoCompania = subirLogoCompania;
const actualizarTiposEmergencia = async (req, res) => {
    try {
        const { tiposEmergencia } = req.body;
        const dto = await configuracionesService.actualizarTiposEmergenciaService(tiposEmergencia);
        return res.status(200).json(dto);
    }
    catch (error) {
        console.error('🔥 ERROR EN ACTUALIZAR TIPOS EMERGENCIA:', error);
        return res.status(500).json({ success: false, error: 'Error al actualizar tipos de emergencia' });
    }
};
exports.actualizarTiposEmergencia = actualizarTiposEmergencia;
