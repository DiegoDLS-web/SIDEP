"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarEmailLog = registrarEmailLog;
exports.listarEmailLogs = listarEmailLogs;
const prisma_1 = __importDefault(require("../../prisma"));
async function registrarEmailLog(opts) {
    try {
        await prisma_1.default.emailNotificacionLog.create({
            data: {
                tipo: opts.tipo.slice(0, 80),
                destinatario: opts.destinatario.slice(0, 150),
                subject: opts.subject.slice(0, 255),
                ok: opts.ok ? 1 : 0,
                detalle: opts.detalle?.slice(0, 2000) ?? null,
            },
        });
    }
    catch (err) {
        console.error('[SIDEP email-log] No se pudo registrar envío:', err);
    }
}
async function listarEmailLogs(limit = 50) {
    return prisma_1.default.emailNotificacionLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.min(200, Math.max(1, limit)),
    });
}
