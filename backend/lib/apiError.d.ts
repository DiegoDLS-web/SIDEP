import type { Response } from 'express';
export type ApiErrorBody = {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
};
/** Respuesta JSON estable para el cliente (toasts, i18n por código). */
export declare function sendApiError(res: Response, status: number, code: string, message: string, details?: unknown): void;
/** Extrae mensaje legible de cuerpos de error HTTP (nuevo o legado `{ error: string }`). */
export declare function readApiErrorMessage(body: unknown, fallback: string): string;
//# sourceMappingURL=apiError.d.ts.map