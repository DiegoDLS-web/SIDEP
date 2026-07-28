"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rrhh_controller_1 = require("../controllers/rrhh.controller");
const configuraciones_controller_1 = require("../controllers/configuraciones.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const storage_1 = require("../../../shared/storage");
const validate_1 = require("../../../middlewares/validate");
const auth_dto_1 = require("../../autenticacion/dtos/auth.dto");
const configuraciones_routes_1 = __importDefault(require("./configuraciones.routes"));
const router = (0, express_1.Router)();
// 1. Rutas generales de perfil
router.get('/mi-perfil', auth_middleware_1.protect, rrhh_controller_1.getMiPerfil);
router.patch('/mi-perfil', auth_middleware_1.protect, rrhh_controller_1.patchMiPerfil);
router.get('/mi-resumen-operativo', auth_middleware_1.protect, rrhh_controller_1.getMiResumenOperativo);
// 2. Rutas para subida directa de archivos (Multipart/Form-data) a Cloudinary
router.post('/mi-perfil/foto', auth_middleware_1.protect, storage_1.uploadImage.single('foto'), rrhh_controller_1.subirFotoPerfil);
router.post('/licencias/archivo', auth_middleware_1.protect, storage_1.uploadPdf.single('documento'), rrhh_controller_1.subirArchivoLicencia);
// 3. Cambio de contraseña propia
router.patch('/mi-perfil/password', auth_middleware_1.protect, (0, validate_1.validate)(auth_dto_1.cambiarPasswordDto), rrhh_controller_1.cambiarMiPassword);
// 3b. Configuración operativa (sin datos sensibles de administración)
router.get('/configuracion-operativa', auth_middleware_1.protect, configuraciones_controller_1.obtenerConfiguracionOperativa);
// 4. Configuraciones Globales del Sistema
router.use('/configuraciones', configuraciones_routes_1.default);
exports.default = router;
