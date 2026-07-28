"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TALLAS_ROPA = exports.TALLAS_BOTA = void 0;
exports.inferirTipoEpp = inferirTipoEpp;
exports.inferirSistemaTalla = inferirSistemaTalla;
exports.validarTalla = validarTalla;
exports.extraerTallaDeNombre = extraerTallaDeNombre;
exports.etiquetaTipoEpp = etiquetaTipoEpp;
/**
 * Inferencia de tipo EPP / sistema de talla desde nombre de artículo.
 */
exports.TALLAS_BOTA = Array.from({ length: 12 }, (_, i) => String(35 + i)); // 35–46
exports.TALLAS_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
function inferirTipoEpp(nombre, categoria) {
    const n = `${nombre} ${categoria ?? ''}`.toLowerCase();
    if (/bota/.test(n) && /estructural/.test(n))
        return 'BOTA_ESTRUCTURAL';
    if (/bota/.test(n) && /(forestal|incendio)/.test(n))
        return 'BOTA_FORESTAL';
    if (/bota/.test(n))
        return 'BOTA_ESTRUCTURAL';
    if (/chaqueta/.test(n) && /rescate/.test(n))
        return 'CHAQUETA_RESCATE';
    if (/chaqueta/.test(n) && /forestal/.test(n))
        return 'CHAQUETA_FORESTAL';
    if (/chaqueta/.test(n) && /agua/.test(n))
        return 'CHAQUETA_AGUA';
    if (/chaqueta/.test(n) && /uniforme/.test(n))
        return 'CHAQUETA_UNIFORME';
    if (/chaqueta/.test(n))
        return 'CHAQUETA';
    if (/jardinera/.test(n))
        return 'JARDINERA';
    if (/uniforme\s*(n[úu]mero\s*)?1|uniforme\s*n[ºo°.]?\s*1/.test(n))
        return 'UNIFORME_N1';
    if (/gorra/.test(n))
        return 'GORRA';
    if (/casco/.test(n))
        return 'CASCO';
    if (/guante/.test(n))
        return 'GUANTE';
    if (/pantal[oó]n/.test(n))
        return 'PANTALON';
    return null;
}
function inferirSistemaTalla(tipoEpp) {
    if (!tipoEpp)
        return null;
    if (tipoEpp.startsWith('BOTA_'))
        return 'BOTA';
    if (tipoEpp.startsWith('CHAQUETA') ||
        tipoEpp === 'JARDINERA' ||
        tipoEpp === 'UNIFORME_N1' ||
        tipoEpp === 'GORRA' ||
        tipoEpp === 'PANTALON') {
        return 'ROPA';
    }
    return null;
}
function validarTalla(sistema, talla) {
    if (!sistema)
        return null;
    const t = String(talla ?? '').trim().toUpperCase();
    if (!t)
        return `Debes indicar la talla (${sistema === 'BOTA' ? '35–46' : 'XS–XXL'}).`;
    if (sistema === 'BOTA' && !exports.TALLAS_BOTA.includes(t)) {
        return `Talla de bota inválida. Usa una entre 35 y 46.`;
    }
    if (sistema === 'ROPA' && !exports.TALLAS_ROPA.includes(t)) {
        return `Talla de ropa inválida. Usa XS, S, M, L, XL o XXL.`;
    }
    return null;
}
/** Intenta leer talla desde el nombre (ej. "Bota estructural 43", "Chaqueta M"). */
function extraerTallaDeNombre(nombre, sistema) {
    if (!sistema)
        return null;
    if (sistema === 'BOTA') {
        const m = nombre.match(/\b(3[5-9]|4[0-6])\b/);
        return m?.[1] ?? null;
    }
    const m = nombre.toUpperCase().match(/\b(XXL|XL|XS|S|M|L)\b/);
    return m?.[1] ?? null;
}
function etiquetaTipoEpp(tipo) {
    if (!tipo)
        return '—';
    return tipo
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
