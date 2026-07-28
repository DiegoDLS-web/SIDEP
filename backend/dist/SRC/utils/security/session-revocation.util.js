"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidarSesionesUsuario = invalidarSesionesUsuario;
exports.tokenVersionEnJwt = tokenVersionEnJwt;
const prisma_1 = __importDefault(require("../../prisma"));
/** Incrementa tokenVersion → invalida JWT previos que no coincidan. */
async function invalidarSesionesUsuario(rut) {
    await prisma_1.default.usuario.update({
        where: { rut },
        data: { tokenVersion: { increment: 1 } },
    });
}
function tokenVersionEnJwt(decoded) {
    const tv = decoded['tv'];
    return typeof tv === 'number' && Number.isFinite(tv) ? Math.trunc(tv) : 0;
}
