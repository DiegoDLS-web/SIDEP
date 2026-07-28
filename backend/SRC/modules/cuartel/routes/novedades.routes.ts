import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate, validateQuery } from '../../../middlewares/validate';
import {
  actualizarNovedadDto,
  crearNovedadDto,
  listarNovedadesQueryDto,
} from '../dtos/novedad.dto';
import {
  deleteNovedad,
  getNovedades,
  patchNovedad,
  postNovedad,
} from '../controllers/novedades.controller';

const router = Router();
const rolesGestion = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE');

router.get('/', protect, validateQuery(listarNovedadesQueryDto), getNovedades);
router.post('/', protect, validate(crearNovedadDto), postNovedad);
router.patch('/:id', protect, validate(actualizarNovedadDto), patchNovedad);
router.delete('/:id', protect, rolesGestion, deleteNovedad);

export default router;
