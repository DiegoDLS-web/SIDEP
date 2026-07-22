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
exports.getResumen = exports.getLicenciasActivas = exports.patchEstado = exports.getLicencias = exports.patchLicencia = exports.postLicencia = exports.getMisLicencias = void 0;
const licenciasService = __importStar(require("../services/licencias.service"));
// ─── 1. GET /api/licencias/mis — Licencias propias ──────────────────
const getMisLicencias = async (req, res) => {
    try {
        const rut = req.user?.rut;
        if (!rut)
            return res.status(401).json({ success: false, message: 'No autorizado' });
        const list = await licenciasService.listarMisLicencias(rut);
        return res.status(200).json(list);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET MIS LICENCIAS:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener licencias' });
    }
};
exports.getMisLicencias = getMisLicencias;
// ─── 2. POST /api/licencias — Crear licencia (JSON o multipart) ─────
const postLicencia = async (req, res) => {
    try {
        const rut = req.user?.rut;
        if (!rut)
            return res.status(401).json({ success: false, message: 'No autorizado' });
        // Si se subió un archivo adjunto via multer
        let archivoUrl = null;
        let archivoPublicId = null;
        if (req.file) {
            const fileData = req.file;
            archivoUrl = fileData.path; // secure_url de Cloudinary
            archivoPublicId = fileData.filename; // public_id de Cloudinary
        }
        const nueva = await licenciasService.crearLicencia(rut, {
            fechaInicio: req.body.fechaInicio,
            fechaTermino: req.body.fechaTermino,
            motivo: req.body.motivo,
            archivoUrl,
            archivoPublicId,
        });
        return res.status(201).json(nueva);
    }
    catch (error) {
        console.error('🔥 ERROR EN CREAR LICENCIA:', error);
        return res.status(400).json({ success: false, error: error.message || 'Error al crear licencia' });
    }
};
exports.postLicencia = postLicencia;
// ─── 3. PATCH /api/licencias/:id — Editar licencia ──────────────────
const patchLicencia = async (req, res) => {
    try {
        const rut = req.user?.rut;
        if (!rut)
            return res.status(401).json({ success: false, message: 'No autorizado' });
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ success: false, message: 'ID inválido' });
        const actualizada = await licenciasService.editarLicencia(id, rut, req.body);
        return res.status(200).json(actualizada);
    }
    catch (error) {
        console.error('🔥 ERROR EN EDITAR LICENCIA:', error);
        return res.status(400).json({ success: false, error: error.message || 'Error al editar licencia' });
    }
};
exports.patchLicencia = patchLicencia;
// ─── 4. GET /api/licencias — Listar todas (gestión) ─────────────────
const getLicencias = async (req, res) => {
    try {
        const estado = req.query.estado;
        const list = await licenciasService.listarGestion(estado);
        return res.status(200).json(list);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET LICENCIAS GESTION:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener licencias' });
    }
};
exports.getLicencias = getLicencias;
// ─── 5. PATCH /api/licencias/:id/estado — Cambiar estado ────────────
const patchEstado = async (req, res) => {
    try {
        const rut = req.user?.rut;
        if (!rut)
            return res.status(401).json({ success: false, message: 'No autorizado' });
        const id = req.params.id;
        if (!id)
            return res.status(400).json({ success: false, message: 'ID inválido' });
        const { estado, observacionResolucion, fechaResolucion } = req.body;
        if (!estado)
            return res.status(400).json({ success: false, message: 'Estado requerido' });
        const actualizada = await licenciasService.cambiarEstado(id, rut, estado, observacionResolucion, fechaResolucion);
        return res.status(200).json(actualizada);
    }
    catch (error) {
        console.error('🔥 ERROR EN CAMBIAR ESTADO LICENCIA:', error);
        return res.status(400).json({ success: false, error: error.message || 'Error al cambiar estado' });
    }
};
exports.patchEstado = patchEstado;
// ─── 6. GET /api/licencias/activas — Activas en una fecha ───────────
const getLicenciasActivas = async (req, res) => {
    try {
        const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
        const list = await licenciasService.listarActivas(fecha);
        return res.status(200).json(list);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET LICENCIAS ACTIVAS:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener licencias activas' });
    }
};
exports.getLicenciasActivas = getLicenciasActivas;
// ─── 7. GET /api/licencias/resumen — Resumen diario ─────────────────
const getResumen = async (req, res) => {
    try {
        const fecha = req.query.fecha;
        const resumen = await licenciasService.obtenerResumen(fecha);
        return res.status(200).json(resumen);
    }
    catch (error) {
        console.error('🔥 ERROR EN GET RESUMEN LICENCIAS:', error);
        return res.status(500).json({ success: false, error: error.message || 'Error al obtener resumen' });
    }
};
exports.getResumen = getResumen;
