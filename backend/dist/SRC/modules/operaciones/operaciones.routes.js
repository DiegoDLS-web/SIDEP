"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const partes_routes_1 = __importDefault(require("./routes/partes.routes"));
const asistencias_controller_1 = require("./controllers/asistencias.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use('/partes', auth_middleware_1.protect, partes_routes_1.default);
router.get('/asistencia', auth_middleware_1.protect, asistencias_controller_1.getAsistenciasVoluntario);
router.post('/asistencia', auth_middleware_1.protect, asistencias_controller_1.postAsistenciaDirecta);
router.delete('/asistencia/:asistenciaId', auth_middleware_1.protect, asistencias_controller_1.deleteAsistenciaDirecta);
router.get('/asistencias', auth_middleware_1.protect, asistencias_controller_1.getAsistenciasVoluntario);
router.post('/partes/:parteId/asistencias', auth_middleware_1.protect, asistencias_controller_1.postAsistencia);
router.delete('/partes/:parteId/asistencias/:asistenciaId', auth_middleware_1.protect, asistencias_controller_1.deleteAsistencia);
exports.default = router;
