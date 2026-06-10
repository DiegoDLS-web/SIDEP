import { Router } from 'express';
import {
  obtenerConfiguraciones,
  actualizarConfiguraciones,
  subirLogoCompania,
  actualizarTiposEmergencia
} from '../controllers/configuraciones.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { uploadImage } from '../../../shared/storage';

const router = Router();

router.get('/', protect, obtenerConfiguraciones);
router.put('/', protect, actualizarConfiguraciones);
router.post('/logo-compania', protect, uploadImage.single('file'), subirLogoCompania);
router.put('/tipos-emergencia', protect, actualizarTiposEmergencia);

export default router;
