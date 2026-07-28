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
exports.cambiarMiPassword = exports.subirArchivoLicencia = exports.subirFotoPerfil = exports.getMiResumenOperativo = exports.patchMiPerfil = exports.getMiPerfil = void 0;
const rrhhService = __importStar(require("../services/rrhh.service"));
const password_policy_util_1 = require("../../../utils/security/password-policy.util");
// 1. Obtener mi perfil
const getMiPerfil = async (req, res) => {
    try {
        const userRut = req.user.rut;
        if (!userRut) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }
        const perfil = await rrhhService.obtenerMiPerfil(userRut);
        return res.status(200).json(perfil);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET MI PERFIL:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener el perfil' });
    }
};
exports.getMiPerfil = getMiPerfil;
// 2. Actualizar mi perfil (datos generales)
const patchMiPerfil = async (req, res) => {
    try {
        const userRut = req.user.rut;
        if (!userRut) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }
        const perfilActualizado = await rrhhService.actualizarMiPerfil(userRut, req.body);
        return res.status(200).json(perfilActualizado);
    }
    catch (error) {
        console.error('🔥 ERROR EN PATCH MI PERFIL:', error);
        return res.status(400).json({ success: false, error: error.message || 'Error al actualizar el perfil' });
    }
};
exports.patchMiPerfil = patchMiPerfil;
// 3. Obtener resumen operativo (asistencias y licencias)
const getMiResumenOperativo = async (req, res) => {
    try {
        const userRut = req.user.rut;
        if (!userRut) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }
        const resumen = await rrhhService.obtenerMiResumenOperativo(userRut);
        return res.status(200).json(resumen);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET MI RESUMEN OPERATIVO:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener el resumen operativo' });
    }
};
exports.getMiResumenOperativo = getMiResumenOperativo;
// 4. Endpoint para subir foto de perfil mediante multipart/form-data (Multer + Cloudinary)
const subirFotoPerfil = async (req, res) => {
    try {
        const userRut = req.user.rut;
        if (!userRut) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo de imagen' });
        }
        const fileData = req.file;
        const nuevaUrl = fileData.path; // secure_url de Cloudinary
        const nuevoPublicId = fileData.filename; // public_id de Cloudinary
        const dataDto = await rrhhService.actualizarFotoPerfil(userRut, nuevaUrl, nuevoPublicId);
        return res.status(200).json({
            success: true,
            message: 'Foto de perfil subida y actualizada con éxito',
            data: dataDto,
        });
    }
    catch (error) {
        console.error('🔥 ERROR EN SUBIR FOTO PERFIL:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al subir la foto de perfil' });
    }
};
exports.subirFotoPerfil = subirFotoPerfil;
// 5. Endpoint para subir archivo PDF de licencia médica mediante multipart/form-data
const subirArchivoLicencia = async (req, res) => {
    try {
        const userRut = req.user.rut;
        const { licenciaId } = req.body; // El ID de la licencia médica a actualizar
        if (!userRut) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }
        if (!licenciaId) {
            return res.status(400).json({ success: false, message: 'Se requiere el ID de la licencia' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo PDF' });
        }
        const fileData = req.file;
        const nuevaUrl = fileData.path; // secure_url del PDF en Cloudinary
        const nuevoPublicId = fileData.filename; // public_id en Cloudinary
        const licenciaActualizada = await rrhhService.actualizarArchivoLicencia(licenciaId, nuevaUrl, nuevoPublicId);
        return res.status(200).json({
            success: true,
            message: 'Documento PDF de licencia subido correctamente',
            data: licenciaActualizada,
        });
    }
    catch (error) {
        console.error('🔥 ERROR EN SUBIR ARCHIVO LICENCIA:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al subir archivo de licencia' });
    }
};
exports.subirArchivoLicencia = subirArchivoLicencia;
// 6. Cambiar mi propia contraseña
const cambiarMiPassword = async (req, res) => {
    try {
        const userRut = req.user.rut;
        if (!userRut) {
            return res.status(401).json({ success: false, message: 'No autorizado' });
        }
        const { passwordActual, passwordNueva } = req.body;
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ success: false, error: 'Se requieren la contraseña actual y la nueva.' });
        }
        const errPolitica = (0, password_policy_util_1.validarPasswordNueva)(passwordNueva, userRut);
        if (errPolitica) {
            return res.status(400).json({ success: false, error: errPolitica });
        }
        await rrhhService.cambiarPassword(userRut, passwordActual, passwordNueva);
        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    }
    catch (error) {
        console.error('🔥 ERROR EN CAMBIAR MI PASSWORD:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al cambiar contraseña' });
    }
};
exports.cambiarMiPassword = cambiarMiPassword;
