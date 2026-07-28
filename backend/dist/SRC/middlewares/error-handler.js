"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const prisma_error_util_1 = require("../utils/prisma-error.util");
const logger_1 = require("../utils/logger/logger");
const errorHandler = (err, req, res, next) => {
    const resuelto = (0, prisma_error_util_1.resolverErrorHttp)(err);
    if (resuelto) {
        return res.status(resuelto.statusCode).json({
            success: false,
            message: resuelto.message,
            errors: resuelto.errors ?? undefined,
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos enviados a la base de datos.',
        });
    }
    // Error genérico — no exponer detalles internos
    (0, logger_1.logError)(err, {
        context: 'errorHandler',
        path: req.originalUrl,
        method: req.method,
    });
    return res.status(500).json({
        success: false,
        message: 'Error interno del servidor.',
    });
};
exports.errorHandler = errorHandler;
