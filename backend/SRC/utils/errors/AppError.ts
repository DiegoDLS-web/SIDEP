/**
 * Clase de error personalizada para manejar errores de aplicación controlados en Express.
 * Extiende la clase Error nativa de JavaScript.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  /**
   * Crea una instancia de AppError.
   * 
   * @param message - Mensaje descriptivo del error.
   * @param statusCode - Código de estado HTTP correspondiente (ej. 400, 401, 403, 404).
   */
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    
    // Mantiene el stack trace correcto en entornos V8 (como Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
