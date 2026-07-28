"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarSecretoMfa = generarSecretoMfa;
exports.uriMfaOtpauth = uriMfaOtpauth;
exports.verificarCodigoMfa = verificarCodigoMfa;
exports.generarMfaPendingToken = generarMfaPendingToken;
exports.verificarMfaPendingToken = verificarMfaPendingToken;
const otplib_1 = require("otplib");
const jwt_1 = require("./jwt");
function generarSecretoMfa() {
    return (0, otplib_1.generateSecret)();
}
function uriMfaOtpauth(email, secret) {
    return (0, otplib_1.generateURI)({ issuer: 'SIDEP', label: email, secret });
}
function verificarCodigoMfa(secret, code) {
    const normalized = String(code ?? '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(normalized))
        return false;
    const result = (0, otplib_1.verifySync)({ token: normalized, secret });
    return result.valid;
}
function generarMfaPendingToken(rut) {
    return (0, jwt_1.generateToken)({ rut, purpose: 'mfa', tv: 0 });
}
function verificarMfaPendingToken(token) {
    const decoded = (0, jwt_1.verifyToken)(token);
    if (!decoded || decoded.purpose !== 'mfa' || !decoded.rut)
        return null;
    return { rut: String(decoded.rut) };
}
