import { Router } from 'express';
import {
  getUsuarios,
  getUsuariosSelector,
  getMetricas,
  getUsuariosPaginado,
  getUsuarioById,
  postUsuario,
  patchUsuario,
  deleteUsuario,
  resetPassword,
} from '../controllers/usuarios.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';

import { validate } from '../../../middlewares/validate';
import { crearUsuarioDto, actualizarUsuarioDto } from '../dtos/usuario.dto';

const router = Router();

router.get('/', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getUsuarios);
router.get('/selector', protect, getUsuariosSelector);
router.get('/metricas', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getMetricas);
router.get('/pagina', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getUsuariosPaginado);
router.get('/:rut', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getUsuarioById);
router.post('/', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), validate(crearUsuarioDto), postUsuario);
router.patch('/:rut', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), validate(actualizarUsuarioDto), patchUsuario);
router.delete('/:rut', protect, requireRoles('ADMIN'), deleteUsuario);
router.patch('/:rut/reset-password', protect, requireRoles('ADMIN'), resetPassword);

export default router;
