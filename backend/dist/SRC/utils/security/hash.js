"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
/**
 * Encripta una contraseña en texto plano utilizando bcryptjs con 10 salt rounds.
 *
 * @param password - Contraseña en texto plano a encriptar.
 * @returns Promesa que resuelve a la contraseña cifrada.
 */
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
}
/**
 * Compara una contraseña en texto plano con un hash de bcryptjs previamente guardado.
 *
 * @param password - Contraseña en texto plano.
 * @param hash - Hash de la contraseña con la que comparar.
 * @returns Promesa que resuelve a true si coinciden, false de lo contrario.
 */
async function comparePassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
