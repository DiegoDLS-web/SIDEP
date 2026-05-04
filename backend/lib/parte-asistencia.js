"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extraerAsistenciasMetadata = extraerAsistenciasMetadata;
/** Extrae filas usr-* de `metadata.asistencia.asistenciaPorContexto` (misma lógica que reportes). */
function extraerAsistenciasMetadata(metadata) {
    const meta = metadata;
    const apc = meta?.asistencia?.asistenciaPorContexto;
    if (!apc || typeof apc !== 'object')
        return [];
    const out = [];
    for (const mapa of Object.values(apc)) {
        if (!mapa || typeof mapa !== 'object')
            continue;
        for (const [k, v] of Object.entries(mapa)) {
            if (!k.startsWith('usr-'))
                continue;
            const uid = Number(k.slice(4));
            if (!Number.isFinite(uid) || uid <= 0)
                continue;
            out.push({ usuarioId: uid, presente: Boolean(v) });
        }
    }
    return out;
}
//# sourceMappingURL=parte-asistencia.js.map