import { Router } from 'express';
import { ejecutarCronNotificaciones } from './notificaciones.controller';

const router = Router();

router.post('/cron', ejecutarCronNotificaciones);

export default router;
