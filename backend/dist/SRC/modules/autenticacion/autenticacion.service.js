"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUsuario = exports.registrarUsuario = void 0;
const prisma_1 = __importDefault(require("../../prisma")); // Asegúrate que esta ruta importe tu cliente de prisma
const hash_1 = require("../../utils/security/hash");
const rut_util_1 = require("../../utils/rut.util");
const jwt_1 = require("../../utils/security/jwt");
const db_retry_util_1 = require("../../utils/db-retry.util");
const usuario_acceso_util_1 = require("../../utils/usuario-acceso.util");
// 1. Registro
const registrarUsuario = async (datos) => {
    const { rut, nombres, apellidoPaterno, apellidoMaterno, email, password } = datos;
    if (!rut || !(0, rut_util_1.validarRut)(rut)) {
        throw new Error('El RUT no es válido.');
    }
    const normalizedRut = (0, rut_util_1.normalizarRut)(rut);
    const rolVoluntario = await prisma_1.default.rolUsuario.findFirst({
        where: { codigo: 'VOLUNTARIOS', activo: 1 },
    });
    if (!rolVoluntario) {
        throw new Error('No hay rol VOLUNTARIOS activo en catálogo.');
    }
    const hashedPassword = await (0, hash_1.hashPassword)(password);
    return await prisma_1.default.usuario.create({
        data: {
            rut: normalizedRut,
            nombres,
            apellidoPaterno,
            apellidoMaterno,
            email,
            passwordHash: hashedPassword,
            rolId: rolVoluntario.id,
            activo: 1,
        },
    });
};
exports.registrarUsuario = registrarUsuario;
// 2. Login
const loginUsuario = async (rut, password) => {
    const normalizedRut = (0, rut_util_1.normalizarRut)(rut);
    const rutFormateado = (0, rut_util_1.formatearRutDesdeNormalizado)(normalizedRut);
    const rutTrim = rut.trim();
    // Buscamos por RUT (reintento si Neon está despertando)
    const usuario = await (0, db_retry_util_1.withDbRetry)(() => prisma_1.default.usuario.findFirst({
        where: {
            OR: [
                { rut: normalizedRut },
                ...(rutFormateado ? [{ rut: rutFormateado }] : []),
                ...(rutTrim && rutTrim !== normalizedRut ? [{ rut: rutTrim }] : []),
            ],
        },
        include: { rol: true, estadoVoluntario: true },
    }));
    if (!usuario) {
        throw new Error('Credenciales inválidas');
    }
    const isMatch = await (0, hash_1.comparePassword)(password, usuario.passwordHash);
    if (!isMatch) {
        throw new Error('Credenciales inválidas');
    }
    if (!(0, usuario_acceso_util_1.puedeAccederApp)(usuario)) {
        const err = new Error((0, usuario_acceso_util_1.mensajeAccesoDenegado)(usuario));
        err.codigo = usuario_acceso_util_1.CODIGO_ACCESO_USUARIO_INACTIVO;
        throw err;
    }
    const token = (0, jwt_1.generateToken)({ rut: usuario.rut });
    return { token, usuario };
};
exports.loginUsuario = loginUsuario;
