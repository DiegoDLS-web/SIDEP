import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate, validateQuery } from '../../../middlewares/validate';
import {
  actualizarAsistenciaDto,
  historialPropioQueryDto,
  listarAsistenciaQueryDto,
  miAsistenciaDto,
  panelCuarteleroQueryDto,
  planillaAsistenciaQueryDto,
  registrarAsistenciaDto,
  upsertCeldaAsistenciaDto,
} from '../dtos/asistencia-cuartelero.dto';
import {
  deleteAsistencia,
  getAsistencia,
  getAsistencias,
  getMiHistorial,
  getMiPanel,
  getPlanillaAsistencia,
  getResumenAsistencia,
  patchAsistencia,
  postAsistencia,
  postCeldaAsistencia,
  postMiAsistencia,
} from '../controllers/asistencia-cuarteleros.controller';

const router = Router();
const rolesGestion = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE');

router.get('/planilla', protect, validateQuery(planillaAsistenciaQueryDto), getPlanillaAsistencia);
router.get('/resumen', protect, getResumenAsistencia);
router.get('/mi-panel', protect, validateQuery(panelCuarteleroQueryDto), getMiPanel);
router.get('/mi-historial', protect, validateQuery(historialPropioQueryDto), getMiHistorial);
router.get('/', protect, validateQuery(listarAsistenciaQueryDto), getAsistencias);
router.post('/mi-celda', protect, validate(miAsistenciaDto), postMiAsistencia);
router.get('/:id', protect, getAsistencia);
router.post('/celda', protect, rolesGestion, validate(upsertCeldaAsistenciaDto), postCeldaAsistencia);
router.post('/', protect, rolesGestion, validate(registrarAsistenciaDto), postAsistencia);
router.patch('/:id', protect, rolesGestion, validate(actualizarAsistenciaDto), patchAsistencia);
router.delete('/:id', protect, rolesGestion, deleteAsistencia);

export default router;
