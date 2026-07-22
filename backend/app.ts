import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import authRoutes from './SRC/modules/autenticacion/autenticacion.routes';
import logisticaRoutes from './SRC/modules/logistica/logistica.routes';
import operacionesRoutes from './SRC/modules/operaciones/operaciones.routes';
import rrhhRoutes from './SRC/modules/rrhh/routes/rrhh.routes';
import usuariosRoutes from './SRC/modules/rrhh/routes/usuarios.routes';
import licenciasRoutes from './SRC/modules/rrhh/routes/licencias.routes';
import auditoriaRoutes from './SRC/modules/auditoria/routes/auditoria.routes';
import reportesRoutes from './SRC/modules/analitica/routes/reportes.routes';
import dashboardRoutes from './SRC/modules/analitica/routes/dashboard.routes';
import { protect } from './SRC/middlewares/auth.middleware';
import { requireRoles } from './SRC/middlewares/role.middleware';
import prisma from './SRC/prisma';
import { auditoriaMiddleware } from './SRC/modules/auditoria/middlewares/auditoria.middleware';

const app = express();

function origenesCorsPermitidos(): string[] {
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
  app.use(helmet());
} else {
  app.use(helmet({ contentSecurityPolicy: false }));
}
app.use(
  cors({
    origin(origin, callback) {
      const permitidos = origenesCorsPermitidos();
      if (!origin || permitidos.includes(origin.replace(/\/$/, ''))) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '20mb' })); // Permite recibir información en JSON
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// --- RUTAS DE LA API (MODULARES) ---

// 1. Ruta de estado (Healthcheck)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Servidor SIDEP Operativo 🚒' });
});

// 2. Ruta de Branding Público (Configuración básica)
app.get('/api/branding-public', async (req, res) => {
  try {
    const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    res.status(200).json({ nombreCompania: config?.nombreCompania || '1ª Compañía Santa Juana' });
  } catch (error) {
    res.status(200).json({ nombreCompania: '1ª Compañía Santa Juana' });
  }
});

// 3. Ruta de Navegación del Usuario (Basada en roles)
app.get('/api/auth/mi-navegacion', protect, async (req, res) => {
  try {
    const user = (req as any).user;

    // Buscar el rol real del usuario en la base de datos
    const dbUser = await prisma.usuario.findUnique({
      where: { rut: user.rut },
      include: { rol: true }
    });

    const rol = (dbUser?.rol?.codigo || '').trim().toUpperCase();

    // Intentar leer la configuración dinámica primero
    try {
      const config = await prisma.configuracionSistema.findUnique({ where: { id: 1 } });
      if (config && config.navegacionPorRol) {
        const navMap = JSON.parse(config.navegacionPorRol);
        if (navMap[rol]) {
          return res.status(200).json({ paths: navMap[rol] });
        }
      }
    } catch (err) {
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
      '/analitica-operacional',
      '/usuarios',
      '/configuraciones',
      '/auditoria',
      '/perfil'
    ];

    const sinCatalogoNiAdmin = OPCIONES_MENU_SIDEP.filter(
      (path) =>
        path !== '/usuarios' &&
        path !== '/configuraciones' &&
        path !== '/catalogo-emergencias' &&
        path !== '/auditoria'
    );

    const operativesAdminCapitan = OPCIONES_MENU_SIDEP.filter(
      (path) => path !== '/usuarios' && path !== '/configuraciones' && path !== '/auditoria'
    );

    let paths: string[] = [];

    if (rol === 'ADMIN') {
      paths = OPCIONES_MENU_SIDEP;
    } else if (rol === 'CAPITAN') {
      paths = [...operativesAdminCapitan, '/usuarios'];
    } else if (rol === 'TENIENTE') {
      paths = [...sinCatalogoNiAdmin, '/usuarios'];
    } else {
      paths = sinCatalogoNiAdmin;
    }

    res.status(200).json({ paths });
  } catch (error) {
    console.error('🔥 ERROR EN MI-NAVEGACION:', error);
    res.status(500).json({ success: false, error: 'Error al obtener la navegación del usuario' });
  }
});

