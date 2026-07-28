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
exports.getStockPorNombres = exports.getEppPorUsuario = exports.getMatrizEpp = exports.getAlertasInventario = exports.postMovimientoItem = exports.getMovimientosItems = exports.getExportPdf = exports.getExportExcel = exports.postImportacionInventario = exports.getEstadoImportacion = exports.getBodegas = exports.getExportData = exports.deleteAsignacionEpp = exports.postAsignarEpp = exports.patchMetaItem = exports.patchAjustarCantidad = exports.postCrearItem = exports.getItems = void 0;
const inventarioItemsService = __importStar(require("../services/inventario-items.service"));
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
const inventario_export_util_1 = require("../../../utils/export/inventario-export.util");
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
const postCrearItem = async (req, res) => {
    try {
        const nombre = String(req.body?.nombre ?? '').trim();
        if (!nombre) {
            return res.status(400).json({ success: false, message: 'El nombre del ítem es obligatorio' });
        }
        const data = await inventarioItemsService.crearItemInstitucional({
            nombre,
            cantidad: Number(req.body?.cantidad ?? 1),
            tipoInventario: String(req.body?.tipoInventario ?? 'OTRO'),
            ...(req.body?.bodegaCodigo ? { bodegaCodigo: String(req.body.bodegaCodigo) } : {}),
            marca: req.body?.marca ?? null,
            modelo: req.body?.modelo ?? null,
            estadoFisico: req.body?.estadoFisico ?? null,
            valor: req.body?.valor != null ? Number(req.body.valor) : null,
            observaciones: req.body?.observaciones ?? null,
            talla: req.body?.talla ?? null,
            categoria: req.body?.categoria ?? null,
        });
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al registrar material');
    }
};
exports.postCrearItem = postCrearItem;
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
const patchMetaItem = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id)
            return res.status(400).json({ success: false, message: 'ID obligatorio' });
        const data = await inventarioItemsService.actualizarMetaItem(id, {
            talla: req.body?.talla !== undefined ? req.body.talla : undefined,
        });
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al actualizar ítem');
    }
};
exports.patchMetaItem = patchMetaItem;
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
const postImportacionInventario = async (req, res) => {
    try {
        const file = req.file;
        if (!file?.buffer) {
            return res.status(400).json({ success: false, message: 'Archivo Excel (.xlsx) requerido' });
        }
        const permitirDuplicados = req.body?.permitirDuplicados === 'true' || req.body?.permitirDuplicados === true;
        const data = await inventarioItemsService.importarDesdeExcelBuffer(file.buffer, { permitirDuplicados });
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al importar inventario');
    }
};
exports.postImportacionInventario = postImportacionInventario;
const getExportExcel = async (req, res) => {
    try {
        const items = await inventarioItemsService.listarParaExport(filtrosDesdeQuery(req));
        const bodega = req.query.bodega ? String(req.query.bodega) : 'completo';
        const buffer = await (0, inventario_export_util_1.generarExcelInventario)(items, `Inventario ${bodega}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=inventario_${bodega}_${Date.now()}.xlsx`);
        res.status(200).send(buffer);
    }
    catch (error) {
        enviarError(res, error, 'Error al exportar Excel');
    }
};
exports.getExportExcel = getExportExcel;
const getExportPdf = async (req, res) => {
    try {
        const items = await inventarioItemsService.listarParaExport(filtrosDesdeQuery(req));
        const bodega = req.query.bodega ? String(req.query.bodega) : 'completo';
        const buffer = await (0, inventario_export_util_1.generarPdfInventario)(items, `Inventario SIDEP — ${bodega}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=inventario_${bodega}_${Date.now()}.pdf`);
        res.status(200).send(buffer);
    }
    catch (error) {
        enviarError(res, error, 'Error al exportar PDF');
    }
};
exports.getExportPdf = getExportPdf;
const getMovimientosItems = async (req, res) => {
    try {
        const bodega = req.query.bodega ? String(req.query.bodega) : undefined;
        const inventarioItemIdRaw = req.query.inventarioItemId ? Number(req.query.inventarioItemId) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : 30;
        const filtros = { limit };
        if (bodega)
            filtros.bodega = bodega;
        if (inventarioItemIdRaw && !Number.isNaN(inventarioItemIdRaw)) {
            filtros.inventarioItemId = inventarioItemIdRaw;
        }
        const data = await inventarioItemsService.listarMovimientosInventario(filtros);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar movimientos');
    }
};
exports.getMovimientosItems = getMovimientosItems;
const postMovimientoItem = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const tipo = String(req.body?.tipo ?? '').trim().toUpperCase();
        const cantidad = Number(req.body?.cantidad);
        if (!id || !['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo) || Number.isNaN(cantidad)) {
            return res.status(400).json({ success: false, message: 'Ítem, tipo y cantidad son obligatorios' });
        }
        const data = await inventarioItemsService.registrarMovimientoItem(id, { tipo: tipo, cantidad, motivo: req.body?.motivo ?? null }, rutUsuario(req));
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al registrar movimiento');
    }
};
exports.postMovimientoItem = postMovimientoItem;
const getAlertasInventario = async (req, res) => {
    try {
        const bodega = req.query.bodega ? String(req.query.bodega) : undefined;
        const data = await inventarioItemsService.obtenerAlertasInventario(bodega);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener alertas');
    }
};
exports.getAlertasInventario = getAlertasInventario;
const getMatrizEpp = async (req, res) => {
    try {
        const data = await inventarioItemsService.listarMatrizEpp(filtrosDesdeQuery(req));
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener matriz EPP');
    }
};
exports.getMatrizEpp = getMatrizEpp;
const getEppPorUsuario = async (req, res) => {
    try {
        const rut = String(req.params.rut ?? '').trim();
        if (!rut)
            return res.status(400).json({ success: false, message: 'RUT requerido' });
        const solicitante = req.user;
        const dbUser = req.dbUser;
        const rol = dbUser?.rol?.codigo?.trim().toUpperCase() ?? '';
        const esOficial = ['ADMIN', 'CAPITAN', 'TENIENTE'].includes(rol);
        if (solicitante?.rut !== rut && !esOficial) {
            return res.status(403).json({ success: false, message: 'No autorizado' });
        }
        const data = await inventarioItemsService.listarEppPorUsuario(rut);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar EPP del usuario');
    }
};
exports.getEppPorUsuario = getEppPorUsuario;
const getStockPorNombres = async (req, res) => {
    try {
        const raw = String(req.query.nombres ?? '');
        const nombres = raw.split('|').map((n) => n.trim()).filter(Boolean);
        if (!nombres.length) {
            return res.status(400).json({ success: false, message: 'Indica nombres separados por |' });
        }
        const data = await inventarioItemsService.buscarStockBodegaPorNombres(nombres);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al consultar stock');
    }
};
exports.getStockPorNombres = getStockPorNombres;
