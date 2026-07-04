import { Router } from 'express';
import {
  obtenerConfiguraciones,
  actualizarConfiguraciones,
  subirLogoCompania,
  actualizarTiposEmergencia
} from '../controllers/configuraciones.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { uploadImage } from '../../../shared/storage';

const router = Router();

router.get('/', protect, requireRoles('ADMIN'), obtenerConfiguraciones);
router.put('/', protect, requireRoles('ADMIN'), actualizarConfiguraciones);
router.post('/logo-compania', protect, requireRoles('ADMIN'), uploadImage.single('file'), subirLogoCompania);
router.put('/tipos-emergencia', protect, requireRoles('ADMIN'), actualizarTiposEmergencia);

export default router;
