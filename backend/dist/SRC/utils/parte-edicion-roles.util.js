"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.puedeEditarParteCompletado = puedeEditarParteCompletado;
function normalizarRolCodigo(rol) {
    return (rol ?? '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '');
}
/** Solo capitán, tenientes y administrador pueden editar partes ya completados. */
function puedeEditarParteCompletado(rol) {
    const r = normalizarRolCodigo(rol);
    return (r === 'ADMIN'
        || r === 'ADMINISTRADOR'
        || r === 'CAPITAN'
        || r === 'TENIENTE');
}
