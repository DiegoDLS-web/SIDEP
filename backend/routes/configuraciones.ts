import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { mergeNavegacionPorRol } from '../lib/nav-por-rol.js';
import { requireRoles } from '../middleware/roles.js';
import { sendApiError } from '../lib/apiError.js';

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
    logosPdf: 'AMBOS' | 'SIDEP' | 'COMPANIA' | 'NINGUNO';
    orientacionPdf: 'VERTICAL' | 'HORIZONTAL';
  };
  navegacionPorRol: Record<string, string[]>;
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
    logosPdf: 'AMBOS',
    orientacionPdf: 'VERTICAL',
  },
  navegacionPorRol: mergeNavegacionPorRol(undefined),
};

const FORMATOS = ['PDF', 'XLSX', 'CSV'] as const;
const ORIENTACIONES = ['VERTICAL', 'HORIZONTAL'] as const;
const LOGOS_PDF = ['NINGUNO', 'SIDEP', 'COMPANIA', 'AMBOS'] as const;

function mergeConfig(raw: unknown): ConfigPayload {
  if (!raw || typeof raw !== 'object') {
    return JSON.parse(JSON.stringify(defaultConfig));
  }
  const r = raw as Partial<ConfigPayload>;
  const compania =
    r.compania && typeof r.compania === 'object'
      ? { ...defaultConfig.compania, ...r.compania }
      : defaultConfig.compania;
  const notificaciones =
    r.notificaciones && typeof r.notificaciones === 'object'
      ? { ...defaultConfig.notificaciones, ...r.notificaciones }
      : defaultConfig.notificaciones;
  const reportesBase =
    r.reportes && typeof r.reportes === 'object' ? r.reportes : defaultConfig.reportes;
  const formatoRaw = reportesBase.formatoPredeterminado as string | undefined;
  const formatoPredeterminado = FORMATOS.includes(formatoRaw as (typeof FORMATOS)[number])
    ? (formatoRaw as ConfigPayload['reportes']['formatoPredeterminado'])
    : defaultConfig.reportes.formatoPredeterminado;
  const orientRaw = reportesBase.orientacionPdf as string | undefined;
  const orientacionPdf = ORIENTACIONES.includes(orientRaw as (typeof ORIENTACIONES)[number])
    ? (orientRaw as ConfigPayload['reportes']['orientacionPdf'])
    : defaultConfig.reportes.orientacionPdf;
  const logosRaw = (reportesBase as { logosPdf?: string }).logosPdf;
  let logosPdf: ConfigPayload['reportes']['logosPdf'];
  if (LOGOS_PDF.includes(logosRaw as (typeof LOGOS_PDF)[number])) {
    logosPdf = logosRaw as ConfigPayload['reportes']['logosPdf'];
  } else if (
    typeof (reportesBase as unknown as Record<string, unknown>)['incluirLogo'] === 'boolean'
  ) {
    logosPdf = ((reportesBase as unknown as { incluirLogo: boolean }).incluirLogo ? 'AMBOS' : 'NINGUNO');
  } else {
    logosPdf = defaultConfig.reportes.logosPdf;
  }
  const reportes: ConfigPayload['reportes'] = {
    formatoPredeterminado,
    logosPdf,
    orientacionPdf,
  };
  const navegacionPorRol = mergeNavegacionPorRol(r.navegacionPorRol);
  return { compania, notificaciones, reportes, navegacionPorRol };
}

/** Lectura unificada para auth y otras rutas. */
export async function obtenerConfigSistema(): Promise<ConfigPayload> {
  const rows = await prisma.$queryRaw<Array<{ valor: unknown }>>`
    SELECT valor FROM "ConfiguracionSistema" WHERE clave = ${CLAVE} LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    await prisma.$executeRaw`
      INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
      VALUES (${CLAVE}, ${JSON.stringify(defaultConfig)}::jsonb, now())
    `;
    return JSON.parse(JSON.stringify(defaultConfig));
  }
  return mergeConfig(row.valor);
}

export const configuracionesRouter = Router();

const uploadsCompaniaDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadsCompaniaDir, { recursive: true });

const storageLogoCompania = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsCompaniaDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const useJpg = ext === '.jpg' || ext === '.jpeg';
    cb(null, useJpg ? 'compania-logo.jpg' : 'compania-logo.png');
  },
});

const uploadLogoCompania = multer({
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

function manejarMulterLogo(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  uploadLogoCompania.single('file')(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : 'Archivo inválido';
      sendApiError(res, 400, 'CONFIG_LOGO_UPLOAD', msg);
      return;
    }
    next();
  });
}

configuracionesRouter.post(
  '/logo-compania',
  requireRoles('ADMIN'),
  manejarMulterLogo,
  (req, res) => {
    if (!req.file) {
      sendApiError(res, 400, 'CONFIG_LOGO_ARCHIVO', 'Adjunta un archivo PNG o JPEG (máx. 2 MB)');
      return;
    }
    try {
      const otherName = req.file.filename.endsWith('.png') ? 'compania-logo.jpg' : 'compania-logo.png';
      const otherPath = path.join(uploadsCompaniaDir, otherName);
      if (fs.existsSync(otherPath)) {
        fs.unlinkSync(otherPath);
      }
    } catch {
      /* ignore */
    }
    const publicPath = `/uploads/${req.file.filename}`;
    res.json({ ok: true, path: publicPath });
  },
);

configuracionesRouter.get('/', async (_req, res) => {
  try {
    const merged = await obtenerConfigSistema();
    res.json(merged);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CONFIG_GET', 'Error al obtener configuraciones');
  }
});

configuracionesRouter.put('/', requireRoles('ADMIN'), async (req, res) => {
  const body = req.body as ConfigPayload;
  if (!body?.compania || !body?.notificaciones || !body?.reportes) {
    sendApiError(res, 400, 'CONFIG_PAYLOAD', 'Payload de configuraciones inválido');
    return;
  }
  const sanitized = mergeConfig(body);
  try {
    await prisma.$executeRaw`
      INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
      VALUES (${CLAVE}, ${JSON.stringify(sanitized)}::jsonb, now())
      ON CONFLICT (clave)
      DO UPDATE SET valor = EXCLUDED.valor, "updatedAt" = now()
    `;
    res.json(sanitized);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'CONFIG_SAVE', 'Error al guardar configuraciones');
  }
});
