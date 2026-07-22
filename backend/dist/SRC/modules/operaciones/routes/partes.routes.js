"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const partes_controller_1 = require("../controllers/partes.controller");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const validate_1 = require("../../../middlewares/validate");
const parte_dto_1 = require("../dtos/parte.dto");
const router = (0, express_1.Router)();
/** Roles operativos que pueden registrar y editar partes de emergencia. */
const rolesOperacionPartes = (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE', 'VOLUNTARIOS');
router.get('/pagina', partes_controller_1.obtenerPagina);
router.get('/metricas', partes_controller_1.obtenerMetricas);
router.get('/', partes_controller_1.obtenerPartes);
router.post('/', rolesOperacionPartes, (0, validate_1.validate)(parte_dto_1.crearParteDto), partes_controller_1.crearParte);
router.get('/:id', partes_controller_1.obtenerPartePorId);
router.patch('/:id', rolesOperacionPartes, (0, validate_1.validate)(parte_dto_1.actualizarParteDto), partes_controller_1.actualizarParte);
router.delete('/:id', (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), partes_controller_1.anularParte);
exports.default = router;
