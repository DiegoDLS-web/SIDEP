"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODIGO_ACCESO_USUARIO_INACTIVO = void 0;
exports.puedeAccederApp = puedeAccederApp;
exports.etiquetaEstadoAcceso = etiquetaEstadoAcceso;
exports.mensajeAccesoDenegado = mensajeAccesoDenegado;
exports.payloadAccesoDenegado = payloadAccesoDenegado;
exports.CODIGO_ACCESO_USUARIO_INACTIVO = 'USUARIO_INACTIVO';
function puedeAccederApp(usuario) {
    if (usuario.activo !== 1)
        return false;
    const codigo = (usuario.estadoVoluntario?.codigo ?? '').trim().toUpperCase();
    return codigo !== 'INACTIVO';
}
function etiquetaEstadoAcceso(usuario) {
    const codigo = (usuario.estadoVoluntario?.codigo ?? '').trim().toUpperCase();
    if (codigo === 'INACTIVO') {
        return usuario.estadoVoluntario?.nombre?.trim() || 'Inactivo / de baja';
    }
    if (usuario.activo !== 1)
        return 'Cuenta desactivada';
    return usuario.estadoVoluntario?.nombre?.trim() || 'Vigente';
}
function mensajeAccesoDenegado(usuario) {
    const estado = etiquetaEstadoAcceso(usuario);
    const obs = (usuario.observacionesRegistro ?? '').trim();
    let msg = `Tu acceso a SIDEP está restringido (${estado}).`;
    if (obs) {
        msg += ` Motivo registrado: ${obs}`;
    }
    else {
        msg += ' Contacta a la oficialidad o administración para más información.';
    }
    return msg;
}
function payloadAccesoDenegado(usuario) {
    return {
        success: false,
        codigo: exports.CODIGO_ACCESO_USUARIO_INACTIVO,
        message: mensajeAccesoDenegado(usuario),
        estadoVoluntario: etiquetaEstadoAcceso(usuario),
        observaciones: (usuario.observacionesRegistro ?? '').trim() || null,
    };
}
