"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET_ENV = process.env.JWT_SECRET?.trim();
if (!JWT_SECRET_ENV && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción.');
}
if (!JWT_SECRET_ENV) {
    console.warn('[SIDEP] JWT_SECRET no configurado — solo válido para desarrollo local.');
}
const JWT_SECRET = JWT_SECRET_ENV || 'default_secret_key_change_me_in_prod';
/**
 * Genera un token JWT firmado con el payload especificado.
 * El token tiene una expiración fija de 8 horas.
 *
 * @param payload - Datos que se almacenarán dentro del token.
 * @returns Token JWT firmado como string.
 */
function generateToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}
/**
 * Verifica la validez de un token JWT.
 *
 * @param token - Token JWT a verificar.
 * @returns El payload decodificado si es válido, o null si ha expirado/es inválido.
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return typeof decoded === 'object' ? decoded : null;
    }
    catch {
        return null;
    }
}
