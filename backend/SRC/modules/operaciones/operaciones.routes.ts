import { Router } from 'express';
import { getPartes, registrarParte } from './operaciones.controller';
import { getAsistenciasVoluntario, postAsistencia, deleteAsistencia } from './controllers/asistencias.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

// Rutas protegidas con JWT
router.get('/partes', protect, getPartes);
router.post('/partes', protect, registrarParte);

// Rutas de asistencia
router.get('/asistencias', protect, getAsistenciasVoluntario);
router.post('/partes/:parteId/asistencias', protect, postAsistencia);
router.delete('/partes/:parteId/asistencias/:asistenciaId', protect, deleteAsistencia);

export default router;