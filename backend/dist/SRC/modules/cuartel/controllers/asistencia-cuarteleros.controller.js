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
exports.deleteAsistencia = exports.patchAsistencia = exports.postAsistencia = exports.getResumenAsistencia = exports.getAsistencias = exports.postCeldaAsistencia = exports.getPlanillaAsistencia = void 0;
const async_handler_1 = require("../../../middlewares/async-handler");
const asistenciaService = __importStar(require("../services/asistencia-cuarteleros.service"));
function rutUsuario(req) {
    const rut = req.user?.rut;
    if (!rut)
        throw new Error('No autorizado');
    return rut;
}
exports.getPlanillaAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const desde = String(req.query.desde ?? '');
    const hasta = String(req.query.hasta ?? '');
    const filtros = { desde, hasta };
    if (req.query.grupo)
        filtros.grupo = String(req.query.grupo);
    const data = await asistenciaService.obtenerPlanillaAsistencia(filtros);
    res.json(data);
});
exports.postCeldaAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = await asistenciaService.upsertCeldaAsistencia(rutUsuario(req), req.body);
    res.status(200).json(data);
});
exports.getAsistencias = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const filtros = {};
    if (req.query.fecha)
        filtros.fecha = String(req.query.fecha);
    if (req.query.desde)
        filtros.desde = String(req.query.desde);
    if (req.query.hasta)
        filtros.hasta = String(req.query.hasta);
    if (req.query.grupo)
        filtros.grupo = String(req.query.grupo);
    if (req.query.presente === '1')
        filtros.presente = true;
    else if (req.query.presente === '0')
        filtros.presente = false;
    if (req.query.page)
        filtros.page = Number(req.query.page);
    if (req.query.pageSize)
        filtros.pageSize = Number(req.query.pageSize);
    const data = await asistenciaService.listarAsistencias(filtros);
    res.json(data);
});
exports.getResumenAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const data = await asistenciaService.resumenAsistencia(fecha);
    res.json(data);
});
exports.postAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = await asistenciaService.registrarAsistencia(rutUsuario(req), req.body);
    res.status(201).json(data);
});
exports.patchAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = await asistenciaService.actualizarAsistencia(String(req.params.id), rutUsuario(req), req.body);
    res.json(data);
});
exports.deleteAsistencia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    await asistenciaService.eliminarAsistencia(String(req.params.id));
    res.json({ ok: true });
});
