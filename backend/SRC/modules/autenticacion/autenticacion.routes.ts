import { Router } from 'express';
import { login, register } from './autenticacion.controller'; // Asegúrate de importar register
import { protect } from '../../middlewares/auth.middleware';
import { me, logout } from './autenticacion.controller'; // Importamos 'me' y 'logout'
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ... tus importaciones existentes
router.post('/login', loginLimiter, login);
router.post('/register', register);

// Rutas nuevas que el frontend espera
router.get('/me', protect, me);
router.post('/logout', protect, logout);

export default router;