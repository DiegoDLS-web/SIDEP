"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logError = logError;
/**
 * Registra un mensaje de información en la consola junto con una marca de tiempo en formato ISO.
 *
 * @param message - Mensaje o información a registrar.
 */
function logInfo(message) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] - ${message}`);
}
/**
 * Registra un error en la consola junto con una marca de tiempo en formato ISO y su stack trace si está disponible.
 *
 * @param error - Instancia de Error, mensaje o anomalía a registrar.
 */
function logError(error) {
    const timestamp = new Date().toISOString();
    if (error instanceof Error) {
        console.error(`[ERROR] [${timestamp}] - ${error.message}`, error.stack);
    }
    else {
        console.error(`[ERROR] [${timestamp}] -`, error);
    }
}
