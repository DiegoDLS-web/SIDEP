"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditoriaRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const apiError_js_1 = require("../lib/apiError.js");
exports.auditoriaRouter = (0, express_1.Router)();
exports.auditoriaRouter.get('/', async (req, res) => {
    const take = Math.min(Number(req.query.take ?? 100) || 100, 500);
    try {
        const items = await prisma_js_1.prisma.actividadUsuario.findMany({
            take,
            orderBy: { fecha: 'desc' },
            include: {
                usuario: {
                    select: { id: true, nombre: true, rol: true, email: true },
                },
            },
        });
        res.json(items);
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'AUDITORIA_LIST', 'No se pudo listar la auditoría');
    }
});
//# sourceMappingURL=auditoria.js.map