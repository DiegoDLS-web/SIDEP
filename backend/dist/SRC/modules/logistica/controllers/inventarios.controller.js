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
exports.postMovimientoBodega = exports.getMovimientosBodega = exports.getInventarioCarros = exports.getStockBodega = exports.getResumen = void 0;
const inventariosService = __importStar(require("../services/inventarios.service"));
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
function enviarError(res, err, fallback) {
    const { statusCode, body } = (0, prisma_error_util_1.respuestaErrorJson)(err, fallback);
    res.status(statusCode).json(body);
}
function rutUsuario(req) {
    const user = req.user;
    return user?.rut?.trim() || null;
}
const getResumen = async (_req, res) => {
    try {
        const data = await inventariosService.obtenerResumen();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al obtener resumen de inventarios');
    }
};
exports.getResumen = getResumen;
const getStockBodega = async (_req, res) => {
    try {
        const data = await inventariosService.listarStockBodega();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar stock de bodega');
    }
};
exports.getStockBodega = getStockBodega;
const getInventarioCarros = async (_req, res) => {
    try {
        const data = await inventariosService.listarInventarioCarros();
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar inventario por carro');
    }
};
exports.getInventarioCarros = getInventarioCarros;
const getMovimientosBodega = async (req, res) => {
    try {
        const materialIdRaw = req.query.materialId ? Number(req.query.materialId) : NaN;
        const opts = { limit: 100 };
        if (!Number.isNaN(materialIdRaw) && materialIdRaw > 0) {
            opts.materialId = materialIdRaw;
        }
        const data = await inventariosService.listarMovimientos(opts);
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al listar movimientos de bodega');
    }
};
exports.getMovimientosBodega = getMovimientosBodega;
const postMovimientoBodega = async (req, res) => {
    try {
        const { materialId, tipo, cantidad, motivo } = req.body ?? {};
        if (!materialId || !tipo || cantidad === undefined) {
            return res.status(400).json({ success: false, message: 'materialId, tipo y cantidad son obligatorios' });
        }
        const data = await inventariosService.registrarMovimientoBodega({
            materialId: Number(materialId),
            tipo: String(tipo).toUpperCase(),
            cantidad: Number(cantidad),
            motivo: motivo ?? null,
            usuarioRut: rutUsuario(req),
        });
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        enviarError(res, error, 'Error al registrar movimiento de bodega');
    }
};
exports.postMovimientoBodega = postMovimientoBodega;
