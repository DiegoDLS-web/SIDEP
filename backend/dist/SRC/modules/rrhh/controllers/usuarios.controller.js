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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.deleteUsuario = exports.patchUsuario = exports.postUsuario = exports.getUsuarioById = exports.getUsuariosPaginado = exports.getMetricas = exports.getUsuariosSelector = exports.getUsuarios = void 0;
const usuariosService = __importStar(require("../services/usuarios.service"));
const rrhh_service_1 = require("../services/rrhh.service");
const hash_1 = require("../../../utils/security/hash");
const prisma_1 = __importDefault(require("../../../prisma"));
const rut_util_1 = require("../../../utils/rut.util");
const async_handler_1 = require("../../../middlewares/async-handler");
const AppError_1 = require("../../../utils/errors/AppError");
exports.getUsuarios = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const list = await usuariosService.listarUsuarios();
    res.status(200).json(list);
});
exports.getUsuariosSelector = (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const list = await usuariosService.listarUsuariosSelector();
    res.status(200).json(list);
});
exports.getMetricas = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const metricas = await usuariosService.obtenerMetricasUsuarios();
    res.status(200).json(metricas);
});
exports.getUsuariosPaginado = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 9;
    const q = req.query.q;
    const estado = req.query.estado;
    const tipoVoluntario = req.query.tipoVoluntario;
    const cargo = req.query.cargo;
    const data = await usuariosService.listarUsuariosPaginado(page, pageSize, q, estado, tipoVoluntario, cargo);
    res.status(200).json(data);
});
exports.getUsuarioById = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const rut = req.params.rut;
    if (!rut) {
        throw new AppError_1.ValidationError(['RUT requerido']);
    }
    const usuario = await usuariosService.buscarUsuarioPorRut(rut);
    if (!usuario) {
        throw new AppError_1.NotFoundError('Usuario', rut);
    }
    res.status(200).json((0, rrhh_service_1.mapUsuarioToDto)(usuario));
});
function validarAsignacionRolAdmin(req, rol) {
    const rolSolicitado = String(rol ?? '').trim().toUpperCase();
    if (rolSolicitado !== 'ADMIN')
        return;
    const actorRol = String(req.dbUser?.rol?.codigo ?? '').trim().toUpperCase();
    if (actorRol !== 'ADMIN') {
        throw new AppError_1.ValidationError(['Solo un administrador puede asignar el rol ADMIN.']);
    }
}
exports.postUsuario = (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.body.rut || !(0, rut_util_1.validarRut)(req.body.rut)) {
        throw new AppError_1.ValidationError(['El RUT no es válido.']);
    }
    validarAsignacionRolAdmin(req, req.body.rol);
    const nuevo = await usuariosService.crearUsuario(req.body);
    res.status(201).json(nuevo);
});
exports.patchUsuario = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const rut = req.params.rut;
    if (!rut) {
        throw new AppError_1.ValidationError(['RUT requerido']);
    }
    if (req.body.rut !== undefined) {
        if (!req.body.rut || !(0, rut_util_1.validarRut)(req.body.rut)) {
            throw new AppError_1.ValidationError(['El RUT no es válido.']);
        }
    }
    if (req.body.rol !== undefined) {
        validarAsignacionRolAdmin(req, req.body.rol);
    }
    const actualizado = await usuariosService.actualizarUsuario(rut, req.body);
    res.status(200).json(actualizado);
});
exports.deleteUsuario = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const rut = req.params.rut;
    if (!rut) {
        throw new AppError_1.ValidationError(['RUT requerido']);
    }
    const result = await usuariosService.eliminarUsuario(rut);
    res.status(200).json({
        ok: true,
        softDeleted: result.softDeleted,
        message: result.message,
    });
});
exports.resetPassword = (0, async_handler_1.asyncHandler)(async (req, res) => {
    const rut = req.params.rut;
    if (!rut) {
        throw new AppError_1.ValidationError(['RUT requerido']);
    }
    const usuario = await usuariosService.buscarUsuarioPorRut(rut);
    if (!usuario) {
        throw new AppError_1.NotFoundError('Usuario', rut);
    }
    const cleanRut = usuario.rut.replace(/[^0-9kK]/g, '');
    const nuevoHash = await (0, hash_1.hashPassword)(cleanRut || 'sidep123');
    await prisma_1.default.usuario.update({
        where: { rut: usuario.rut },
        data: { passwordHash: nuevoHash },
    });
    res.status(200).json({
        success: true,
        message: `Contraseña restablecida al RUT (${cleanRut}). El usuario deberá cambiarla al ingresar.`,
    });
});
