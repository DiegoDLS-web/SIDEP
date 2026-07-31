import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate, validateQuery } from '../../../middlewares/validate';
import {
  actualizarAsistenciaDto,
  listarAsistenciaQueryDto,
  planillaAsistenciaQueryDto,
  registrarAsistenciaDto,
  upsertCeldaAsistenciaDto,
} from '../dtos/asistencia-cuartelero.dto';
import {
  deleteAsistencia,
  getAsistencia,
  getAsistencias,
  getPlanillaAsistencia,
  getResumenAsistencia,
  patchAsistencia,
  postAsistencia,
  postCeldaAsistencia,
} from '../controllers/asistencia-cuarteleros.controller';

const router = Router();
const rolesGestion = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE');

router.get('/planilla', protect, validateQuery(planillaAsistenciaQueryDto), getPlanillaAsistencia);
router.get('/resumen', protect, getResumenAsistencia);
router.get('/', protect, validateQuery(listarAsistenciaQueryDto), getAsistencias);
router.get('/:id', protect, getAsistencia);
router.post('/celda', protect, rolesGestion, validate(upsertCeldaAsistenciaDto), postCeldaAsistencia);
router.post('/', protect, rolesGestion, validate(registrarAsistenciaDto), postAsistencia);
router.patch('/:id', protect, rolesGestion, validate(actualizarAsistenciaDto), patchAsistencia);
router.delete('/:id', protect, rolesGestion, deleteAsistencia);

export default router;
