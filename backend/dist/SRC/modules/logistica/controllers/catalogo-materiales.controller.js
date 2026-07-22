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
exports.patchMaterialActivo = exports.patchMaterial = exports.postMaterial = exports.getMateriales = void 0;
const catalogoService = __importStar(require("../services/catalogo-materiales.service"));
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
function enviarError(res, err, fallback) {
    const { statusCode, body } = (0, prisma_error_util_1.respuestaErrorJson)(err, fallback);
    res.status(statusCode).json(body);
}
const getMateriales = async (_req, res) => {
    try {
        const incluirInactivos = _req.query.incluirInactivos === '1';
        const data = await catalogoService.listarMateriales({ incluirInactivos });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar materiales');
    }
};
exports.getMateriales = getMateriales;
const postMaterial = async (req, res) => {
    try {
        const data = await catalogoService.crearMaterial(req.body ?? {});
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al crear material');
    }
};
exports.postMaterial = postMaterial;
const patchMaterial = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id)
            return res.status(400).json({ success: false, message: 'ID inválido' });
        const data = await catalogoService.actualizarMaterial(id, req.body ?? {});
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al actualizar material');
    }
};
exports.patchMaterial = patchMaterial;
const patchMaterialActivo = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id)
            return res.status(400).json({ success: false, message: 'ID inválido' });
        const activo = req.body?.activo !== false;
        const data = await catalogoService.cambiarActivoMaterial(id, activo);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al cambiar estado del material');
    }
};
exports.patchMaterialActivo = patchMaterialActivo;
