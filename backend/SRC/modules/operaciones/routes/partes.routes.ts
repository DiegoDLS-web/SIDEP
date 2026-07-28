import { Router } from 'express';
import {
  crearParte,
  obtenerPartes,
  obtenerPagina,
  obtenerMetricas,
  obtenerAnaliticaParte,
  obtenerPartePorId,
  actualizarParte,
  anularParte,
  exportarPartesExcel,
  exportarPartesPdf,
} from '../controllers/partes.controller';
import { requireRoles } from '../../../middlewares/role.middleware';
import { validate, validateQuery } from '../../../middlewares/validate';
import { actualizarParteDto, crearParteDto } from '../dtos/parte.dto';
import { filtrosPartesExportQueryDto } from '../../logistica/dtos/inventario.dto';

const router = Router();

/** Roles operativos que pueden registrar y editar partes de emergencia. */
const rolesOperacionPartes = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE', 'VOLUNTARIOS');

router.get('/pagina', obtenerPagina);
router.get('/metricas', obtenerMetricas);
router.get('/export/excel', validateQuery(filtrosPartesExportQueryDto), exportarPartesExcel);
router.get('/export/pdf', validateQuery(filtrosPartesExportQueryDto), exportarPartesPdf);
router.get('/', obtenerPartes);
router.post('/', rolesOperacionPartes, validate(crearParteDto), crearParte);
router.get('/:id/analitica', obtenerAnaliticaParte);
router.get('/:id', obtenerPartePorId);
router.patch('/:id', rolesOperacionPartes, validate(actualizarParteDto), actualizarParte);
router.delete('/:id', requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), anularParte);

export default router;
