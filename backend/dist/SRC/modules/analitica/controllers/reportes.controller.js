"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = exports.getAnaliticaOperacional = exports.getCuadroHonor = exports.getEmergencias = void 0;
const async_handler_1 = require("../../../middlewares/async-handler");
const emergencias_reporte_service_1 = require("../services/emergencias-reporte.service");
const cuadro_honor_service_1 = require("../services/cuadro-honor.service");
const analitica_operacional_service_1 = require("../services/analitica-operacional.service");
const dashboard_service_1 = require("../services/dashboard.service");
exports.getEmergencias = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { desde, hasta } = req.query;
    const data = await (0, emergencias_reporte_service_1.getEmergenciasReporte)(desde, hasta);
    res.status(200).json(data);
});
exports.getCuadroHonor = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : undefined;
    const mes = req.query.mes ? parseInt(req.query.mes, 10) : undefined;
    const data = await (0, cuadro_honor_service_1.getCuadroHonorReporte)(anio, mes);
    res.status(200).json(data);
});
exports.getAnaliticaOperacional = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : undefined;
    const mes = req.query.mes ? parseInt(req.query.mes, 10) : undefined;
    const data = await (0, analitica_operacional_service_1.getAnaliticaOperacionalReporte)(anio, mes);
    res.set('Cache-Control', 'private, max-age=60');
    res.status(200).json(data);
});
exports.getDashboard = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const anio = req.query.anio ? parseInt(req.query.anio, 10) : undefined;
    const clave = req.query.clave;
    const carroIdRaw = req.query.carroId;
    const carroId = carroIdRaw?.trim() || undefined;
    const data = await (0, dashboard_service_1.getDashboardResumen)(anio, clave, carroId);
    res.set('Cache-Control', 'private, max-age=60');
    res.status(200).json(data);
});
