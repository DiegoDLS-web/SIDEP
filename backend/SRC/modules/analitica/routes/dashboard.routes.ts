import { Router } from 'express';
import { getDashboard } from '../controllers/reportes.controller';

const router = Router();

router.get('/resumen', getDashboard);

export default router;
