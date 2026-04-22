"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRUPOS_SANGUINEOS = exports.TIPOS_VOLUNTARIO = exports.CARGOS_OFICIALIDAD = void 0;
exports.esCargoValido = esCargoValido;
exports.esTipoVoluntarioValido = esTipoVoluntarioValido;
exports.nombreCompletoDesdePartes = nombreCompletoDesdePartes;
exports.normalizarFirmaDataUrl = normalizarFirmaDataUrl;
/** Cargos institucionales (un valor por persona). */
exports.CARGOS_OFICIALIDAD = [
    'DIRECTOR_COMPANIA',
    'SECRETARIO_COMPANIA',
    'TESORERO_COMPANIA',
    'PRO_SECRETARIO_COMPANIA',
    'CAPITAN_COMPANIA',
    'TENIENTE_PRIMERO',
    'TENIENTE_SEGUNDO',
    'TENIENTE_TERCERO',
    'TENIENTE_CUARTO',
    'AYUDANTE_COMPANIA',
    'PRO_AYUDANTE',
    'VICE_SUPERINTENDENTE',
    'SECRETARIO_GENERAL',
    'TESORERO_GENERAL',
    'SEGUNDO_COMANDANTE',
    'INSPECTOR_COMANDANCIA_1',
    'INSPECTOR_COMANDANCIA_2',
];
exports.TIPOS_VOLUNTARIO = [
    'ACTIVO',
    'HONORARIO',
    'CUARTELERO',
    'CANJE',
    'CONFEDERADO',
    'INSIGNE',
];
exports.GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'DESCONOCIDO'];
function esCargoValido(c) {
    if (!c?.trim())
        return false;
    return exports.CARGOS_OFICIALIDAD.includes(c.trim());
}
function esTipoVoluntarioValido(t) {
    if (!t?.trim())
        return false;
    return exports.TIPOS_VOLUNTARIO.includes(t.trim());
}
function nombreCompletoDesdePartes(p) {
    const partes = [p.nombres, p.apellidoPaterno, p.apellidoMaterno].map((x) => (x ?? '').trim()).filter(Boolean);
    return partes.join(' ').trim();
}
const MAX_FIRMA_CHARS = 2_800_000;
function normalizarFirmaDataUrl(raw) {
    if (raw == null || raw === '')
        return null;
    const s = raw.trim();
    if (!s.startsWith('data:image/')) {
        throw new Error('La firma debe ser una imagen en base64 (data:image/...)');
    }
    if (s.length > MAX_FIRMA_CHARS) {
        throw new Error('La imagen de firma es demasiado grande');
    }
    const lower = s.slice(0, 40).toLowerCase();
    if (!lower.includes('png') && !lower.includes('jpeg') && !lower.includes('jpg')) {
        throw new Error('Solo se permiten imágenes PNG o JPEG');
    }
    return s;
}
//# sourceMappingURL=usuario-perfil.js.map