// Enchufamos los módulos con el middleware de auditoría agregado en tus rutas
app.use('/api/auth', auditoriaMiddleware, authRoutes);
app.use('/api/logistica', auditoriaMiddleware, logisticaRoutes);
app.use('/api/operaciones', auditoriaMiddleware, operacionesRoutes);
app.use('/api/rrhh', auditoriaMiddleware, rrhhRoutes);
app.use('/api/usuarios', auditoriaMiddleware, usuariosRoutes);
app.use('/api/licencias', auditoriaMiddleware, licenciasRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', protect, reportesRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);

app.get('/api/roles', protect, async (req, res) => {
  try {
    const activos = req.query.activos === '1';
    const where: any = {};
    if (activos) {
      where.activo = 1;
    }
    const roles = await prisma.rolUsuario.findMany({
      where,
      orderBy: { id: 'asc' }
    });
    return res.status(200).json(
      roles.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
        activo: r.activo === 1,
      })),
    );
  } catch (error) {
    console.error('🔥 ERROR AL LISTAR ROLES:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
});

function normalizarCodigoRol(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

app.post('/api/roles', protect, requireRoles('ADMIN'), async (req, res) => {
  try {
    const nombre = String(req.body?.nombre ?? '').trim();
    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre del rol es requerido.' });
    }

    let codigo = normalizarCodigoRol(nombre);
    if (!codigo) {
      codigo = `ROL_${Date.now()}`;
    }

    const duplicado = await prisma.rolUsuario.findFirst({
      where: { OR: [{ codigo }, { nombre }] },
    });
    if (duplicado) {
      return res.status(409).json({ success: false, error: 'Ya existe un rol con ese nombre o código.' });
    }

    const activo = req.body?.activo === false ? 0 : 1;
    const created = await prisma.rolUsuario.create({
      data: { codigo, nombre, activo },
    });

    return res.status(201).json({
      id: created.id,
      nombre: created.nombre,
      codigo: created.codigo,
      activo: created.activo === 1,
    });
  } catch (error) {
    console.error('🔥 ERROR AL CREAR ROL:', error);
    return res.status(500).json({ success: false, error: 'Error al crear rol' });
  }
});

app.patch('/api/roles/:id', protect, requireRoles('ADMIN'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'ID de rol inválido.' });
    }
    const { activo, nombre } = req.body ?? {};
    const data: { activo?: number; nombre?: string } = {};
    if (activo !== undefined) {
      data.activo = activo ? 1 : 0;
    }
    if (nombre !== undefined) {
      data.nombre = String(nombre).trim();
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'Nada que actualizar.' });
    }
    const updated = await prisma.rolUsuario.update({ where: { id }, data });
    return res.status(200).json({
      id: updated.id,
      nombre: updated.nombre,
      codigo: updated.codigo,
      activo: updated.activo === 1,
    });
  } catch (error) {
    console.error('🔥 ERROR AL ACTUALIZAR ROL:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar rol' });
  }
});

import { errorHandler } from './SRC/middlewares/error-handler';

function resolverCarpetaFrontend(): string | null {
  const candidatos = [
    process.env.STATIC_DIR?.trim(),
    path.join(process.cwd(), 'frontend/dist/frontend/browser'),
    path.join(process.cwd(), 'frontend/dist/frontend'),
    path.join(__dirname, '../frontend/dist/frontend/browser'),
    path.join(__dirname, '../../frontend/dist/frontend/browser'),
    path.join(__dirname, '../frontend/dist/frontend'),
    path.join(__dirname, '../../frontend/dist/frontend'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidatos) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

/** En producción sirve el build de Angular (misma URL que la API). */
function configurarFrontendEstatico(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const staticRoot = resolverCarpetaFrontend();
  if (!staticRoot) {
    console.warn('[SIDEP] No se encontró el build del frontend; solo API disponible.');
    return;
  }

  app.use(express.static(staticRoot, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
  });
  console.log(`[SIDEP] Frontend público servido desde ${staticRoot}`);
}

configurarFrontendEstatico();

// Exportamos 'app' pero NO lo encendemos aquí
app.use(errorHandler);

export default app;