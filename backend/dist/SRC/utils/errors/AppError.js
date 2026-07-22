"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ForbiddenError = exports.ConflictError = exports.NotFoundError = exports.AppError = void 0;
/**
 * Clase de error personalizada para manejar errores de aplicación controlados en Express.
 * Extiende la clase Error nativa de JavaScript.
 */
class AppError extends Error {
    statusCode;
    errors;
    /**
     * Crea una instancia de AppError.
     *
     * @param message - Mensaje descriptivo del error.
     * @param statusCode - Código de estado HTTP correspondiente (ej. 400, 401, 403, 404).
     * @param errors - Detalles adicionales de errores (ej. errores de validación).
     */
    constructor(message, statusCode, errors) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        // Mantiene el stack trace correcto en entornos V8 (como Node.js)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(entidad, id) {
        super(`${entidad}${id ? ` con RUT/ID ${id}` : ''} no encontrado.`, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
class ForbiddenError extends AppError {
    constructor(message = 'No tienes permiso para realizar esta acción.') {
        super(message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AppError {
    constructor(errors) {
        super('Error de validación.', 400, errors);
    }
}
exports.ValidationError = ValidationError;
