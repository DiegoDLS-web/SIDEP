/**
 * Clase de error personalizada para manejar errores de aplicación controlados en Express.
 * Extiende la clase Error nativa de JavaScript.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: string[] | undefined;

  /**
   * Crea una instancia de AppError.
   * 
   * @param message - Mensaje descriptivo del error.
   * @param statusCode - Código de estado HTTP correspondiente (ej. 400, 401, 403, 404).
   * @param errors - Detalles adicionales de errores (ej. errores de validación).
   */
  constructor(message: string, statusCode: number, errors?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    
    // Mantiene el stack trace correcto en entornos V8 (como Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class NotFoundError extends AppError {
  constructor(entidad: string, id?: string) {
    super(`${entidad}${id ? ` con RUT/ID ${id}` : ''} no encontrado.`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permiso para realizar esta acción.') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(errors: string[]) {
    super('Error de validación.', 400, errors);
  }
}
