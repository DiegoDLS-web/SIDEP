import express from 'express';
import cors from 'cors';
import authRoutes from './SRC/modules/autenticacion/autenticacion.routes';
import logisticaRoutes from './SRC/modules/logistica/logistica.routes';
import operacionesRoutes from './SRC/modules/operaciones/operaciones.routes';

const app = express();

// Middlewares obligatorios
app.use(cors()); // Permite que el frontend de Angular se comunique
app.use(express.json()); // Permite recibir información en JSON

// --- RUTAS DE LA API (MODULARES) ---

// 1. Ruta de estado (Healthcheck)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Servidor SIDEP Operativo 🚒' });
});

// 2. Enchufamos el módulo de autenticación que acabamos de crear
app.use('/api/auth', authRoutes);
app.use('/api/logistica', logisticaRoutes);
app.use('/api/operaciones', operacionesRoutes);
// Exportamos 'app' pero NO lo encendemos aquí
export default app;