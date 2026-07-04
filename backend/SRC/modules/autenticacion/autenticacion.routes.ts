import { Router } from 'express';
import {
    login,
    register,
    me,
    logout,
    recuperarPassword,
    restablecerPassword,
} from './autenticacion.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate';
import { registerDto } from './dtos/auth.dto';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const recoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/login', loginLimiter, login);
/** Registro público deshabilitado: usar POST /api/usuarios con sesión de oficialidad. */
router.post(
  '/register',
  protect,
  requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'),
  validate(registerDto),
  register,
);
router.post('/recuperar-password', recoverLimiter, recuperarPassword);
router.post('/restablecer-password', recoverLimiter, restablecerPassword);

router.get('/me', protect, me);
router.post('/logout', protect, logout);

export default router;
