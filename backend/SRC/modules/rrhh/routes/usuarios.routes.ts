import { Router } from 'express';
import {
  getUsuarios,
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

const router = Router();

router.get('/', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getUsuarios);
router.get('/metricas', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getMetricas);
router.get('/pagina', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getUsuariosPaginado);
router.get('/:id', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getUsuarioById);
router.post('/', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), postUsuario);
router.patch('/:id', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), patchUsuario);
router.delete('/:id', protect, requireRoles('ADMIN'), deleteUsuario);
router.patch('/:id/reset-password', protect, requireRoles('ADMIN'), resetPassword);

export default router;
