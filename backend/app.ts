import express from 'express';
import cors from 'cors';
import authRoutes from './SRC/modules/autenticacion/autenticacion.routes';
import logisticaRoutes from './SRC/modules/logistica/logistica.routes';
import operacionesRoutes from './SRC/modules/operaciones/operaciones.routes';
import rrhhRoutes from './SRC/modules/rrhh/routes/rrhh.routes';
import usuariosRoutes from './SRC/modules/rrhh/routes/usuarios.routes';
import licenciasRoutes from './SRC/modules/rrhh/routes/licencias.routes';
import auditoriaRoutes from './SRC/modules/auditoria/routes/auditoria.routes';
import { protect } from './SRC/middlewares/auth.middleware';
import prisma from './SRC/prisma';
import { auditoriaMiddleware } from './SRC/modules/auditoria/middlewares/auditoria.middleware';

const app = express();

// Middlewares obligatorios
app.use(cors()); // Permite que el frontend de Angular se comunique
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
      '/checklist',
      '/checklist-era',
      '/bolso-trauma',
      '/licencias-medicas',
      '/analitica-operacional',
      '/usuarios',
      '/configuraciones',
      '/perfil'
    ];

    const sinCatalogoNiAdmin = OPCIONES_MENU_SIDEP.filter(
      (path) =>
        path !== '/usuarios' &&
        path !== '/configuraciones' &&
        path !== '/catalogo-emergencias'
    );

    const operativesAdminCapitan = OPCIONES_MENU_SIDEP.filter(
      (path) => path !== '/usuarios' && path !== '/configuraciones'
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

// Enchufamos los módulos
app.use('/api/auth', authRoutes);
app.use('/api/logistica', logisticaRoutes);
app.use('/api/operaciones', operacionesRoutes);
app.use('/api/rrhh', auditoriaMiddleware, rrhhRoutes);
app.use('/api/usuarios', auditoriaMiddleware, usuariosRoutes);
app.use('/api/licencias', auditoriaMiddleware, licenciasRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// Endpoint global de Roles (consumido por RolesService en el frontend)
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
    return res.status(200).json(roles);
  } catch (error) {
    console.error('🔥 ERROR AL LISTAR ROLES:', error);
    return res.status(500).json({ success: false, error: 'Error al obtener roles' });
  }
});

// Exportamos 'app' pero NO lo encendemos aquí
export default app;