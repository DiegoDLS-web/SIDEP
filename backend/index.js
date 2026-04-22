"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const prisma_js_1 = require("./lib/prisma.js");
const partes_js_1 = require("./routes/partes.js");
const checklists_js_1 = require("./routes/checklists.js");
const bolsos_trauma_js_1 = require("./routes/bolsos-trauma.js");
const usuarios_js_1 = require("./routes/usuarios.js");
const configuraciones_js_1 = require("./routes/configuraciones.js");
const roles_js_1 = require("./routes/roles.js");
const auth_js_1 = require("./routes/auth.js");
const auditoria_js_1 = require("./routes/auditoria.js");
const reportes_js_1 = require("./routes/reportes.js");
const dashboard_js_1 = require("./routes/dashboard.js");
const auth_js_2 = require("./middleware/auth.js");
const roles_js_2 = require("./middleware/roles.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '12mb' }));
function buildCarroPatch(body) {
    if (!body || typeof body !== 'object') {
        return {};
    }
    const b = body;
    const data = {};
    const setStr = (key) => {
        if (!(key in b)) {
            return;
        }
        const v = b[key];
        if (v === null || v === '') {
            data[key] = null;
        }
        else {
            data[key] = String(v);
        }
    };
    const setDate = (key) => {
        if (!(key in b)) {
            return;
        }
        const v = b[key];
        if (v === null || v === '') {
            data[key] = null;
        }
        else {
            const d = new Date(String(v));
            data[key] = Number.isNaN(d.getTime()) ? null : d;
        }
    };
    setStr('ultimoConductor');
    setStr('conductorAsignado');
    setStr('descripcionUltimoMantenimiento');
    setStr('ultimoInspector');
    setStr('firmaUltimoInspector');
    setDate('ultimoMantenimiento');
    setDate('proximoMantenimiento');
    setDate('proximaRevisionTecnica');
    setDate('ultimaRevisionBombaAgua');
    setDate('fechaUltimaInspeccion');
    return data;
}
async function resolverCarroId(param) {
    const idNum = Number(param);
    const isNumericId = !Number.isNaN(idNum) && Number.isFinite(idNum) && String(idNum) === param;
    if (isNumericId) {
        const c = await prisma_js_1.prisma.carro.findUnique({ where: { id: idNum }, select: { id: true } });
        return c?.id ?? null;
    }
    const c = await prisma_js_1.prisma.carro.findUnique({ where: { nomenclatura: param }, select: { id: true } });
    return c?.id ?? null;
}
app.use('/api/auth', auth_js_1.authRouter);
app.get('/api/status', (req, res) => {
    res.json({ mensaje: 'Backend de SIDEP 100% operativo' });
});
app.use('/api/usuarios', auth_js_2.requireAuth, (0, roles_js_2.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), usuarios_js_1.usuariosRouter);
app.use('/api/roles', auth_js_2.requireAuth, (0, roles_js_2.requireRoles)('ADMIN'), roles_js_1.rolesRouter);
app.use('/api/configuraciones', auth_js_2.requireAuth, (0, roles_js_2.requireRoles)('ADMIN'), configuraciones_js_1.configuracionesRouter);
app.use('/api/auditoria', auth_js_2.requireAuth, (0, roles_js_2.requireRoles)('ADMIN', 'CAPITAN'), auditoria_js_1.auditoriaRouter);
app.use('/api/partes', auth_js_2.requireAuth, partes_js_1.partesRouter);
app.use('/api/checklists', auth_js_2.requireAuth, checklists_js_1.checklistsRouter);
app.use('/api/bolsos-trauma', auth_js_2.requireAuth, bolsos_trauma_js_1.bolsosTraumaRouter);
app.use('/api/reportes', auth_js_2.requireAuth, (0, roles_js_2.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), reportes_js_1.reportesRouter);
app.use('/api/dashboard', auth_js_2.requireAuth, dashboard_js_1.dashboardRouter);
app.get('/api/carros', auth_js_2.requireAuth, async (_req, res) => {
    try {
        const carros = await prisma_js_1.prisma.carro.findMany({ orderBy: { nomenclatura: 'asc' } });
        res.json(carros);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al listar carros' });
    }
});
/** Historial de snapshots de mantención de todos los carros (filtros opcionales por query). */
app.get('/api/carros/historial-general', auth_js_2.requireAuth, async (req, res) => {
    try {
        const carroIdRaw = req.query.carroId;
        const desdeRaw = req.query.desde;
        const hastaRaw = req.query.hasta;
        const where = {};
        if (carroIdRaw != null && String(carroIdRaw).trim() !== '') {
            const n = Number(carroIdRaw);
            if (!Number.isNaN(n)) {
                where.carroId = n;
            }
        }
        const creadoEn = {};
        if (desdeRaw != null && String(desdeRaw).trim() !== '') {
            const d = new Date(String(desdeRaw));
            if (!Number.isNaN(d.getTime())) {
                creadoEn.gte = d;
            }
        }
        if (hastaRaw != null && String(hastaRaw).trim() !== '') {
            const d = new Date(String(hastaRaw));
            if (!Number.isNaN(d.getTime())) {
                d.setHours(23, 59, 59, 999);
                creadoEn.lte = d;
            }
        }
        if (creadoEn.gte != null || creadoEn.lte != null) {
            where.creadoEn = creadoEn;
        }
        const rows = await prisma_js_1.prisma.carroRegistroHistorial.findMany({
            where,
            orderBy: { creadoEn: 'desc' },
            take: 2000,
            include: { carro: { select: { id: true, nomenclatura: true, nombre: true, patente: true } } },
        });
        res.json(rows);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al listar historial general de carros' });
    }
});
app.get('/api/carros/:id', auth_js_2.requireAuth, async (req, res) => {
    const rawParam = req.params.id;
    const param = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!param) {
        res.status(400).json({ error: 'Parámetro requerido' });
        return;
    }
    try {
        const idNum = Number(param);
        const isNumericId = !Number.isNaN(idNum) && Number.isFinite(idNum) && String(idNum) === param;
        const carro = isNumericId
            ? await prisma_js_1.prisma.carro.findUnique({
                where: { id: idNum },
                include: { historialRegistros: { orderBy: { creadoEn: 'desc' }, take: 100 } },
            })
            : await prisma_js_1.prisma.carro.findUnique({
                where: { nomenclatura: param },
                include: { historialRegistros: { orderBy: { creadoEn: 'desc' }, take: 100 } },
            });
        if (!carro) {
            res.status(404).json({ error: 'Carro no encontrado' });
            return;
        }
        res.json(carro);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al obtener carro' });
    }
});
app.patch('/api/carros/:id', auth_js_2.requireAuth, async (req, res) => {
    const rawParam = req.params.id;
    const param = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!param) {
        res.status(400).json({ error: 'Parámetro requerido' });
        return;
    }
    try {
        const carroId = await resolverCarroId(param);
        if (carroId == null) {
            res.status(404).json({ error: 'Carro no encontrado' });
            return;
        }
        const updateData = buildCarroPatch(req.body);
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ error: 'Sin campos para actualizar' });
            return;
        }
        const resultado = await prisma_js_1.prisma.$transaction(async (tx) => {
            const carro = await tx.carro.update({
                where: { id: carroId },
                data: updateData,
            });
            await tx.carroRegistroHistorial.create({
                data: {
                    carroId: carro.id,
                    ultimoMantenimiento: carro.ultimoMantenimiento,
                    proximoMantenimiento: carro.proximoMantenimiento,
                    proximaRevisionTecnica: carro.proximaRevisionTecnica,
                    ultimaRevisionBombaAgua: carro.ultimaRevisionBombaAgua,
                    descripcionUltimoMantenimiento: carro.descripcionUltimoMantenimiento,
                    ultimoInspector: carro.ultimoInspector,
                    firmaUltimoInspector: carro.firmaUltimoInspector,
                    fechaUltimaInspeccion: carro.fechaUltimaInspeccion,
                    ultimoConductor: carro.ultimoConductor,
                },
            });
            return tx.carro.findUnique({
                where: { id: carroId },
                include: { historialRegistros: { orderBy: { creadoEn: 'desc' }, take: 100 } },
            });
        });
        res.json(resultado);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al actualizar carro' });
    }
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map