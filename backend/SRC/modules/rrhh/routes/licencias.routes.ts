import { Router } from 'express';
import {
  getMisLicencias,
  postLicencia,
  patchLicencia,
  getLicencias,
  patchEstado,
  getLicenciasActivas,
  getResumen,
} from '../controllers/licencias.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';
import { uploadAdjuntoLicencia } from '../../../shared/storage';

const router = Router();

// ── Rutas que cualquier usuario autenticado puede usar ──────────────

// Mis licencias propias
router.get('/mis', protect, getMisLicencias);

// Crear solicitud (multipart para adjunto opcional)
router.post('/', protect, uploadAdjuntoLicencia.single('adjunto'), postLicencia);

// Editar una licencia propia (solo PENDIENTE)
router.patch('/:id', protect, patchLicencia);

// ── Rutas de gestión (oficialidad) ──────────────────────────────────

// Listar todas las licencias
router.get('/', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getLicencias);

// Cambiar estado (aprobar/rechazar/anular)
router.patch('/:id/estado', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), patchEstado);

// Licencias activas en una fecha
router.get('/activas', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getLicenciasActivas);

// Resumen diario
router.get('/resumen', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), getResumen);

export default router;
