"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.estadoMfa = exports.desactivarMfa = exports.activarMfa = exports.iniciarSetupMfa = exports.completarLoginMfa = exports.loginUsuario = exports.registrarUsuario = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const hash_1 = require("../../utils/security/hash");
const rut_util_1 = require("../../utils/rut.util");
const jwt_1 = require("../../utils/security/jwt");
const db_retry_util_1 = require("../../utils/db-retry.util");
const usuario_acceso_util_1 = require("../../utils/usuario-acceso.util");
const mfa_util_1 = require("../../utils/security/mfa.util");
async function buscarUsuarioPorRut(rut) {
    const normalizedRut = (0, rut_util_1.normalizarRut)(rut);
    const rutFormateado = (0, rut_util_1.formatearRutDesdeNormalizado)(normalizedRut);
    const rutTrim = rut.trim();
    return (0, db_retry_util_1.withDbRetry)(() => prisma_1.default.usuario.findFirst({
        where: {
            OR: [
                { rut: normalizedRut },
                ...(rutFormateado ? [{ rut: rutFormateado }] : []),
                ...(rutTrim && rutTrim !== normalizedRut ? [{ rut: rutTrim }] : []),
            ],
        },
        include: { rol: true, estadoVoluntario: true },
    }));
}
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
    const usuario = await buscarUsuarioPorRut(rut);
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
    const rolCodigo = usuario.rol?.codigo ?? '';
    const mfaRequerido = usuario.mfaEnabled === 1 && Boolean(usuario.mfaSecret) && rolCodigo === 'ADMIN';
    if (mfaRequerido) {
        return { kind: 'mfa', mfaToken: (0, mfa_util_1.generarMfaPendingToken)(usuario.rut), usuario };
    }
    const token = (0, jwt_1.generateToken)({ rut: usuario.rut, tv: usuario.tokenVersion ?? 0 });
    return { kind: 'ok', token, usuario };
};
exports.loginUsuario = loginUsuario;
const completarLoginMfa = async (mfaToken, code) => {
    const pending = (0, mfa_util_1.verificarMfaPendingToken)(mfaToken);
    if (!pending) {
        throw new Error('Sesión MFA expirada. Inicia sesión nuevamente.');
    }
    const usuario = await prisma_1.default.usuario.findUnique({
        where: { rut: pending.rut },
        include: { rol: true, estadoVoluntario: true },
    });
    if (!usuario || usuario.mfaEnabled !== 1 || !usuario.mfaSecret) {
        throw new Error('MFA no configurado para esta cuenta.');
    }
    if (!(0, mfa_util_1.verificarCodigoMfa)(usuario.mfaSecret, code)) {
        throw new Error('Código MFA inválido.');
    }
    if (!(0, usuario_acceso_util_1.puedeAccederApp)(usuario)) {
        const err = new Error((0, usuario_acceso_util_1.mensajeAccesoDenegado)(usuario));
        err.codigo = usuario_acceso_util_1.CODIGO_ACCESO_USUARIO_INACTIVO;
        throw err;
    }
    const token = (0, jwt_1.generateToken)({ rut: usuario.rut, tv: usuario.tokenVersion ?? 0 });
    return { token, usuario };
};
exports.completarLoginMfa = completarLoginMfa;
const iniciarSetupMfa = async (rut) => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { rut }, include: { rol: true } });
    if (!usuario || usuario.rol?.codigo !== 'ADMIN') {
        throw new Error('MFA solo disponible para administradores.');
    }
    const secret = (0, mfa_util_1.generarSecretoMfa)();
    await prisma_1.default.usuario.update({
        where: { rut },
        data: { mfaSecret: secret, mfaEnabled: 0 },
    });
    return {
        secret,
        otpauthUrl: (0, mfa_util_1.uriMfaOtpauth)(usuario.email, secret),
    };
};
exports.iniciarSetupMfa = iniciarSetupMfa;
const activarMfa = async (rut, code) => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { rut } });
    if (!usuario?.mfaSecret) {
        throw new Error('Primero inicia la configuración MFA.');
    }
    if (!(0, mfa_util_1.verificarCodigoMfa)(usuario.mfaSecret, code)) {
        throw new Error('Código MFA inválido.');
    }
    await prisma_1.default.usuario.update({
        where: { rut },
        data: { mfaEnabled: 1 },
    });
    return { ok: true };
};
exports.activarMfa = activarMfa;
const desactivarMfa = async (rut, code) => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { rut } });
    if (!usuario?.mfaSecret || usuario.mfaEnabled !== 1) {
        throw new Error('MFA no está activo.');
    }
    if (!(0, mfa_util_1.verificarCodigoMfa)(usuario.mfaSecret, code)) {
        throw new Error('Código MFA inválido.');
    }
    await prisma_1.default.usuario.update({
        where: { rut },
        data: { mfaEnabled: 0, mfaSecret: null },
    });
    return { ok: true };
};
exports.desactivarMfa = desactivarMfa;
const estadoMfa = async (rut) => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { rut }, include: { rol: true } });
    if (!usuario)
        return { habilitado: false, disponible: false };
    return {
        habilitado: usuario.mfaEnabled === 1,
        disponible: usuario.rol?.codigo === 'ADMIN',
    };
};
exports.estadoMfa = estadoMfa;
