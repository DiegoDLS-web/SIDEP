import { Router } from 'express';
import { protect } from '../../../middlewares/auth.middleware';
import { validateQuery } from '../../../middlewares/validate';
import { historialPropioQueryDto, panelCuarteleroQueryDto } from '../dtos/asistencia-cuartelero.dto';
import { getMiHistorial, getMiPanel } from '../controllers/asistencia-cuarteleros.controller';

/** Alias legacy: /api/cuartelero → mismos handlers que asistencia-cuarteleros. */
const router = Router();

router.get('/mi-panel', protect, validateQuery(panelCuarteleroQueryDto), getMiPanel);
router.get('/mi-historial', protect, validateQuery(historialPropioQueryDto), getMiHistorial);

export default router;
