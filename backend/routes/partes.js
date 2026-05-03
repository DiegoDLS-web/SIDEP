"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partesRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const correlativo_js_1 = require("../lib/correlativo.js");
const roles_js_1 = require("../middleware/roles.js");
const auditoria_js_1 = require("../lib/auditoria.js");
const apiError_js_1 = require("../lib/apiError.js");
const fechaChile_js_1 = require("../lib/fechaChile.js");
exports.partesRouter = (0, express_1.Router)();
const includeParte = {
    obac: { select: { id: true, nombre: true, rut: true, rol: true, firmaImagen: true } },
    unidades: {
        include: {
            carro: { select: { id: true, nomenclatura: true, patente: true } },
        },
    },
    pacientes: true,
};
function firstQueryString(q) {
    if (typeof q === 'string')
        return q;
    if (Array.isArray(q) && typeof q[0] === 'string')
        return q[0];
    return undefined;
}
function buildParteListWhere(query) {
    const where = {};
    const tipo = firstQueryString(query.tipo);
    if (tipo && tipo !== 'todos') {
        where.claveEmergencia = tipo;
    }
    const q = firstQueryString(query.q);
    if (q && q.trim()) {
        where.direccion = { contains: q.trim(), mode: 'insensitive' };
    }
    const desde = firstQueryString(query.desde);
    const hasta = firstQueryString(query.hasta);
    const desdeOk = Boolean(desde && !Number.isNaN(Date.parse(desde)));
    const hastaOk = Boolean(hasta && !Number.isNaN(Date.parse(hasta)));
    if (desdeOk || hastaOk) {
        const fechaFilter = {};
        if (desdeOk)
            fechaFilter.gte = new Date(desde);
        if (hastaOk)
            fechaFilter.lte = new Date(hasta);
        where.fecha = fechaFilter;
    }
    return where;
}
/** Listado paginado (filtros opcionales). Debe declararse antes de `/:id`. */
exports.partesRouter.get('/pagina', async (req, res) => {
    const page = Math.max(1, parseInt(String(firstQueryString(req.query.page) ?? '1'), 10) || 1);
    const rawSize = parseInt(String(firstQueryString(req.query.pageSize) ?? '10'), 10) || 10;
    const pageSize = Math.min(200, Math.max(1, rawSize));
    const where = buildParteListWhere(req.query);
    try {
        const [total, rows] = await Promise.all([
            prisma_js_1.prisma.parteEmergencia.count({ where }),
            prisma_js_1.prisma.parteEmergencia.findMany({
                where,
                orderBy: { fecha: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: includeParte,
            }),
        ]);
        const items = rows.map((p) => ({
            ...p,
            fechaLegible: (0, fechaChile_js_1.formatFechaHoraChile)(p.fecha),
        }));
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        res.json({ items, total, page, pageSize, totalPages });
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'PARTES_LIST_PAGINA', 'Error al listar partes con paginaci�n.');
    }
});
/** Totales globales para tarjetas del listado (sin filtros de b�squeda). */
exports.partesRouter.get('/metricas', async (_req, res) => {
    try {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const startYear = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
        const startMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const endMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const [totalSistema, enAnioActual, enMesActual] = await Promise.all([
            prisma_js_1.prisma.parteEmergencia.count(),
            prisma_js_1.prisma.parteEmergencia.count({ where: { fecha: { gte: startYear } } }),
            prisma_js_1.prisma.parteEmergencia.count({
                where: { fecha: { gte: startMonth, lte: endMonth } },
            }),
        ]);
        res.json({ totalSistema, enAnioActual, enMesActual });
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'PARTES_METRICAS', 'Error al obtener indicadores de partes.');
    }
});
exports.partesRouter.get('/', async (_req, res) => {
    try {
        const partes = await prisma_js_1.prisma.parteEmergencia.findMany({
            orderBy: { fecha: 'desc' },
            include: includeParte,
        });
        res.json(partes);
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'PARTES_LIST', 'Error al listar partes.');
    }
});
exports.partesRouter.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || !Number.isFinite(id) || id <= 0) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_ID_INVALIDO', 'Identificador de parte inv�lido.');
        return;
    }
    try {
        const parte = await prisma_js_1.prisma.parteEmergencia.findUnique({
            where: { id },
            include: includeParte,
        });
        if (!parte) {
            (0, apiError_js_1.sendApiError)(res, 404, 'PARTES_NOT_FOUND', 'Parte no encontrado.');
            return;
        }
        res.json({ ...parte, fechaLegible: (0, fechaChile_js_1.formatFechaHoraChile)(parte.fecha) });
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'PARTES_GET', 'Error al obtener el parte.');
    }
});
/** Parsea unidades; en modo borrador omite filas sin carro v?lido. */
function parseUnidades(unidades, esBorrador) {
    if (!Array.isArray(unidades)) {
        return esBorrador ? [] : null;
    }
    const out = [];
    for (const raw of unidades) {
        if (!raw || typeof raw !== 'object')
            continue;
        const u = raw;
        const carroId = Number(u.carroId);
        if (!Number.isFinite(carroId) || carroId <= 0) {
            if (esBorrador)
                continue;
            return null;
        }
        const pickH = (key) => {
            const v = u[key];
            return typeof v === 'string' ? v.trim() : '';
        };
        const hora6_0 = pickH('hora6_0') || pickH('horaSalida');
        const hora6_3 = pickH('hora6_3');
        const hora6_9 = pickH('hora6_9');
        const hora6_10 = pickH('hora6_10') || pickH('horaLlegada');
        const horaSalida = pickH('horaSalida') || hora6_0;
        const horaLlegada = pickH('horaLlegada') || hora6_10;
        if (!esBorrador && (!horaSalida || !horaLlegada)) {
            return null;
        }
        const kmSalida = typeof u.kmSalida === 'number'
            ? u.kmSalida
            : Number.parseInt(String(u.kmSalida ?? ''), 10) || 0;
        const kmLlegada = typeof u.kmLlegada === 'number'
            ? u.kmLlegada
            : Number.parseInt(String(u.kmLlegada ?? ''), 10) || 0;
        const padH = (h) => h || '00:00';
        out.push({
            carroId,
            horaSalida: padH(horaSalida),
            horaLlegada: padH(horaLlegada),
            hora6_0: padH(hora6_0),
            hora6_3: padH(hora6_3),
            hora6_9: padH(hora6_9),
            hora6_10: padH(hora6_10),
            kmSalida,
            kmLlegada,
        });
    }
    return out;
}
exports.partesRouter.post('/', (0, roles_js_1.requireRoles)('TENIENTE', 'CAPITAN', 'ADMIN'), async (req, res) => {
    const body = req.body;
    const esBorrador = body.estado === 'BORRADOR' || body.borrador === true;
    if (body.obacId === undefined || typeof body.obacId !== 'number' || !Number.isFinite(body.obacId)) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_OBAC_REQUERIDO', 'obacId es requerido.');
        return;
    }
    const unidadesParsed = parseUnidades(body.unidades, esBorrador);
    if (unidadesParsed === null) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_UNIDAD_INVALIDA', 'Datos de unidad inv�lidos.');
        return;
    }
    if (!esBorrador && unidadesParsed.length === 0) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_UNIDAD_VACIA', 'Debe incluir al menos una unidad.');
        return;
    }
    let claveEmergencia = typeof body.claveEmergencia === 'string' ? body.claveEmergencia.trim() : '';
    let direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';
    if (!esBorrador) {
        if (!claveEmergencia) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_CLAVE_REQUERIDA', 'claveEmergencia es requerida.');
            return;
        }
        if (!direccion) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_DIRECCION_REQUERIDA', 'direccion es requerida.');
            return;
        }
    }
    else {
        if (!claveEmergencia)
            claveEmergencia = '10-9';
        if (!direccion)
            direccion = '��� Borrador (sin direcci?n)';
    }
    const pacientes = Array.isArray(body.pacientes) ? body.pacientes : [];
    for (const p of pacientes) {
        if (typeof p.nombre !== 'string' || typeof p.triage !== 'string') {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_PACIENTE_INVALIDO', 'Datos de paciente inv�lidos.');
            return;
        }
    }
    const fecha = body.fecha ? new Date(body.fecha) : new Date();
    if (Number.isNaN(fecha.getTime())) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_FECHA_INVALIDA', 'fecha inv�lida.');
        return;
    }
    const estado = typeof body.estado === 'string' && body.estado.trim()
        ? body.estado.trim().toUpperCase()
        : esBorrador
            ? 'BORRADOR'
            : 'PENDIENTE';
    let metadata;
    if (body.metadata !== undefined &&
        body.metadata !== null &&
        typeof body.metadata === 'object' &&
        !Array.isArray(body.metadata)) {
        metadata = body.metadata;
    }
    try {
        const correlativo = await (0, correlativo_js_1.siguienteCorrelativo)();
        const unidadesCreate = unidadesParsed.map((u) => ({
            carroId: u.carroId,
            horaSalida: u.horaSalida,
            horaLlegada: u.horaLlegada,
            hora6_0: u.hora6_0,
            hora6_3: u.hora6_3,
            hora6_9: u.hora6_9,
            hora6_10: u.hora6_10,
            kmSalida: u.kmSalida,
            kmLlegada: u.kmLlegada,
        }));
        const data = {
            correlativo,
            claveEmergencia,
            direccion,
            fecha,
            estado,
            obac: { connect: { id: body.obacId } },
        };
        if (metadata !== undefined) {
            data.metadata = metadata;
        }
        if (unidadesCreate.length > 0) {
            data.unidades = { create: unidadesCreate };
        }
        if (pacientes.length > 0) {
            data.pacientes = {
                create: pacientes.map((p) => ({
                    nombre: p.nombre.trim(),
                    triage: p.triage.trim().toUpperCase(),
                    edad: typeof p.edad === 'number' && Number.isFinite(p.edad) ? Math.floor(p.edad) : null,
                    rut: typeof p.rut === 'string' && p.rut.trim() ? p.rut.trim() : null,
                })),
            };
        }
        const parte = await prisma_js_1.prisma.parteEmergencia.create({
            data,
            include: includeParte,
        });
        await (0, auditoria_js_1.registrarActividad)({
            usuarioId: req.user?.uid,
            accion: 'PARTE_CREADO',
            modulo: 'PARTES',
            referencia: `parte:${parte.id}`,
        });
        res.status(201).json(parte);
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'PARTES_CREATE', 'Error al crear parte.');
    }
});
exports.partesRouter.patch('/:id', (0, roles_js_1.requireRoles)('TENIENTE', 'CAPITAN', 'ADMIN'), async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || !Number.isFinite(id) || id <= 0) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_ID_INVALIDO', 'Identificador de parte inv�lido.');
        return;
    }
    const body = req.body;
    const data = {};
    if (body.claveEmergencia !== undefined) {
        if (typeof body.claveEmergencia !== 'string' || !body.claveEmergencia.trim()) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_CLAVE_INVALIDA', 'claveEmergencia inv�lida.');
            return;
        }
        data.claveEmergencia = body.claveEmergencia.trim();
    }
    if (body.direccion !== undefined) {
        if (typeof body.direccion !== 'string' || !body.direccion.trim()) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_DIRECCION_INVALIDA', 'direccion inv�lida.');
            return;
        }
        data.direccion = body.direccion.trim();
    }
    if (body.estado !== undefined) {
        if (typeof body.estado !== 'string' || !body.estado.trim()) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_ESTADO_INVALIDO', 'estado inv�lido.');
            return;
        }
        data.estado = body.estado.trim().toUpperCase();
    }
    if (body.fecha !== undefined) {
        const fecha = new Date(body.fecha);
        if (Number.isNaN(fecha.getTime())) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_FECHA_INVALIDA', 'fecha inv�lida.');
            return;
        }
        data.fecha = fecha;
    }
    if (body.obacId !== undefined) {
        if (typeof body.obacId !== 'number' || !Number.isFinite(body.obacId) || body.obacId <= 0) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_OBAC_INVALIDO', 'obacId inv�lido.');
            return;
        }
        data.obac = { connect: { id: body.obacId } };
    }
    if (body.metadata !== undefined) {
        if (body.metadata === null) {
            data.metadata = client_1.Prisma.JsonNull;
        }
        else if (typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
            data.metadata = body.metadata;
        }
        else {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_METADATA_INVALIDA', 'metadata inv�lida.');
            return;
        }
    }
    if (body.unidades !== undefined) {
        const estadoEvaluado = (body.estado ?? '').trim().toUpperCase();
        const esBorrador = estadoEvaluado === 'BORRADOR';
        const unidadesParsed = parseUnidades(body.unidades, esBorrador);
        if (unidadesParsed === null) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_UNIDAD_INVALIDA', 'Datos de unidad inv�lidos.');
            return;
        }
        if (!esBorrador && unidadesParsed.length === 0) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_UNIDAD_VACIA', 'Debe incluir al menos una unidad.');
            return;
        }
        data.unidades = {
            deleteMany: {},
            create: unidadesParsed,
        };
    }
    if (body.pacientes !== undefined) {
        if (!Array.isArray(body.pacientes)) {
            (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_PACIENTES_INVALIDOS', 'pacientes inv�lidos.');
            return;
        }
        for (const p of body.pacientes) {
            if (typeof p.nombre !== 'string' || typeof p.triage !== 'string') {
                (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_PACIENTE_INVALIDO', 'Datos de paciente inv�lidos.');
                return;
            }
        }
        data.pacientes = {
            deleteMany: {},
            create: body.pacientes.map((p) => ({
                nombre: p.nombre.trim(),
                triage: p.triage.trim().toUpperCase(),
                edad: typeof p.edad === 'number' && Number.isFinite(p.edad) ? Math.floor(p.edad) : null,
                rut: typeof p.rut === 'string' && p.rut.trim() ? p.rut.trim() : null,
            })),
        };
    }
    if (Object.keys(data).length === 0) {
        (0, apiError_js_1.sendApiError)(res, 400, 'PARTES_PATCH_VACIO', 'No se enviaron cambios.');
        return;
    }
    try {
        const parte = await prisma_js_1.prisma.parteEmergencia.update({
            where: { id },
            data,
            include: includeParte,
        });
        await (0, auditoria_js_1.registrarActividad)({
            usuarioId: req.user?.uid,
            accion: 'PARTE_ACTUALIZADO',
            modulo: 'PARTES',
            referencia: `parte:${id}`,
        });
        res.json(parte);
    }
    catch (e) {
        console.error(e);
        (0, apiError_js_1.sendApiError)(res, 500, 'PARTES_PATCH', 'Error al actualizar parte.');
    }
});
//# sourceMappingURL=partes.js.map