import { Router } from 'express';
import {
  crearParte,
  obtenerPartes,
  obtenerPagina,
  obtenerMetricas,
  obtenerPartePorId,
  actualizarParte,
  anularParte,
} from '../controllers/partes.controller';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate } from '../../../middlewares/validate';
import { actualizarParteDto, crearParteDto } from '../dtos/parte.dto';

const router = Router();

/** Roles operativos que pueden registrar y editar partes de emergencia. */
const rolesOperacionPartes = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE', 'VOLUNTARIOS');

router.get('/pagina', obtenerPagina);
router.get('/metricas', obtenerMetricas);
router.get('/', obtenerPartes);
router.post('/', rolesOperacionPartes, validate(crearParteDto), crearParte);
router.get('/:id', obtenerPartePorId);
router.patch('/:id', rolesOperacionPartes, validate(actualizarParteDto), actualizarParte);
router.delete('/:id', requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), anularParte);

export default router;
