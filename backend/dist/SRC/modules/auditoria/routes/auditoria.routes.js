"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditoria_controller_1 = require("../controllers/auditoria.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Solo los administradores pueden consultar el registro de auditoría
router.get('/', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN'), auditoria_controller_1.getAuditoria);
router.get('/exportar', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN'), auditoria_controller_1.exportarAuditoria);
exports.default = router;
