"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const autenticacion_routes_1 = __importDefault(require("./SRC/modules/autenticacion/autenticacion.routes"));
const logistica_routes_1 = __importDefault(require("./SRC/modules/logistica/logistica.routes"));
const operaciones_routes_1 = __importDefault(require("./SRC/modules/operaciones/operaciones.routes"));
const rrhh_routes_1 = __importDefault(require("./SRC/modules/rrhh/routes/rrhh.routes"));
const usuarios_routes_1 = __importDefault(require("./SRC/modules/rrhh/routes/usuarios.routes"));
const licencias_routes_1 = __importDefault(require("./SRC/modules/rrhh/routes/licencias.routes"));
const auditoria_routes_1 = __importDefault(require("./SRC/modules/auditoria/routes/auditoria.routes"));
const reportes_routes_1 = __importDefault(require("./SRC/modules/analitica/routes/reportes.routes"));
const dashboard_routes_1 = __importDefault(require("./SRC/modules/analitica/routes/dashboard.routes"));
const notificaciones_routes_1 = __importDefault(require("./SRC/modules/notificaciones/notificaciones.routes"));
const guardias_routes_1 = __importDefault(require("./SRC/modules/cuartel/routes/guardias.routes"));
const novedades_routes_1 = __importDefault(require("./SRC/modules/cuartel/routes/novedades.routes"));
const asistencia_cuarteleros_routes_1 = __importDefault(require("./SRC/modules/cuartel/routes/asistencia-cuarteleros.routes"));
const auth_middleware_1 = require("./SRC/middlewares/auth.middleware");
const role_middleware_1 = require("./SRC/middlewares/role.middleware");
const prisma_1 = __importDefault(require("./SRC/prisma"));
const auditoria_middleware_1 = require("./SRC/modules/auditoria/middlewares/auditoria.middleware");
const email_service_1 = require("./SRC/utils/email/email.service");
const app = (0, express_1.default)();
function origenesCorsPermitidos() {
    const raw = [
        process.env.FRONTEND_URL,
        process.env.APP_PUBLIC_URL,
        process.env.RENDER_EXTERNAL_URL,
    ]
        .filter(Boolean)
        .map((v) => String(v).trim().replace(/\/$/, ''));
    return [...new Set(raw.length > 0 ? raw : ['http://localhost:4200'])];
}
// Middlewares obligatorios
if (process.env.NODE_ENV === 'production') {
    app.use((0, helmet_1.default)());
}
else {
    app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
}
app.use((0, cors_1.default)({
    origin(origin, callback) {
        const permitidos = origenesCorsPermitidos();
        if (!origin || permitidos.includes(origin.replace(/\/$/, ''))) {
            callback(null, true);
            return;
        }
        callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '20mb' })); // Permite recibir información en JSON
app.use(express_1.default.urlencoded({ limit: '20mb', extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, compression_1.default)());
// --- RUTAS DE LA API (MODULARES) ---
// 1. Ruta de estado (Healthcheck)
app.get('/api/health', async (req, res) => {
    const jwtOk = Boolean(process.env.JWT_SECRET?.trim());
    const smtpOk = Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim());
    const cloudinaryOk = Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
        process.env.CLOUDINARY_API_KEY?.trim() &&
        process.env.CLOUDINARY_API_SECRET?.trim());
    let dbOk = false;
    let smtpConexionOk = false;
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        dbOk = true;
    }
    catch {
        dbOk = false;
    }
    if (smtpOk) {
        try {
            await (0, email_service_1.verificarConexionSmtp)();
            smtpConexionOk = true;
        }
        catch {
            smtpConexionOk = false;
        }
    }
    const ok = dbOk && jwtOk;
    res.status(ok ? 200 : 503).json({
        status: ok ? 'Servidor SIDEP Operativo 🚒' : 'Servidor SIDEP con problemas',
        checks: { db: dbOk, jwt: jwtOk, smtp: smtpOk, smtpConexion: smtpConexionOk, cloudinary: cloudinaryOk },
        timestamp: new Date().toISOString(),
    });
});
// 2. Ruta de Branding Público (Configuración básica)
app.get('/api/branding-public', async (req, res) => {
    try {
        const config = await prisma_1.default.configuracionSistema.findUnique({ where: { id: 1 } });
        res.status(200).json({ nombreCompania: config?.nombreCompania || '1ª Compañía Santa Juana' });
    }
    catch (error) {
        res.status(200).json({ nombreCompania: '1ª Compañía Santa Juana' });
    }
});
// 3. Ruta de Navegación del Usuario (Basada en roles)
app.get('/api/auth/mi-navegacion', auth_middleware_1.protect, async (req, res) => {
    try {
        const user = req.user;
        // Buscar el rol real del usuario en la base de datos
        const dbUser = await prisma_1.default.usuario.findUnique({
            where: { rut: user.rut },
            include: { rol: true }
        });
        const rol = (dbUser?.rol?.codigo || '').trim().toUpperCase();
        // Intentar leer la configuración dinámica primero
        try {
            const config = await prisma_1.default.configuracionSistema.findUnique({ where: { id: 1 } });
            if (config && config.navegacionPorRol) {
                const navMap = JSON.parse(config.navegacionPorRol);
                if (navMap[rol]) {
                    return res.status(200).json({ paths: navMap[rol] });
                }
            }
        }
        catch (err) {
            console.error('No se pudo parsear navegacionPorRol dinámica, usando fallback');
        }
        const OPCIONES_MENU_SIDEP = [
            '/',
            '/partes',
            '/catalogo-emergencias',
            '/carros',
            '/inventarios',
            '/checklist',
            '/checklist-era',
            '/bolso-trauma',
            '/licencias-medicas',
            '/guardias',
            '/libro-novedades',
            '/asistencia-cuarteleros',
            '/analitica-operacional',
            '/usuarios',
            '/auditoria',
            '/configuraciones',
            '/perfil'
        ];
        const sinCatalogoNiAdmin = OPCIONES_MENU_SIDEP.filter((path) => path !== '/usuarios' &&
            path !== '/configuraciones' &&
            path !== '/catalogo-emergencias');
        const operativesAdminCapitan = OPCIONES_MENU_SIDEP.filter((path) => path !== '/usuarios' && path !== '/configuraciones');
        let paths = [];
        if (rol === 'ADMIN') {
            paths = OPCIONES_MENU_SIDEP;
        }
        else if (rol === 'CAPITAN') {
            paths = [...operativesAdminCapitan, '/usuarios'];
        }
        else if (rol === 'TENIENTE') {
            paths = [...sinCatalogoNiAdmin, '/usuarios'];
        }
        else {
            paths = sinCatalogoNiAdmin;
        }
        res.status(200).json({ paths });
    }
    catch (error) {
        console.error('🔥 ERROR EN MI-NAVEGACION:', error);
        res.status(500).json({ success: false, error: 'Error al obtener la navegación del usuario' });
    }
});
// Enchufamos los módulos con el middleware de auditoría agregado en tus rutas
app.use('/api/auth', auditoria_middleware_1.auditoriaMiddleware, autenticacion_routes_1.default);
app.use('/api/logistica', auditoria_middleware_1.auditoriaMiddleware, logistica_routes_1.default);
app.use('/api/operaciones', auditoria_middleware_1.auditoriaMiddleware, operaciones_routes_1.default);
app.use('/api/rrhh', auditoria_middleware_1.auditoriaMiddleware, rrhh_routes_1.default);
app.use('/api/usuarios', auditoria_middleware_1.auditoriaMiddleware, usuarios_routes_1.default);
app.use('/api/licencias', auditoria_middleware_1.auditoriaMiddleware, licencias_routes_1.default);
app.use('/api/auditoria', auditoria_routes_1.default);
app.use('/api/reportes', auth_middleware_1.protect, reportes_routes_1.default);
app.use('/api/dashboard', auth_middleware_1.protect, dashboard_routes_1.default);
app.use('/api/notificaciones', notificaciones_routes_1.default);
app.use('/api/guardias', auditoria_middleware_1.auditoriaMiddleware, guardias_routes_1.default);
app.use('/api/novedades', auditoria_middleware_1.auditoriaMiddleware, novedades_routes_1.default);
app.use('/api/asistencia-cuarteleros', auditoria_middleware_1.auditoriaMiddleware, asistencia_cuarteleros_routes_1.default);
app.get('/api/roles', auth_middleware_1.protect, async (req, res) => {
    try {
        const activos = req.query.activos === '1';
        const where = {};
        if (activos) {
            where.activo = 1;
        }
        const roles = await prisma_1.default.rolUsuario.findMany({
            where,
            orderBy: { id: 'asc' }
        });
        return res.status(200).json(roles.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            codigo: r.codigo,
            activo: r.activo === 1,
        })));
    }
    catch (error) {
        console.error('🔥 ERROR AL LISTAR ROLES:', error);
        return res.status(500).json({ success: false, error: 'Error al obtener roles' });
    }
});
function normalizarCodigoRol(nombre) {
    return nombre
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}
app.post('/api/roles', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN'), async (req, res) => {
    try {
        const nombre = String(req.body?.nombre ?? '').trim();
        if (!nombre) {
            return res.status(400).json({ success: false, error: 'El nombre del rol es requerido.' });
        }
        let codigo = normalizarCodigoRol(nombre);
        if (!codigo) {
            codigo = `ROL_${Date.now()}`;
        }
        const duplicado = await prisma_1.default.rolUsuario.findFirst({
            where: { OR: [{ codigo }, { nombre }] },
        });
        if (duplicado) {
            return res.status(409).json({ success: false, error: 'Ya existe un rol con ese nombre o código.' });
        }
        const activo = req.body?.activo === false ? 0 : 1;
        const created = await prisma_1.default.rolUsuario.create({
            data: { codigo, nombre, activo },
        });
        return res.status(201).json({
            id: created.id,
            nombre: created.nombre,
            codigo: created.codigo,
            activo: created.activo === 1,
        });
    }
    catch (error) {
        console.error('🔥 ERROR AL CREAR ROL:', error);
        return res.status(500).json({ success: false, error: 'Error al crear rol' });
    }
});
app.patch('/api/roles/:id', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN'), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ success: false, error: 'ID de rol inválido.' });
        }
        const { activo, nombre } = req.body ?? {};
        const data = {};
        if (activo !== undefined) {
            data.activo = activo ? 1 : 0;
        }
        if (nombre !== undefined) {
            data.nombre = String(nombre).trim();
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ success: false, error: 'Nada que actualizar.' });
        }
        const updated = await prisma_1.default.rolUsuario.update({ where: { id }, data });
        return res.status(200).json({
            id: updated.id,
            nombre: updated.nombre,
            codigo: updated.codigo,
            activo: updated.activo === 1,
        });
    }
    catch (error) {
        console.error('🔥 ERROR AL ACTUALIZAR ROL:', error);
        return res.status(500).json({ success: false, error: 'Error al actualizar rol' });
    }
});
const error_handler_1 = require("./SRC/middlewares/error-handler");
function resolverCarpetaFrontend() {
    const candidatos = [
        process.env.STATIC_DIR?.trim(),
        path_1.default.join(process.cwd(), 'frontend/dist/frontend/browser'),
        path_1.default.join(process.cwd(), 'frontend/dist/frontend'),
        path_1.default.join(__dirname, '../frontend/dist/frontend/browser'),
        path_1.default.join(__dirname, '../../frontend/dist/frontend/browser'),
        path_1.default.join(__dirname, '../frontend/dist/frontend'),
        path_1.default.join(__dirname, '../../frontend/dist/frontend'),
    ].filter((p) => Boolean(p));
    for (const dir of candidatos) {
        if (fs_1.default.existsSync(path_1.default.join(dir, 'index.html'))) {
            return dir;
        }
    }
    return null;
}
/** En producción sirve el build de Angular (misma URL que la API). */
function configurarFrontendEstatico() {
    if (process.env.NODE_ENV !== 'production')
        return;
    const staticRoot = resolverCarpetaFrontend();
    if (!staticRoot) {
        console.warn('[SIDEP] No se encontró el build del frontend; solo API disponible.');
        return;
    }
    app.use(express_1.default.static(staticRoot, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
        res.sendFile(path_1.default.join(staticRoot, 'index.html'));
    });
    console.log(`[SIDEP] Frontend público servido desde ${staticRoot}`);
}
configurarFrontendEstatico();
// Exportamos 'app' pero NO lo encendemos aquí
app.use(error_handler_1.errorHandler);
exports.default = app;
