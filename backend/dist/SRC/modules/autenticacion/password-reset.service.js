"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.solicitarRecuperacionPassword = solicitarRecuperacionPassword;
exports.restablecerPasswordConToken = restablecerPasswordConToken;
const crypto_1 = require("crypto");
const prisma_1 = __importDefault(require("../../prisma"));
const hash_1 = require("../../utils/security/hash");
const email_service_1 = require("../../utils/email/email.service");
const usuario_acceso_util_1 = require("../../utils/usuario-acceso.util");
const EXPIRY_MS = 2 * 60 * 60 * 1000;
async function solicitarRecuperacionPassword(email) {
    const emailNorm = String(email ?? '').trim().toLowerCase();
    if (!emailNorm) {
        return { ok: false, codigo: 'EMAIL_NO_REGISTRADO' };
    }
    const usuario = await prisma_1.default.usuario.findFirst({
        where: {
            email: { equals: emailNorm, mode: 'insensitive' },
            activo: 1,
        },
        include: { estadoVoluntario: true, rol: true },
    });
    if (!usuario) {
        return { ok: false, codigo: 'EMAIL_NO_REGISTRADO' };
    }
    if (!(0, usuario_acceso_util_1.puedeAccederApp)(usuario)) {
        return { ok: false, codigo: 'USUARIO_SIN_ACCESO' };
    }
    if (!(0, email_service_1.correoSmtpDisponible)()) {
        return { ok: false, codigo: 'SMTP_NO_CONFIGURADO' };
    }
    await prisma_1.default.passwordResetToken.deleteMany({ where: { usuarioRut: usuario.rut } });
    const token = (0, crypto_1.randomBytes)(32).toString('hex');
    const expiresAt = new Date(Date.now() + EXPIRY_MS);
    await prisma_1.default.passwordResetToken.create({
        data: {
            token,
            usuarioRut: usuario.rut,
            expiresAt,
        },
    });
    const baseUrl = (process.env.APP_PUBLIC_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        'http://localhost:4200').replace(/\/$/, '');
    if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(baseUrl)) {
        console.error('[SIDEP] APP_PUBLIC_URL apunta a localhost en producción; los enlaces de recuperación de contraseña serán incorrectos.');
    }
    const link = `${baseUrl}/restablecer-password/${token}`;
    try {
        await (0, email_service_1.enviarCorreoRecuperacionPassword)({
            to: usuario.email,
            nombre: usuario.nombres,
            link,
        });
    }
    catch (err) {
        console.error('[SIDEP] Error enviando correo de recuperación:', err);
        await prisma_1.default.passwordResetToken.deleteMany({ where: { token } });
        return { ok: false, codigo: 'ERROR_ENVIO' };
    }
    return { ok: true };
}
async function restablecerPasswordConToken(token, password) {
    const tokenNorm = String(token ?? '').trim();
    if (!tokenNorm)
        throw new Error('Enlace inválido o expirado.');
    const nueva = String(password ?? '');
    if (nueva.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    const row = await prisma_1.default.passwordResetToken.findUnique({ where: { token: tokenNorm } });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
        throw new Error('Enlace inválido o expirado.');
    }
    const hash = await (0, hash_1.hashPassword)(nueva);
    await prisma_1.default.$transaction([
        prisma_1.default.usuario.update({
            where: { rut: row.usuarioRut },
            data: { passwordHash: hash },
        }),
        prisma_1.default.passwordResetToken.update({
            where: { id: row.id },
            data: { usedAt: new Date() },
        }),
    ]);
}
