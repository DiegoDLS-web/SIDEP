"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFechaHoraChile = formatFechaHoraChile;
const TZ = 'America/Santiago';
/** Fecha/hora legible en zona Chile (listados, logs, PDF alineado con web). */
function formatFechaHoraChile(iso) {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime()))
        return '—';
    return new Intl.DateTimeFormat('es-CL', {
        timeZone: TZ,
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(d);
}
//# sourceMappingURL=fechaChile.js.map