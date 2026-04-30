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
function estadoChecklistDesdeTotalesYObs(totalItems, itemsOk, observaciones) {
    const total = Number(totalItems ?? 0);
    const ok = Number(itemsOk ?? 0);
    const tieneObs = String(observaciones ?? '').trim().length > 0;
    if (tieneObs)
        return 'CON_OBSERVACION';
    if (total > 0 && ok >= total)
        return 'COMPLETADO';
    return 'PENDIENTE';
}
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
/** Plantillas ERA/TRAUMA persistentes por clave única (`__ALL__` aplica a toda nomenclatura). */
const CLAVE_PLANTILLAS_TRAUMA = 'CHECKLIST_TRAUMA_PLANTILLAS';
/** Plantillas ERA guardadas por nomenclatura (incluye `__ALL__` opcional como respaldo). */
const CLAVE_PLANTILLAS_ERA = 'CHECKLIST_ERA_PLANTILLAS';
async function obtenerPlantillaTrauma(unidad) {
    const cfg = await prisma_js_1.prisma.configuracionSistema.findUnique({
        where: { clave: CLAVE_PLANTILLAS_TRAUMA },
        select: { valor: true },
    });
    const v = (cfg?.valor ?? {}) || {};
    const per = v[unidad];
    const all = v.__ALL__ ?? v.__default__;
    return (per ?? all) ?? null;
}
async function obtenerPlantillaEra(unidad) {
    const cfg = await prisma_js_1.prisma.configuracionSistema.findUnique({
        where: { clave: CLAVE_PLANTILLAS_ERA },
        select: { valor: true },
    });
    const v = (cfg?.valor ?? {}) || {};
    const per = v[unidad];
    const all = v.__ALL__ ?? v.__default__;
    return (per ?? all) ?? null;
}
async function obtenerPlantillaTipo(tipoRaw, unidad) {
    const tipo = tipoRaw.trim().toUpperCase();
    if (tipo === 'TRAUMA') {
        return obtenerPlantillaTrauma(unidad);
    }
    if (tipo === 'ERA') {
        return obtenerPlantillaEra(unidad);
    }
    return null;
}
async function guardarPlantillaTraumaGlobal(plantilla) {
    const cfg = await prisma_js_1.prisma.configuracionSistema.findUnique({
        where: { clave: CLAVE_PLANTILLAS_TRAUMA },
        select: { valor: true },
    });
    const prev = (cfg?.valor ?? {}) || {};
    const next = { ...prev, __ALL__: plantilla };
    await prisma_js_1.prisma.configuracionSistema.upsert({
        where: { clave: CLAVE_PLANTILLAS_TRAUMA },
        update: { valor: next },
        create: { clave: CLAVE_PLANTILLAS_TRAUMA, valor: next },
    });
}
async function guardarPlantillaEraPorUnidad(unidad, plantilla) {
    const cfg = await prisma_js_1.prisma.configuracionSistema.findUnique({
        where: { clave: CLAVE_PLANTILLAS_ERA },
        select: { valor: true },
    });
    const prev = (cfg?.valor ?? {}) || {};
    const next = { ...prev, [unidad]: plantilla };
    await prisma_js_1.prisma.configuracionSistema.upsert({
        where: { clave: CLAVE_PLANTILLAS_ERA },
        update: { valor: next },
        create: { clave: CLAVE_PLANTILLAS_ERA, valor: next },
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
/** GET plantilla opcional ERA/TRAUMA (TRAUMA: fallback `__ALL__` para todas las unidades). */
exports.checklistsRouter.get('/plantillas/:tipo/:unidad', async (req, res) => {
    const tipo = String(req.params.tipo ?? '');
    const unidad = String(req.params.unidad ?? '').trim();
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    try {
        const plantilla = await obtenerPlantillaTipo(tipo, unidad);
        res.json({ plantilla });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al cargar plantilla' });
    }
});
exports.checklistsRouter.put('/plantillas/:tipo/:unidad', (0, roles_js_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), async (req, res) => {
    const tipo = String(req.params.tipo ?? '').trim().toUpperCase();
    const unidad = String(req.params.unidad ?? '').trim();
    if (!unidad) {
        res.status(400).json({ error: 'Unidad requerida' });
        return;
    }
    if (tipo !== 'TRAUMA' && tipo !== 'ERA') {
        res.status(400).json({ error: 'Solo se pueden guardar plantillas TRAUMA o ERA' });
        return;
    }
    const plantilla = req.body?.plantilla;
    if (plantilla === undefined || plantilla === null) {
        res.status(400).json({ error: 'Cuerpo inválido' });
        return;
    }
    try {
        if (tipo === 'TRAUMA') {
            await guardarPlantillaTraumaGlobal(plantilla);
        }
        else {
            await guardarPlantillaEraPorUnidad(unidad, plantilla);
        }
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({
            error: tipo === 'TRAUMA' ? 'Error al guardar plantilla trauma' : 'Error al guardar plantilla ERA',
        });
    }
});
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
        const enriched = enrichVigencia(items).map((row) => ({
            ...row,
            estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
        }));
        res.json(enriched);
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
        const enriched = enrichVigencia(items).map((row) => ({
            ...row,
            estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
        }));
        res.json(enriched);
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
                        estadoChecklist: estadoChecklistDesdeTotalesYObs(total, ok, ultimo.observaciones),
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
        res.json({
            unidad: carro.nomenclatura,
            carro,
            checklist: checklist
                ? {
                    ...checklist,
                    estadoChecklist: estadoChecklistDesdeTotalesYObs(checklist.totalItems, checklist.itemsOk, checklist.observaciones),
                }
                : null,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al obtener checklist de unidad' });
    }
});
exports.checklistsRouter.post('/unidad/:unidad', async (req, res) => {
    const unidad = req.params.unidad;
    const body = req.body;
    const cuarteleroUnidadId = body.cuarteleroId;
    if (!unidad || typeof cuarteleroUnidadId !== 'number') {
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
                    cuarteleroId: cuarteleroUnidadId,
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
            estadoChecklist: estadoChecklistDesdeTotalesYObs(created.totalItems, created.itemsOk, created.observaciones),
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
        const enriched = enrichVigenciaPor(checks, (r) => r.carroId).map((row) => ({
            ...row,
            estadoChecklist: estadoChecklistDesdeTotalesYObs(row.totalItems, row.itemsOk, row.observaciones),
        }));
        res.json(enriched);
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
            estadoChecklist: estadoChecklistDesdeTotalesYObs(created.totalItems, created.itemsOk, created.observaciones),
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al guardar checklist ERA' });
    }
});
//# sourceMappingURL=checklists.js.map