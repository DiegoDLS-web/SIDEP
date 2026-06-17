import { Router } from 'express';
import partesRoutes from './routes/partes.routes';
import {
  getAsistenciasVoluntario,
  postAsistencia,
  deleteAsistencia,
  postAsistenciaDirecta,
  deleteAsistenciaDirecta,
} from './controllers/asistencias.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

router.use('/partes', protect, partesRoutes);

router.get('/asistencia', protect, getAsistenciasVoluntario);
router.post('/asistencia', protect, postAsistenciaDirecta);
router.delete('/asistencia/:asistenciaId', protect, deleteAsistenciaDirecta);

router.get('/asistencias', protect, getAsistenciasVoluntario);
router.post('/partes/:parteId/asistencias', protect, postAsistencia);
router.delete('/partes/:parteId/asistencias/:asistenciaId', protect, deleteAsistencia);

export default router;
