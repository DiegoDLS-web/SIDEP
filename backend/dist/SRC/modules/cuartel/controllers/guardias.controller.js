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
exports.deleteGuardia = exports.patchGuardia = exports.postGuardia = exports.getGuardia = exports.getResumenGuardias = exports.getGuardias = exports.getCalendarioGuardias = void 0;
const async_handler_1 = require("../../../middlewares/async-handler");
const guardiasService = __importStar(require("../services/guardias.service"));
function rutUsuario(req) {
    const rut = req.user?.rut;
    if (!rut)
        throw new Error('No autorizado');
    return rut;
}
exports.getCalendarioGuardias = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const anio = Number(req.query.anio);
    const mes = Number(req.query.mes);
    const data = await guardiasService.calendarioMensualGuardias(anio, mes);
    res.json(data);
});
exports.getGuardias = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const filtros = {};
    if (req.query.desde)
        filtros.desde = String(req.query.desde);
    if (req.query.hasta)
        filtros.hasta = String(req.query.hasta);
    if (req.query.grupo)
        filtros.grupo = String(req.query.grupo);
    const data = await guardiasService.listarGuardias(filtros);
    res.json(data);
});
exports.getResumenGuardias = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const fecha = req.query.fecha || new Date().toISOString().slice(0, 10);
    const data = await guardiasService.resumenGuardias(fecha);
    res.json(data);
});
exports.getGuardia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = await guardiasService.obtenerGuardia(String(req.params.id));
    res.json(data);
});
exports.postGuardia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = await guardiasService.crearGuardia(rutUsuario(req), req.body);
    res.status(201).json(data);
});
exports.patchGuardia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const data = await guardiasService.actualizarGuardia(String(req.params.id), req.body);
    res.json(data);
});
exports.deleteGuardia = (0, async_handler_1.asyncHandler)(async (req, res) => {
    await guardiasService.eliminarGuardia(String(req.params.id));
    res.json({ ok: true });
});
