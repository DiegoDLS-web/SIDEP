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
exports.getEstadoImportacion = exports.getBodegas = exports.getExportData = exports.deleteAsignacionEpp = exports.postAsignarEpp = exports.patchAjustarCantidad = exports.getItems = void 0;
const inventarioItemsService = __importStar(require("../services/inventario-items.service"));
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
function enviarError(res, err, fallback) {
    const { statusCode, body } = (0, prisma_error_util_1.respuestaErrorJson)(err, fallback);
    res.status(statusCode).json(body);
}
function rutUsuario(req) {
    const user = req.user;
    return user?.rut?.trim() || null;
}
function filtrosDesdeQuery(req) {
    const out = {};
    if (req.query.q)
        out.q = String(req.query.q);
    if (req.query.bodega)
        out.bodega = String(req.query.bodega);
    if (req.query.categoria)
        out.categoria = String(req.query.categoria);
    if (req.query.voluntario)
        out.voluntario = String(req.query.voluntario);
    return out;
}
const getItems = async (req, res) => {
    try {
        const data = await inventarioItemsService.listarItems({
            ...filtrosDesdeQuery(req),
            page: req.query.page ? Number(req.query.page) : 1,
            pageSize: req.query.pageSize ? Number(req.query.pageSize) : 50,
        });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar inventario');
    }
};
exports.getItems = getItems;
const patchAjustarCantidad = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const delta = Number(req.body?.delta);
        if (!id || Number.isNaN(delta)) {
            return res.status(400).json({ success: false, message: 'ID y delta son obligatorios' });
        }
        const data = await inventarioItemsService.ajustarCantidadItem(id, delta, rutUsuario(req));
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al ajustar cantidad');
    }
};
exports.patchAjustarCantidad = patchAjustarCantidad;
const postAsignarEpp = async (req, res) => {
    try {
        const inventarioItemId = Number(req.params.id);
        const usuarioRut = String(req.body?.usuarioRut ?? '').trim();
        if (!inventarioItemId || !usuarioRut) {
            return res.status(400).json({ success: false, message: 'Ítem y voluntario son obligatorios' });
        }
        const data = await inventarioItemsService.asignarEppVoluntario({
            inventarioItemId,
            usuarioRut,
            cantidad: req.body?.cantidad ? Number(req.body.cantidad) : 1,
            observaciones: req.body?.observaciones ?? null,
        });
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al asignar EPP');
    }
};
exports.postAsignarEpp = postAsignarEpp;
const deleteAsignacionEpp = async (req, res) => {
    try {
        const asignacionId = String(req.params.asignacionId ?? '').trim();
        if (!asignacionId)
            return res.status(400).json({ success: false, message: 'ID de asignación requerido' });
        const data = await inventarioItemsService.quitarAsignacionEpp(asignacionId);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al quitar asignación');
    }
};
exports.deleteAsignacionEpp = deleteAsignacionEpp;
const getExportData = async (req, res) => {
    try {
        const data = await inventarioItemsService.listarParaExport(filtrosDesdeQuery(req));
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al exportar inventario');
    }
};
exports.getExportData = getExportData;
const getBodegas = async (_req, res) => {
    try {
        const data = await inventarioItemsService.listarBodegas();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar bodegas');
    }
};
exports.getBodegas = getBodegas;
const getEstadoImportacion = async (_req, res) => {
    try {
        const total = await inventarioItemsService.contarItems();
        res.status(200).json({ success: true, data: { total, importado: total > 0 } });
    }
    catch (error) {
        enviarError(res, error, 'Error al consultar inventario');
    }
};
exports.getEstadoImportacion = getEstadoImportacion;
