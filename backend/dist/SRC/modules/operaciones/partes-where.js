"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whereParteNoAnulado = void 0;
exports.parteWhereNoAnulado = parteWhereNoAnulado;
/** Excluye partes anulados (incluye borrador, pendiente y completado). */
exports.whereParteNoAnulado = {
    NOT: { estado: { codigo: 'ANULADO' } },
};
function parteWhereNoAnulado(extra) {
    if (!extra || Object.keys(extra).length === 0)
        return exports.whereParteNoAnulado;
    return { AND: [exports.whereParteNoAnulado, extra] };
}
