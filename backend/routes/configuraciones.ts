import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const CLAVE = 'SISTEMA_GENERAL';

type ConfigPayload = {
  compania: {
    nombreCompania: string;
    nombreBomba: string;
    direccion: string;
    telefono: string;
    emailInstitucional: string;
    fechaFundacion: string;
  };
  notificaciones: {
    alertasEmergencia: boolean;
    alertasInventario: boolean;
    recordatoriosChecklist: boolean;
    resumenDiarioEmail: boolean;
  };
  reportes: {
    formatoPredeterminado: 'PDF' | 'XLSX' | 'CSV';
    incluirLogo: boolean;
    orientacionPdf: 'VERTICAL' | 'HORIZONTAL';
  };
};

const defaultConfig: ConfigPayload = {
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

export const configuracionesRouter = Router();

configuracionesRouter.get('/', async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: number; valor: unknown }>>`
      SELECT id, valor FROM "ConfiguracionSistema" WHERE clave = ${CLAVE} LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      await prisma.$executeRaw`
        INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
        VALUES (${CLAVE}, ${JSON.stringify(defaultConfig)}::jsonb, now())
      `;
      res.json(defaultConfig);
      return;
    }
    res.json(row.valor);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
});

configuracionesRouter.put('/', async (req, res) => {
  const body = req.body as ConfigPayload;
  if (!body?.compania || !body?.notificaciones || !body?.reportes) {
    res.status(400).json({ error: 'Payload de configuraciones inválido' });
    return;
  }
  try {
    await prisma.$executeRaw`
      INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
      VALUES (${CLAVE}, ${JSON.stringify(body)}::jsonb, now())
      ON CONFLICT (clave)
      DO UPDATE SET valor = EXCLUDED.valor, "updatedAt" = now()
    `;
    res.json(body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al guardar configuraciones' });
  }
});
