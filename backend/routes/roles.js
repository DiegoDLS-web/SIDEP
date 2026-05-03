"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const apiError_js_1 = require("../lib/apiError.js");
exports.rolesRouter = (0, express_1.Router)();
const ROLES_PERMITIDOS = ['CAPITAN', 'TENIENTE', 'VOLUNTARIOS', 'ADMIN'];
async function sincronizarRolesPermitidos() {
    for (const nombre of ROLES_PERMITIDOS) {
        await prisma_js_1.prisma.rolUsuario.upsert({
            where: { nombre },
            update: {},
            create: { nombre, activo: true },
        });
    }
    await prisma_js_1.prisma.rolUsuario.updateMany({
        where: { nombre: { notIn: [...ROLES_PERMITIDOS] } },
        data: { activo: false },
    });
}
exports.rolesRouter.get('/', async (req, res) => {
    const soloActivos = req.query.activos === '1' || req.query.activos === 'true';
    try {
        await sincronizarRolesPermitidos();
        const roles = soloActivos
            ? await prisma_js_1.prisma.rolUsuario.findMany({
                where: { activo: true, nombre: { in: [...ROLES_PERMITIDOS] } },
                orderBy: { nombre: 'asc' },
            })
            : await prisma_js_1.prisma.rolUsuario.findMany({
                where: { nombre: { in: [...ROLES_PERMITIDOS] } },
                orderBy: { nombre: 'asc' },
            });
        res.json(roles);
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'ROLES_LIST', 'Error al listar roles');
    }
});
exports.rolesRouter.post('/', async (req, res) => {
    (0, apiError_js_1.sendApiError)(res, 400, 'ROLES_CREATE_DISABLED', 'No se pueden crear más roles. Solo se permiten: CAPITAN, TENIENTE, VOLUNTARIOS y ADMIN.');
});
exports.rolesRouter.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
        (0, apiError_js_1.sendApiError)(res, 400, 'ROLES_ID_INVALIDO', 'ID inválido');
        return;
    }
    const nombre = req.body?.nombre !== undefined ? String(req.body.nombre).trim().toUpperCase() : undefined;
    const activo = req.body?.activo;
    try {
        const rolActual = await prisma_js_1.prisma.rolUsuario.findUnique({ where: { id } });
        if (!rolActual || !ROLES_PERMITIDOS.includes(rolActual.nombre)) {
            (0, apiError_js_1.sendApiError)(res, 400, 'ROLES_EDITAR_NO_PERMITIDO', 'Solo se pueden editar los 4 roles permitidos.');
            return;
        }
        if (nombre !== undefined && nombre !== rolActual.nombre) {
            (0, apiError_js_1.sendApiError)(res, 400, 'ROLES_RENAME_DISABLED', 'No se puede renombrar roles.');
            return;
        }
        const actualizado = await prisma_js_1.prisma.rolUsuario.update({
            where: { id },
            data: {
                ...(activo !== undefined ? { activo: Boolean(activo) } : {}),
            },
        });
        res.json(actualizado);
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'ROLES_UPDATE', 'No se pudo actualizar rol');
    }
});
//# sourceMappingURL=roles.js.map