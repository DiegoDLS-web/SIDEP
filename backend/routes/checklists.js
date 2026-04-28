"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checklistsRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
const roles_js_1 = require("../middleware/roles.js");
exports.checklistsRouter = (0, express_1.Router)();
const includeChecklist = {
    carro: { select: { id: true, nomenclatura: true, nombre: true } },
    cuartelero: { select: { id: true, nombre: true, rol: true, firmaImagen: true } },
};
function enrichVigencia(items) {
    let latestId = -1;
    for (const row of items) {
        if (row.id > latestId)
            latestId = row.id;
    }
    return items.map((row) => ({
        ...row,
        vigente: row.id === latestId,
        obsoleto: row.id !== latestId,
    }));
}
function enrichVigenciaPor(items, keyFn) {
    const latestByKey = new Map();
    for (const row of items) {
        const key = String(keyFn(row));
        const prev = latestByKey.get(key) ?? -1;
        if (row.id > prev)
            latestByKey.set(key, row.id);
    }
    return items.map((row) => {
        const latest = latestByKey.get(String(keyFn(row))) ?? -1;
        return { ...row, vigente: row.id === latest, obsoleto: row.id !== latest };
    });
}
function calcularEstadoOperativo(totalItems, itemsOk) {
    const total = Number(totalItems ?? 0);
    const ok = Number(itemsOk ?? 0);
    if (!Number.isFinite(total) || total <= 0) {
        return true;
    }
    return Number.isFinite(ok) && ok >= total;
}
function normalizarPlantillaUnidad(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const u of raw) {
        if (!u || typeof u !== 'object')
            continue;
        const ru = u;
        const nombre = String(ru.nombre ?? '').trim();
        if (!nombre)
            continue;
        const mats = [];
        if (Array.isArray(ru.materiales)) {
            for (const m of ru.materiales) {
                if (!m || typeof m !== 'object')
                    continue;
                const rm = m;
                const matNombre = String(rm.nombre ?? '').trim();
                const cant = Number(rm.cantidadRequerida ?? 0);
                if (!matNombre)
                    continue;
                mats.push({ nombre: matNombre, cantidadRequerida: Number.isFinite(cant) ? Math.max(0, Math.round(cant)) : 0 });
            }
        }
        out.push({ nombre, materiales: mats });
    }
    return out;
}
async function obtenerPlantillaUnidad(unidad) {
    const cfg = await prisma_js_1.prisma.configuracionSistema.findUnique({
        where: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS' },
        select: { valor: true },
    });
    const valor = (cfg?.valor ?? null);
    const desdeCfg = normalizarPlantillaUnidad(valor?.[unidad]);
    if (desdeCfg.length > 0)
        return desdeCfg;
    const carro = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: unidad }, select: { id: true } });
    if (!carro)
        return [];
    const last = await prisma_js_1.prisma.checklistCarro.findFirst({
        where: { carroId: carro.id, tipo: 'UNIDAD' },
        orderBy: { fecha: 'desc' },
        select: { detalle: true },
    });
    const detalle = (last?.detalle ?? null);
    return normalizarPlantillaUnidad(detalle?.ubicaciones);
}
exports.checklistsRouter.get('/unidad/:unidad/plantilla', async (req, res) => {
    const unidad = String(req.params.unidad ?? '').trim();
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    try {
        const plantilla = await obtenerPlantillaUnidad(unidad);
        res.json({ unidad, ubicaciones: plantilla });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al cargar plantilla de checklist unidad' });
    }
});
exports.checklistsRouter.put('/unidad/:unidad/plantilla', (0, roles_js_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), async (req, res) => {
    const unidad = String(req.params.unidad ?? '').trim();
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    const ubicaciones = normalizarPlantillaUnidad(req.body?.ubicaciones);
    if (ubicaciones.length === 0) {
        res.status(400).json({ error: 'La plantilla debe incluir al menos un compartimiento con materiales.' });
        return;
    }
    try {
        const cfg = await prisma_js_1.prisma.configuracionSistema.findUnique({
            where: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS' },
            select: { valor: true },
        });
        const previo = (cfg?.valor ?? {}) || {};
        const next = { ...previo, [unidad]: ubicaciones };
        await prisma_js_1.prisma.configuracionSistema.upsert({
            where: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS' },
            update: { valor: next },
            create: { clave: 'CHECKLIST_UNIDAD_PLANTILLAS', valor: next },
        });
        res.json({ unidad, ubicaciones });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al guardar plantilla de checklist unidad' });
    }
});
exports.checklistsRouter.get('/unidad/:unidad/historial', async (req, res) => {
    const unidad = req.params.unidad;
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    try {
        const carro = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: unidad } });
        if (!carro) {
            res.status(404).json({ error: 'Unidad no encontrada' });
            return;
        }
        const items = await prisma_js_1.prisma.checklistCarro.findMany({
            where: { carroId: carro.id, tipo: 'UNIDAD' },
            orderBy: { fecha: 'desc' },
            take: 100,
            include: includeChecklist,
        });
        res.json(enrichVigencia(items));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al cargar historial de checklist' });
    }
});
exports.checklistsRouter.get('/unidad/:unidad/historial-era', async (req, res) => {
    const unidad = req.params.unidad;
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    try {
        const carro = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: unidad } });
        if (!carro) {
            res.status(404).json({ error: 'Unidad no encontrada' });
            return;
        }
        const items = await prisma_js_1.prisma.checklistCarro.findMany({
            where: { carroId: carro.id, tipo: 'ERA' },
            orderBy: { fecha: 'desc' },
            take: 100,
            include: includeChecklist,
        });
        res.json(enrichVigencia(items));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al cargar historial ERA' });
    }
});
exports.checklistsRouter.get('/selector', async (_req, res) => {
    try {
        const carros = await prisma_js_1.prisma.carro.findMany({
            orderBy: { nomenclatura: 'asc' },
            include: {
                checklists: {
                    where: { tipo: 'UNIDAD' },
                    orderBy: { fecha: 'desc' },
                    take: 1,
                    include: { cuartelero: { select: { nombre: true } } },
                },
            },
        });
        const items = carros.map((c) => {
            const ultimo = c.checklists[0] ?? null;
            const total = ultimo?.totalItems ?? 0;
            const ok = ultimo?.itemsOk ?? 0;
            return {
                id: c.id,
                unidad: String(c.nomenclatura ?? '').trim() || `U-${c.id}`,
                nombre: (c.nombre ?? '').trim() || `Unidad ${String(c.nomenclatura ?? c.id)}`,
                ultimaRevision: ultimo
                    ? {
                        fecha: ultimo.fecha.toISOString(),
                        inspector: ultimo.inspector ?? null,
                        obac: ultimo.cuartelero?.nombre ?? null,
                        responsable: (ultimo.inspector ?? '').trim() ||
                            (ultimo.cuartelero?.nombre ?? '').trim() ||
                            '—',
                        completado: total > 0 ? ok >= total : true,
                    }
                    : null,
                itemsTotal: total,
                itemsOk: ok,
                itemsFaltantes: Math.max(total - ok, 0),
            };
        });
        res.json(items);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al cargar resumen checklist' });
    }
});
exports.checklistsRouter.get('/unidad/:unidad', async (req, res) => {
    const unidad = req.params.unidad;
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    try {
        const carro = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: unidad } });
        if (!carro) {
            res.status(404).json({ error: 'Unidad no encontrada' });
            return;
        }
        const checklist = await prisma_js_1.prisma.checklistCarro.findFirst({
            where: { carroId: carro.id, tipo: 'UNIDAD' },
            orderBy: { fecha: 'desc' },
            include: includeChecklist,
        });
        res.json({ unidad: carro.nomenclatura, carro, checklist });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al obtener checklist de unidad' });
    }
});
exports.checklistsRouter.post('/unidad/:unidad', async (req, res) => {
    const unidad = req.params.unidad;
    const body = req.body;
    if (!unidad || typeof body.cuarteleroId !== 'number') {
        res.status(400).json({ error: 'Unidad y cuarteleroId son requeridos' });
        return;
    }
    try {
        const carro = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: unidad } });
        if (!carro) {
            res.status(404).json({ error: 'Unidad no encontrada' });
            return;
        }
        const totalItems = typeof body.totalItems === 'number' ? body.totalItems : null;
        const itemsOk = typeof body.itemsOk === 'number' ? body.itemsOk : null;
        const estadoOperativoCarro = calcularEstadoOperativo(totalItems, itemsOk);
        const esBorrador = Boolean(body.detalle &&
            typeof body.detalle === 'object' &&
            !Array.isArray(body.detalle) &&
            body.detalle.borrador === true);
        const created = await prisma_js_1.prisma.$transaction(async (tx) => {
            const row = await tx.checklistCarro.create({
                data: {
                    carroId: carro.id,
                    cuarteleroId: body.cuarteleroId,
                    tipo: 'UNIDAD',
                    inspector: body.inspector ?? null,
                    grupoGuardia: body.grupoGuardia ?? null,
                    firmaOficial: body.firmaOficial ?? null,
                    observaciones: body.observaciones ?? null,
                    totalItems,
                    itemsOk,
                    ...(body.detalle !== undefined
                        ? { detalle: body.detalle }
                        : {}),
                },
                include: includeChecklist,
            });
            if (!esBorrador) {
                await tx.carro.update({
                    where: { id: carro.id },
                    data: { estadoOperativo: estadoOperativoCarro },
                });
            }
            return row;
        });
        res.status(201).json({
            ...created,
            vigente: true,
            obsoleto: false,
            estadoOperativoCarro: esBorrador ? undefined : estadoOperativoCarro,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al guardar checklist de unidad' });
    }
});
exports.checklistsRouter.get('/era', async (_req, res) => {
    try {
        const checks = await prisma_js_1.prisma.checklistCarro.findMany({
            where: { tipo: 'ERA' },
            orderBy: { fecha: 'desc' },
            take: 30,
            include: includeChecklist,
        });
        res.json(enrichVigenciaPor(checks, (r) => r.carroId));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al listar checklist ERA' });
    }
});
exports.checklistsRouter.post('/era', async (req, res) => {
    const body = req.body;
    if (!body.unidad || typeof body.cuarteleroId !== 'number') {
        res.status(400).json({ error: 'unidad y cuarteleroId son requeridos' });
        return;
    }
    try {
        const carro = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: body.unidad } });
        if (!carro) {
            res.status(404).json({ error: 'Unidad no encontrada' });
            return;
        }
        const totalItems = typeof body.totalItems === 'number' ? body.totalItems : null;
        const itemsOk = typeof body.itemsOk === 'number' ? body.itemsOk : null;
        const created = await prisma_js_1.prisma.checklistCarro.create({
            data: {
                carroId: carro.id,
                cuarteleroId: body.cuarteleroId,
                tipo: 'ERA',
                inspector: body.inspector ?? null,
                grupoGuardia: body.grupoGuardia ?? null,
                firmaOficial: body.firmaOficial ?? null,
                observaciones: body.observaciones ?? null,
                totalItems,
                itemsOk,
                ...(body.detalle !== undefined
                    ? { detalle: body.detalle }
                    : {}),
            },
            include: includeChecklist,
        });
        res.status(201).json({
            ...created,
            vigente: true,
            obsoleto: false,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al guardar checklist ERA' });
    }
});
//# sourceMappingURL=checklists.js.map