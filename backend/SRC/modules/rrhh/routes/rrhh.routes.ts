import { Router } from 'express';
import {
  getMiPerfil,
  patchMiPerfil,
  getMiResumenOperativo,
  subirFotoPerfil,
  subirArchivoLicencia,
  cambiarMiPassword,
} from '../controllers/rrhh.controller';
import { obtenerConfiguracionOperativa } from '../controllers/configuraciones.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { uploadImage, uploadPdf } from '../../../shared/storage';
import { validate } from '../../../middlewares/validate';
import { cambiarPasswordDto } from '../../autenticacion/dtos/auth.dto';
import configuracionesRoutes from './configuraciones.routes';

const router = Router();

// 1. Rutas generales de perfil
router.get('/mi-perfil', protect, getMiPerfil);
router.patch('/mi-perfil', protect, patchMiPerfil);
router.get('/mi-resumen-operativo', protect, getMiResumenOperativo);

// 2. Rutas para subida directa de archivos (Multipart/Form-data) a Cloudinary
router.post('/mi-perfil/foto', protect, uploadImage.single('foto'), subirFotoPerfil);
router.post('/licencias/archivo', protect, uploadPdf.single('documento'), subirArchivoLicencia);

// 3. Cambio de contraseña propia
router.patch('/mi-perfil/password', protect, validate(cambiarPasswordDto), cambiarMiPassword);

// 3b. Configuración operativa (sin datos sensibles de administración)
router.get('/configuracion-operativa', protect, obtenerConfiguracionOperativa);

// 4. Configuraciones Globales del Sistema
router.use('/configuraciones', configuracionesRoutes);

export default router;
