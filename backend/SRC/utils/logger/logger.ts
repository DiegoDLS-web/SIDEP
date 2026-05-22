/**
 * Registra un mensaje de información en la consola junto con una marca de tiempo en formato ISO.
 * 
 * @param message - Mensaje o información a registrar.
 */
export function logInfo(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] [${timestamp}] - ${message}`);
}

/**
 * Registra un error en la consola junto con una marca de tiempo en formato ISO y su stack trace si está disponible.
 * 
 * @param error - Instancia de Error, mensaje o anomalía a registrar.
 */
export function logError(error: any): void {
  const timestamp = new Date().toISOString();
  if (error instanceof Error) {
    console.error(`[ERROR] [${timestamp}] - ${error.message}`, error.stack);
  } else {
    console.error(`[ERROR] [${timestamp}] -`, error);
  }
}
