import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate, validateQuery } from '../../../middlewares/validate';
import {
  actualizarAsistenciaDto,
  listarAsistenciaQueryDto,
  registrarAsistenciaDto,
} from '../dtos/asistencia-cuartelero.dto';
import {
  deleteAsistencia,
  getAsistencias,
  getResumenAsistencia,
  patchAsistencia,
  postAsistencia,
} from '../controllers/asistencia-cuarteleros.controller';

const router = Router();
const rolesGestion = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE');

router.get('/', protect, validateQuery(listarAsistenciaQueryDto), getAsistencias);
router.get('/resumen', protect, getResumenAsistencia);
router.post('/', protect, rolesGestion, validate(registrarAsistenciaDto), postAsistencia);
router.patch('/:id', protect, rolesGestion, validate(actualizarAsistenciaDto), patchAsistencia);
router.delete('/:id', protect, rolesGestion, deleteAsistencia);

export default router;
