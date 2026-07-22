"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.esErrorConexionPrisma = esErrorConexionPrisma;
exports.withDbRetry = withDbRetry;
exports.calentarConexionPrisma = calentarConexionPrisma;
/** Reintenta operaciones Prisma ante fallos transitorios (p. ej. Neon dormido). */
function esErrorConexionPrisma(error) {
    if (!error || typeof error !== 'object')
        return false;
    const code = String(error.code ?? '');
    if (code === 'P1001' || code === 'P1002' || code === 'P2024' || code === 'P1017')
        return true;
    const msg = String(error.message ?? '').toLowerCase();
    return (msg.includes("can't reach database") ||
        msg.includes('connection pool timeout') ||
        msg.includes('connection') ||
        msg.includes('timeout') ||
        msg.includes('econnrefused') ||
        msg.includes('server has closed the connection') ||
        error.name === 'PrismaClientInitializationError');
}
async function withDbRetry(fn, opts) {
    const attempts = Math.max(1, opts?.attempts ?? 5);
    const delayMs = opts?.delayMs ?? 1200;
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (!esErrorConexionPrisma(error) || i === attempts - 1) {
                throw error;
            }
            await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        }
    }
    throw lastError;
}
async function calentarConexionPrisma(prisma) {
    try {
        await withDbRetry(() => prisma.$queryRaw `SELECT 1`, { attempts: 5, delayMs: 1200 });
        return true;
    }
    catch {
        return false;
    }
}
