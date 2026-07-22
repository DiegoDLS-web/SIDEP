"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarRut = validarRut;
exports.normalizarRut = normalizarRut;
exports.formatearRutDesdeNormalizado = formatearRutDesdeNormalizado;
/**
 * Valida un RUT chileno usando el algoritmo Módulo 11 oficial.
 * Acepta formatos como:
 * - 12345678K
 * - 12345678-K
 * - 12.345.678-K
 * - 12.345.678-k
 *
 * Rechaza:
 * - RUT vacíos
 * - Caracteres inválidos
 * - DV incorrecto
 * - Formatos incompletos o demasiado cortos/largos (el cuerpo del RUT debe tener entre 6 y 8 dígitos).
 */
function validarRut(rut) {
    if (!rut || typeof rut !== 'string')
        return false;
    // Eliminar puntos, guiones y espacios en blanco, y convertir a mayúsculas
    const limpio = rut.replace(/[\.\-\s]/g, '').toUpperCase();
    // Validar formato básico: cuerpo de 6 a 8 dígitos + dígito verificador (0-9 o K)
    if (!/^\d{7,8}[0-9K]$/.test(limpio)) {
        return false;
    }
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i], 10) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = 11 - (suma % 11);
    let dvEsperado = '0';
    if (resto === 11) {
        dvEsperado = '0';
    }
    else if (resto === 10) {
        dvEsperado = 'K';
    }
    else {
        dvEsperado = String(resto);
    }
    return dv === dvEsperado;
}
/**
 * Normaliza un RUT eliminando puntos, guiones y convirtiendo el DV a mayúscula.
 * Retorna un formato como: 12345678K
 */
function normalizarRut(rut) {
    if (!rut || typeof rut !== 'string')
        return '';
    return rut.replace(/[\.\-\s]/g, '').toUpperCase();
}
/** Formato chileno típico en BD: 12.345.678-9 */
function formatearRutDesdeNormalizado(norm) {
    const n = norm.replace(/[^0-9kK]/g, '').toUpperCase();
    if (n.length < 8)
        return null;
    const dv = n.slice(-1);
    const cuerpo = n.slice(0, -1);
    const withDots = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${withDots}-${dv}`;
}
