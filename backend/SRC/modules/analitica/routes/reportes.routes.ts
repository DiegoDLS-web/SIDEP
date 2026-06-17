import { Router } from 'express';
import { getEmergencias, getCuadroHonor, getAnaliticaOperacional } from '../controllers/reportes.controller';

const router = Router();

router.get('/emergencias', getEmergencias);
router.get('/cuadro-honor', getCuadroHonor);
router.get('/analitica-operacional', getAnaliticaOperacional);

export default router;
