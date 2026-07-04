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
import { requireRoles } from '../../../middlewares/role.middleware';

const router = Router();

router.get('/pagina', obtenerPagina);
router.get('/metricas', obtenerMetricas);
router.get('/', obtenerPartes);
router.post('/', crearParte);
router.get('/:id', obtenerPartePorId);
router.patch('/:id', actualizarParte);
router.delete('/:id', requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), anularParte);

export default router;
