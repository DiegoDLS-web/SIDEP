import { Router } from 'express';
import { login, register } from './autenticacion.controller'; // Asegúrate de importar register
import { protect } from '../../middlewares/auth.middleware';
import { me, logout } from './autenticacion.controller'; // Importamos 'me' y 'logout'

const router = Router();

// ... tus importaciones existentes
router.post('/login', login);
router.post('/register', register);

// Rutas nuevas que el frontend espera
router.get('/me', protect, me);
router.post('/logout', protect, logout);

export default router;