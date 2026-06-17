import { Router } from 'express';
import {
  crearParte,
  obtenerPartes,
  obtenerPartePorId,
  actualizarParte,
  anularParte
} from '../controllers/partes.controller';

const router = Router();

// Rutas generales
router.get('/', obtenerPartes);
router.post('/', crearParte);

// Rutas específicas por ID
router.get('/:id', obtenerPartePorId);
router.patch('/:id', actualizarParte);
router.delete('/:id', anularParte);

export default router;