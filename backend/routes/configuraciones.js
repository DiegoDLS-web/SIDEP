"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuracionesRouter = void 0;
exports.obtenerConfigSistema = obtenerConfigSistema;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const prisma_js_1 = require("../lib/prisma.js");
const nav_por_rol_js_1 = require("../lib/nav-por-rol.js");
const roles_js_1 = require("../middleware/roles.js");
const CLAVE = 'SISTEMA_GENERAL';
const defaultConfig = {
    compania: {
        nombreCompania: '1ª Compañía Santa Juana',
        nombreBomba: 'Ignacio Enrique López Varela',
        direccion: 'Calle Principal #123, Santa Juana',
        telefono: '+56 9 1234 5678',
        emailInstitucional: 'contacto@bomberossantajuana.cl',
        fechaFundacion: '1958-05-24',
    },
    notificaciones: {
        alertasEmergencia: true,
        alertasInventario: true,
        recordatoriosChecklist: true,
        resumenDiarioEmail: false,
    },
    reportes: {
        formatoPredeterminado: 'PDF',
        logosPdf: 'AMBOS',
        orientacionPdf: 'VERTICAL',
    },
    navegacionPorRol: (0, nav_por_rol_js_1.mergeNavegacionPorRol)(undefined),
};
const FORMATOS = ['PDF', 'XLSX', 'CSV'];
const ORIENTACIONES = ['VERTICAL', 'HORIZONTAL'];
const LOGOS_PDF = ['NINGUNO', 'SIDEP', 'COMPANIA', 'AMBOS'];
function mergeConfig(raw) {
    if (!raw || typeof raw !== 'object') {
        return JSON.parse(JSON.stringify(defaultConfig));
    }
    const r = raw;
    const compania = r.compania && typeof r.compania === 'object'
        ? { ...defaultConfig.compania, ...r.compania }
        : defaultConfig.compania;
    const notificaciones = r.notificaciones && typeof r.notificaciones === 'object'
        ? { ...defaultConfig.notificaciones, ...r.notificaciones }
        : defaultConfig.notificaciones;
    const reportesBase = r.reportes && typeof r.reportes === 'object' ? r.reportes : defaultConfig.reportes;
    const formatoRaw = reportesBase.formatoPredeterminado;
    const formatoPredeterminado = FORMATOS.includes(formatoRaw)
        ? formatoRaw
        : defaultConfig.reportes.formatoPredeterminado;
    const orientRaw = reportesBase.orientacionPdf;
    const orientacionPdf = ORIENTACIONES.includes(orientRaw)
        ? orientRaw
        : defaultConfig.reportes.orientacionPdf;
    const logosRaw = reportesBase.logosPdf;
    let logosPdf;
    if (LOGOS_PDF.includes(logosRaw)) {
        logosPdf = logosRaw;
    }
    else if (typeof reportesBase['incluirLogo'] === 'boolean') {
        logosPdf = (reportesBase.incluirLogo ? 'AMBOS' : 'NINGUNO');
    }
    else {
        logosPdf = defaultConfig.reportes.logosPdf;
    }
    const reportes = {
        formatoPredeterminado,
        logosPdf,
        orientacionPdf,
    };
    const navegacionPorRol = (0, nav_por_rol_js_1.mergeNavegacionPorRol)(r.navegacionPorRol);
    return { compania, notificaciones, reportes, navegacionPorRol };
}
/** Lectura unificada para auth y otras rutas. */
async function obtenerConfigSistema() {
    const rows = await prisma_js_1.prisma.$queryRaw `
    SELECT valor FROM "ConfiguracionSistema" WHERE clave = ${CLAVE} LIMIT 1
  `;
    const row = rows[0];
    if (!row) {
        await prisma_js_1.prisma.$executeRaw `
      INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
      VALUES (${CLAVE}, ${JSON.stringify(defaultConfig)}::jsonb, now())
    `;
        return JSON.parse(JSON.stringify(defaultConfig));
    }
    return mergeConfig(row.valor);
}
exports.configuracionesRouter = (0, express_1.Router)();
const uploadsCompaniaDir = node_path_1.default.resolve(process.cwd(), 'uploads');
node_fs_1.default.mkdirSync(uploadsCompaniaDir, { recursive: true });
const storageLogoCompania = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsCompaniaDir);
    },
    filename: (_req, file, cb) => {
        const ext = node_path_1.default.extname(file.originalname || '').toLowerCase();
        const useJpg = ext === '.jpg' || ext === '.jpeg';
        cb(null, useJpg ? 'compania-logo.jpg' : 'compania-logo.png');
    },
});
const uploadLogoCompania = (0, multer_1.default)({
    storage: storageLogoCompania,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const mime = (file.mimetype || '').toLowerCase();
        if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') {
            cb(null, true);
            return;
        }
        cb(new Error('Solo se permiten imágenes PNG o JPEG'));
    },
});
function manejarMulterLogo(req, res, next) {
    uploadLogoCompania.single('file')(req, res, (err) => {
        if (err) {
            const msg = err instanceof Error ? err.message : 'Archivo inválido';
            res.status(400).json({ error: msg });
            return;
        }
        next();
    });
}
exports.configuracionesRouter.post('/logo-compania', (0, roles_js_1.requireRoles)('ADMIN'), manejarMulterLogo, (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Adjunta un archivo PNG o JPEG (máx. 2 MB)' });
        return;
    }
    try {
        const otherName = req.file.filename.endsWith('.png') ? 'compania-logo.jpg' : 'compania-logo.png';
        const otherPath = node_path_1.default.join(uploadsCompaniaDir, otherName);
        if (node_fs_1.default.existsSync(otherPath)) {
            node_fs_1.default.unlinkSync(otherPath);
        }
    }
    catch {
        /* ignore */
    }
    const publicPath = `/uploads/${req.file.filename}`;
    res.json({ ok: true, path: publicPath });
});
exports.configuracionesRouter.get('/', async (_req, res) => {
    try {
        const merged = await obtenerConfigSistema();
        res.json(merged);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
});
exports.configuracionesRouter.put('/', (0, roles_js_1.requireRoles)('ADMIN'), async (req, res) => {
    const body = req.body;
    if (!body?.compania || !body?.notificaciones || !body?.reportes) {
        res.status(400).json({ error: 'Payload de configuraciones inválido' });
        return;
    }
    const sanitized = mergeConfig(body);
    try {
        await prisma_js_1.prisma.$executeRaw `
      INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
      VALUES (${CLAVE}, ${JSON.stringify(sanitized)}::jsonb, now())
      ON CONFLICT (clave)
      DO UPDATE SET valor = EXCLUDED.valor, "updatedAt" = now()
    `;
        res.json(sanitized);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al guardar configuraciones' });
    }
});
//# sourceMappingURL=configuraciones.js.map