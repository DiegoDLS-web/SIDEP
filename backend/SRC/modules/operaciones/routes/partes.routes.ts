import { Router } from 'express';
import {
  crearParte,
  obtenerPartes,
  obtenerPagina,
  obtenerMetricas,
  obtenerPartePorId,
  actualizarParte,
  anularParte,
} from '../controllers/partes.controller';

const router = Router();

router.get('/pagina', obtenerPagina);
router.get('/metricas', obtenerMetricas);
router.get('/', obtenerPartes);
router.post('/', crearParte);
router.get('/:id', obtenerPartePorId);
router.patch('/:id', actualizarParte);
router.delete('/:id', anularParte);

export default router;
