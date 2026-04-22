"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configuracionesRouter = void 0;
const express_1 = require("express");
const prisma_js_1 = require("../lib/prisma.js");
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
        incluirLogo: true,
        orientacionPdf: 'VERTICAL',
    },
};
exports.configuracionesRouter = (0, express_1.Router)();
exports.configuracionesRouter.get('/', async (_req, res) => {
    try {
        const rows = await prisma_js_1.prisma.$queryRaw `
      SELECT id, valor FROM "ConfiguracionSistema" WHERE clave = ${CLAVE} LIMIT 1
    `;
        const row = rows[0];
        if (!row) {
            await prisma_js_1.prisma.$executeRaw `
        INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
        VALUES (${CLAVE}, ${JSON.stringify(defaultConfig)}::jsonb, now())
      `;
            res.json(defaultConfig);
            return;
        }
        res.json(row.valor);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
});
exports.configuracionesRouter.put('/', async (req, res) => {
    const body = req.body;
    if (!body?.compania || !body?.notificaciones || !body?.reportes) {
        res.status(400).json({ error: 'Payload de configuraciones inválido' });
        return;
    }
    try {
        await prisma_js_1.prisma.$executeRaw `
      INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
      VALUES (${CLAVE}, ${JSON.stringify(body)}::jsonb, now())
      ON CONFLICT (clave)
      DO UPDATE SET valor = EXCLUDED.valor, "updatedAt" = now()
    `;
        res.json(body);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error al guardar configuraciones' });
    }
});
//# sourceMappingURL=configuraciones.js.map