import { Router } from 'express';
import { getPartes, registrarParte } from './operaciones.controller';

const router = Router();

// Ruta para pedir la lista de partes: GET /api/v1/operaciones/partes
router.get('/partes', getPartes);

// Ruta para guardar un nuevo parte: POST /api/v1/operaciones/partes
router.post('/partes', registrarParte);

export default router;