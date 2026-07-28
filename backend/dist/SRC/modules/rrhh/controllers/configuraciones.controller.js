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
exports.obtenerLogsCorreo = exports.probarCorreo = exports.actualizarTiposEmergencia = exports.subirLogoCompania = exports.actualizarConfiguraciones = exports.obtenerConfiguracionOperativa = exports.obtenerConfiguraciones = void 0;
const configuracionesService = __importStar(require("../services/configuraciones.service"));
const email_service_1 = require("../../../utils/email/email.service");
const email_log_service_1 = require("../../../utils/email/email-log.service");
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
const probarCorreo = async (req, res) => {
    try {
        const to = String(req.body?.to ?? '').trim();
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
            return res.status(400).json({ success: false, error: 'Indica un correo de destino válido.' });
        }
        await (0, email_service_1.verificarConexionSmtp)();
        await (0, email_service_1.enviarCorreoPrueba)(to);
        return res.status(200).json({ ok: true, message: `Correo de prueba enviado a ${to}` });
    }
    catch (error) {
        const msg = error?.message === 'SMTP_NO_CONFIGURADO'
            ? 'El envío SMTP no está configurado en el servidor.'
            : 'No se pudo enviar el correo de prueba.';
        console.error('🔥 ERROR EN PROBAR CORREO:', error);
        return res.status(500).json({ success: false, error: msg });
    }
};
exports.probarCorreo = probarCorreo;
const obtenerLogsCorreo = async (req, res) => {
    try {
        const limit = Number(req.query.limit ?? 50);
        const logs = await (0, email_log_service_1.listarEmailLogs)(limit);
        return res.status(200).json(logs.map((l) => ({
            id: l.id,
            tipo: l.tipo,
            destinatario: l.destinatario,
            subject: l.subject,
            ok: l.ok === 1,
            detalle: l.detalle,
            createdAt: l.createdAt.toISOString(),
        })));
    }
    catch (error) {
        console.error('🔥 ERROR EN LOGS CORREO:', error);
        return res.status(500).json({ success: false, error: 'Error al obtener historial de correos' });
    }
};
exports.obtenerLogsCorreo = obtenerLogsCorreo;
