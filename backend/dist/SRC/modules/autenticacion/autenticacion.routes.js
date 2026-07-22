"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const autenticacion_controller_1 = require("./autenticacion.controller");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_1 = require("../../middlewares/validate");
const auth_dto_1 = require("./dtos/auth.dto");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Demasiados intentos. Intente de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const recoverLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const router = (0, express_1.Router)();
router.post('/login', loginLimiter, autenticacion_controller_1.login);
/** Registro público deshabilitado: usar POST /api/usuarios con sesión de oficialidad. */
router.post('/register', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), (0, validate_1.validate)(auth_dto_1.registerDto), autenticacion_controller_1.register);
router.post('/recuperar-password', recoverLimiter, autenticacion_controller_1.recuperarPassword);
router.post('/restablecer-password', recoverLimiter, autenticacion_controller_1.restablecerPassword);
router.get('/me', auth_middleware_1.protect, autenticacion_controller_1.me);
router.post('/logout', auth_middleware_1.protect, autenticacion_controller_1.logout);
exports.default = router;
