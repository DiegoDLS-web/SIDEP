import { Router } from 'express';
import { getCarros, registrarChecklist } from './logistica.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

// Ahora ambas rutas requieren que el usuario tenga un token válido
router.get('/carros', protect, getCarros);
router.post('/checklist', protect, registrarChecklist);

export default router;