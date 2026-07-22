"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsearUltimoCambioEstadoCarro = parsearUltimoCambioEstadoCarro;
exports.formatearFechaAlertaCarro = formatearFechaAlertaCarro;
exports.detalleEstadoOficialCarro = detalleEstadoOficialCarro;
function parsearUltimoCambioEstadoCarro(detalle) {
    if (!detalle)
        return null;
    const match = detalle.match(/Motivo:\s*(.+?)\.\s*Fecha:\s*(.+?)\.\s*$/);
    if (!match)
        return null;
    return { motivo: match[1].trim(), fechaEfectiva: match[2].trim() };
}
function formatearFechaAlertaCarro(fecha) {
    const iso = fecha.slice(0, 10);
    const [y, m, d] = iso.split('-');
    if (y && m && d)
        return `${d}/${m}/${y}`;
    return fecha;
}
function detalleEstadoOficialCarro(cambio, fallback) {
    if (!cambio?.motivo)
        return fallback;
    const fechaTxt = cambio.fechaEfectiva ? formatearFechaAlertaCarro(cambio.fechaEfectiva) : '—';
    return `Motivo: ${cambio.motivo}. Fecha efectiva: ${fechaTxt}.`;
}
