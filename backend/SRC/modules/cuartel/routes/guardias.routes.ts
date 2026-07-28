import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate, validateQuery } from '../../../middlewares/validate';
import {
  actualizarGuardiaDto,
  crearGuardiaDto,
  listarGuardiasQueryDto,
} from '../dtos/guardia.dto';
import {
  deleteGuardia,
  getGuardia,
  getGuardias,
  getResumenGuardias,
  patchGuardia,
  postGuardia,
} from '../controllers/guardias.controller';

const router = Router();
const rolesGestion = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE');

router.get('/', protect, validateQuery(listarGuardiasQueryDto), getGuardias);
router.get('/resumen', protect, getResumenGuardias);
router.get('/:id', protect, getGuardia);
router.post('/', protect, rolesGestion, validate(crearGuardiaDto), postGuardia);
router.patch('/:id', protect, rolesGestion, validate(actualizarGuardiaDto), patchGuardia);
router.delete('/:id', protect, rolesGestion, deleteGuardia);

export default router;
