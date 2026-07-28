"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarPasswordProvisional = generarPasswordProvisional;
exports.validarPasswordNueva = validarPasswordNueva;
const crypto_1 = require("crypto");
const rut_util_1 = require("../rut.util");
/** Contraseña provisional legible (sin caracteres ambiguos 0/O/1/l). */
function generarPasswordProvisional(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = (0, crypto_1.randomBytes)(length);
    let out = '';
    for (let i = 0; i < length; i++) {
        out += chars[bytes[i] % chars.length];
    }
    return out;
}
function validarPasswordNueva(password, rut) {
    const p = String(password ?? '');
    if (p.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
        return 'La contraseña debe incluir letras y números.';
    }
    if (rut) {
        const rutNorm = (0, rut_util_1.normalizarRut)(rut).replace(/[^0-9kK]/gi, '').toLowerCase();
        const pClean = p.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
        if (rutNorm && (pClean === rutNorm || pClean.includes(rutNorm) || rutNorm.includes(pClean))) {
            return 'La contraseña no puede ser igual ni contener el RUT.';
        }
    }
    return null;
}
