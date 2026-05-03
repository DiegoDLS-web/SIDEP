"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstQueryString = firstQueryString;
/** Primer valor de query string (Express puede entregar string | string[]). */
function firstQueryString(q) {
    if (typeof q === 'string')
        return q;
    if (Array.isArray(q) && typeof q[0] === 'string')
        return q[0];
    return undefined;
}
//# sourceMappingURL=httpQuery.js.map