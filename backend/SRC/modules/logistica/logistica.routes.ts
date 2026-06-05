import { Router } from 'express';
import { getCarros, registrarChecklist } from './logistica.controller';

const router = Router();

// Ruta para pedir la lista de carros: GET /api/v1/logistica/carros
router.get('/carros', getCarros);

// Ruta para guardar un checklist: POST /api/v1/logistica/checklist
router.post('/checklist', registrarChecklist);

export default router;