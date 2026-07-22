"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const licencias_controller_1 = require("../controllers/licencias.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const storage_1 = require("../../../shared/storage");
const router = (0, express_1.Router)();
// ── Rutas que cualquier usuario autenticado puede usar ──────────────
// Mis licencias propias
router.get('/mis', auth_middleware_1.protect, licencias_controller_1.getMisLicencias);
// Crear solicitud (multipart para adjunto opcional)
router.post('/', auth_middleware_1.protect, storage_1.uploadAdjuntoLicencia.single('adjunto'), licencias_controller_1.postLicencia);
// Editar una licencia propia (solo PENDIENTE)
router.patch('/:id', auth_middleware_1.protect, licencias_controller_1.patchLicencia);
// ── Rutas de gestión (oficialidad) ──────────────────────────────────
// Listar todas las licencias
router.get('/', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), licencias_controller_1.getLicencias);
// Cambiar estado (aprobar/rechazar/anular)
router.patch('/:id/estado', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), licencias_controller_1.patchEstado);
// Licencias activas en una fecha
router.get('/activas', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), licencias_controller_1.getLicenciasActivas);
// Resumen diario
router.get('/resumen', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), licencias_controller_1.getResumen);
exports.default = router;
