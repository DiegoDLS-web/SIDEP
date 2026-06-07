import { Router } from 'express';
import {
  getUsuarios,
  getMetricas,
  getUsuariosPaginado,
  getUsuarioById,
  postUsuario,
  patchUsuario,
  deleteUsuario,
} from '../controllers/usuarios.controller';
import { protect } from '../../../middlewares/auth.middleware';

const router = Router();

router.get('/', protect, getUsuarios);
router.get('/metricas', protect, getMetricas);
router.get('/pagina', protect, getUsuariosPaginado);
router.get('/:id', protect, getUsuarioById);
router.post('/', protect, postUsuario);
router.patch('/:id', protect, patchUsuario);
router.delete('/:id', protect, deleteUsuario);

export default router;
