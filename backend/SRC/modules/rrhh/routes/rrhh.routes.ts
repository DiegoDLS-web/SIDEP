import { Router } from 'express';
import {
  getMiPerfil,
  patchMiPerfil,
  getMiResumenOperativo,
  subirFotoPerfil,
  subirArchivoLicencia,
} from '../controllers/rrhh.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { uploadImage, uploadPdf } from '../../../shared/storage';

const router = Router();

// 1. Rutas generales de perfil
router.get('/mi-perfil', protect, getMiPerfil);
router.patch('/mi-perfil', protect, patchMiPerfil);
router.get('/mi-resumen-operativo', protect, getMiResumenOperativo);

// 2. Rutas para subida directa de archivos (Multipart/Form-data) a Cloudinary
router.post('/mi-perfil/foto', protect, uploadImage.single('foto'), subirFotoPerfil);
router.post('/licencias/archivo', protect, uploadPdf.single('documento'), subirArchivoLicencia);

export default router;
