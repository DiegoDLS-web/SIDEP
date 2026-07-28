"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIDEP_TIMEZONE = void 0;
exports.fechaCalendarioKey = fechaCalendarioKey;
exports.sumarDiasCalendarioKey = sumarDiasCalendarioKey;
exports.diaSemanaCalendarioKey = diaSemanaCalendarioKey;
exports.inicioHeatmapDesdeFin = inicioHeatmapDesdeFin;
exports.rangoCalendarioKeys = rangoCalendarioKeys;
/** Zona horaria operacional SIDEP (compañía en Chile). */
exports.SIDEP_TIMEZONE = 'America/Santiago';
/** Clave `YYYY-MM-DD` según calendario en America/Santiago. */
function fechaCalendarioKey(fecha) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: exports.SIDEP_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(fecha);
}
function parseCalendarioKey(key) {
    const parts = key.split('-').map(Number);
    return { y: parts[0] ?? 0, m: parts[1] ?? 0, d: parts[2] ?? 0 };
}
/** Suma días sobre una clave de calendario (respeta DST vía mediodía UTC). */
function sumarDiasCalendarioKey(key, delta) {
    const { y, m, d } = parseCalendarioKey(key);
    const utc = Date.UTC(y, m - 1, d + delta, 12, 0, 0);
    return fechaCalendarioKey(new Date(utc));
}
/** Día de la semana 0=lunes … 6=domingo (calendario Santiago). */
function diaSemanaCalendarioKey(key) {
    const { y, m, d } = parseCalendarioKey(key);
    const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
    const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: exports.SIDEP_TIMEZONE,
        weekday: 'short',
    }).format(new Date(utc));
    const map = {
        Mon: 0,
        Tue: 1,
        Wed: 2,
        Thu: 3,
        Fri: 4,
        Sat: 5,
        Sun: 6,
    };
    return map[weekday] ?? 0;
}
/** Inicio del bloque de heatmap: lunes de la semana más antigua (N semanas). */
function inicioHeatmapDesdeFin(finKey, semanas) {
    const diasDesdeLunes = diaSemanaCalendarioKey(finKey);
    return sumarDiasCalendarioKey(finKey, -(diasDesdeLunes + (semanas - 1) * 7));
}
/** Genera claves YYYY-MM-DD consecutivas [inicio, fin] inclusive. */
function rangoCalendarioKeys(inicioKey, finKey) {
    const keys = [];
    let cur = inicioKey;
    while (cur <= finKey) {
        keys.push(cur);
        cur = sumarDiasCalendarioKey(cur, 1);
    }
    return keys;
}
