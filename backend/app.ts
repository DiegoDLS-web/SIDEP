import express from 'express';
import cors from 'cors';
import authRoutes from './SRC/modules/autenticacion/autenticacion.routes';
import logisticaRoutes from './SRC/modules/logistica/logistica.routes';
import operacionesRoutes from './SRC/modules/operaciones/operaciones.routes';
import rrhhRoutes from './SRC/modules/rrhh/routes/rrhh.routes';
import usuariosRoutes from './SRC/modules/rrhh/routes/usuarios.routes';
import { protect } from './SRC/middlewares/auth.middleware';

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
app.get('/api/branding-public', (req, res) => {
  res.status(200).json({ nombreCompania: '1ª Compañía Santa Juana' });
});

// 3. Ruta de Navegación del Usuario (Basada en roles)
app.get('/api/auth/mi-navegacion', protect, (req, res) => {
  const user = (req as any).user;
  const rol = (user.rol || '').trim().toUpperCase();

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

  const operativosAdminCapitan = OPCIONES_MENU_SIDEP.filter(
    (path) => path !== '/usuarios' && path !== '/configuraciones'
  );

  let paths: string[] = [];

  if (rol === 'ADMIN') {
    paths = OPCIONES_MENU_SIDEP;
  } else if (rol === 'CAPITAN') {
    paths = [...operativosAdminCapitan, '/usuarios'];
  } else if (rol === 'TENIENTE') {
    paths = [...sinCatalogoNiAdmin, '/usuarios'];
  } else {
    paths = sinCatalogoNiAdmin;
  }

  res.status(200).json({ paths });
});

// Enchufamos los módulos
app.use('/api/auth', authRoutes);
app.use('/api/logistica', logisticaRoutes);
app.use('/api/operaciones', operacionesRoutes);
app.use('/api/rrhh', rrhhRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Exportamos 'app' pero NO lo encendemos aquí
export default app;