"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendApiError = sendApiError;
exports.readApiErrorMessage = readApiErrorMessage;
/** Respuesta JSON estable para el cliente (toasts, i18n por código). */
function sendApiError(res, status, code, message, details) {
    const body = { error: { code, message } };
    if (details !== undefined) {
        body.error.details = details;
    }
    res.status(status).json(body);
}
/** Extrae mensaje legible de cuerpos de error HTTP (nuevo o legado `{ error: string }`). */
function readApiErrorMessage(body, fallback) {
    if (body && typeof body === 'object' && 'error' in body) {
        const e = body.error;
        if (typeof e === 'string')
            return e;
        if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
            return e.message;
        }
    }
    return fallback;
}
//# sourceMappingURL=apiError.js.map