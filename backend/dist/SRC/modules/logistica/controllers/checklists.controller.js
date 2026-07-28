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
exports.obtenerPlantillas = exports.patchEstadoEjecucion = exports.getDetalleEjecucion = exports.editPlantilla = exports.getHistorialBatch = exports.getHistorial = exports.addEjecucion = exports.addPlantilla = void 0;
const checklistsService = __importStar(require("../services/checklists.service"));
const prisma_1 = require("../../../prisma");
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
function enviarError(res, err, fallback) {
    const { statusCode, body } = (0, prisma_error_util_1.respuestaErrorJson)(err, fallback);
    res.status(statusCode).json(body);
}
const addPlantilla = async (req, res) => {
    try {
        const plantilla = await checklistsService.crearPlantilla(req.body);
        res.status(201).json({ success: true, data: plantilla });
    }
    catch (error) {
        enviarError(res, error, 'Error al crear plantilla de checklist');
    }
};
exports.addPlantilla = addPlantilla;
const addEjecucion = async (req, res) => {
    try {
        const { carroId, revisorRut, plantillaId, resultadosMateriales, entidadTipo, firmaOficial, firmaInspector, } = req.body;
        if (!carroId || !revisorRut) {
            return res.status(400).json({ success: false, message: 'Faltan carroId o revisorRut' });
        }
        const checklist = await checklistsService.registrarEjecucion(String(carroId), String(revisorRut), plantillaId ? String(plantillaId) : undefined, resultadosMateriales ?? {}, {
            entidadTipo: entidadTipo ? String(entidadTipo) : 'CARRO',
            firmaOficial: firmaOficial ?? null,
            firmaInspector: firmaInspector ?? null,
        });
        res.status(201).json({ success: true, data: checklist });
    }
    catch (error) {
        enviarError(res, error, 'Error al registrar checklist');
    }
};
exports.addEjecucion = addEjecucion;
const getHistorial = async (req, res) => {
    try {
        const carroId = req.query.carroId;
        const entidadTipo = req.query.entidadTipo;
        const excluirBorradores = req.query.excluirBorradores !== '0';
        const historial = await checklistsService.obtenerHistorial(carroId, {
            ...(entidadTipo ? { entidadTipo } : {}),
            excluirBorradores,
        });
        res.status(200).json({ success: true, data: historial });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener historial' });
    }
};
exports.getHistorial = getHistorial;
const getHistorialBatch = async (req, res) => {
    try {
        const raw = String(req.query.carroIds ?? '').trim();
        const carroIds = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        const entidadTipo = req.query.entidadTipo;
        const data = await checklistsService.obtenerHistorialBatch(carroIds, {
            ...(entidadTipo ? { entidadTipo } : {}),
            excluirBorradores: req.query.excluirBorradores !== '0',
        });
        res.status(200).json({ success: true, data });
    }
    catch {
        res.status(500).json({ success: false, message: 'Error al obtener historial batch' });
    }
};
exports.getHistorialBatch = getHistorialBatch;
const editPlantilla = async (req, res) => {
    try {
        // Añadimos "as string"
        const plantilla = await checklistsService.actualizarPlantilla(req.params.id, req.body);
        res.status(200).json({ success: true, data: plantilla });
    }
    catch (error) {
        enviarError(res, error, 'Error al actualizar plantilla de checklist');
    }
};
exports.editPlantilla = editPlantilla;
const getDetalleEjecucion = async (req, res) => {
    try {
        const detalle = await checklistsService.obtenerDetalleEjecucion(req.params.id);
        res.status(200).json({ success: true, data: detalle });
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener detalle de checklist');
    }
};
exports.getDetalleEjecucion = getDetalleEjecucion;
const patchEstadoEjecucion = async (req, res) => {
    try {
        const { estadoChecklist, motivo, fechaEfectiva } = req.body ?? {};
        if (!estadoChecklist) {
            return res.status(400).json({ success: false, message: 'Falta estadoChecklist' });
        }
        const actorRut = req.user?.rut;
        const opts = {
            motivo: String(motivo ?? ''),
            fechaEfectiva: String(fechaEfectiva ?? ''),
        };
        if (actorRut)
            opts.actorRut = actorRut;
        const { ejecucion, estadoAnterior, estadoNuevo, motivo: motivoOk, fechaEfectiva: fechaOk } = await checklistsService.actualizarEstadoEjecucion(String(req.params.id), String(estadoChecklist), opts);
        res.status(200).json({
            success: true,
            data: ejecucion,
            estadoAnterior,
            estadoNuevo,
            motivo: motivoOk,
            fechaEfectiva: fechaOk,
        });
    }
    catch (error) {
        res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};
exports.patchEstadoEjecucion = patchEstadoEjecucion;
const obtenerPlantillas = async (req, res) => {
    try {
        const plantillas = await prisma_1.prisma.checklistPlantilla.findMany({
            where: { activo: 1 }
        });
        res.status(200).json({ success: true, data: plantillas });
    }
    catch (error) {
        console.error("Error al obtener plantillas:", error);
        enviarError(res, error, 'Error al obtener plantillas');
    }
};
exports.obtenerPlantillas = obtenerPlantillas;
