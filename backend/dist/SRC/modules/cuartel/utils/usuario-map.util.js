"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nombreCompletoUsuario = nombreCompletoUsuario;
exports.mapUsuarioBasico = mapUsuarioBasico;
function nombreCompletoUsuario(u) {
    return `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`.trim();
}
function mapUsuarioBasico(u) {
    if (!u)
        return null;
    return {
        rut: u.rut,
        nombre: nombreCompletoUsuario(u),
        rol: u.rol?.nombre ?? null,
        cargo: u.cargo?.nombre ?? null,
    };
}
