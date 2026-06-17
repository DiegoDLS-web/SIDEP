import { Router } from 'express';
import { getAuditoria, exportarAuditoria } from '../controllers/auditoria.controller';
import { protect } from '../../../middlewares/auth.middleware';
import { requireRoles } from '../../../middlewares/role.middleware';

const router = Router();

// Solo los administradores pueden consultar el registro de auditoría
router.get('/', protect, requireRoles('ADMIN'), getAuditoria);
router.get('/exportar', protect, requireRoles('ADMIN'), exportarAuditoria);

export default router;
