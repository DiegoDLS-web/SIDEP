import { Router } from 'express';
import { getPartes, registrarParte } from './operaciones.controller';
import { protect } from '../../middlewares/auth.middleware';

const router = Router();

// Rutas protegidas con JWT
router.get('/partes', protect, getPartes);
router.post('/partes', protect, registrarParte);

export default router;