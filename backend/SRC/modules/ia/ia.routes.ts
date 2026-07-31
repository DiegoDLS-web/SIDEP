import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { validate, validateQuery } from '../../middlewares/validate';
import {
  checklistCriticosDto,
  clasificarEstadoDto,
  direccionDto,
  licenciaTextoDto,
  matchingTallaDto,
  movimientoDescDto,
  notificacionesDto,
  partePayloadDto,
  preguntaDto,
  rangoDto,
  solapeLicenciaDto,
  textoLibreDto,
} from './ia.dto';
import * as ctrl from './ia.controller';

const router = Router();

router.get('/estado', protect, ctrl.getEstado);

router.post('/novedades/asistir', protect, validate(textoLibreDto), ctrl.postNovedadAsistir);

router.post('/partes/direccion', protect, validate(direccionDto), ctrl.postParteDireccion);
router.post('/partes/inconsistencias', protect, validate(partePayloadDto), ctrl.postParteInconsistencias);

router.post('/checklist/criticos', protect, validate(checklistCriticosDto), ctrl.postChecklistCriticos);
router.get('/checklist/resumen-diario', protect, ctrl.getChecklistResumenDiario);

router.post('/inventario/estado-foto', protect, validate(clasificarEstadoDto), ctrl.postInventarioEstado);
router.post('/inventario/movimiento', protect, validate(movimientoDescDto), ctrl.postInventarioMovimiento);
router.get('/inventario/alertas', protect, ctrl.getInventarioAlertas);
router.post('/inventario/talla', protect, validate(matchingTallaDto), ctrl.postInventarioTalla);

router.post('/asistencia/pregunta', protect, validate(preguntaDto), ctrl.postAsistenciaPregunta);
router.get('/asistencia/huecos', protect, validateQuery(rangoDto), ctrl.getAsistenciaHuecos);
router.get('/asistencia/faltas-semanal', protect, validateQuery(rangoDto), ctrl.getAsistenciaFaltas);

router.post('/analitica/chat', protect, validate(preguntaDto), ctrl.postAnaliticaChat);

router.post('/licencias/extraer', protect, validate(licenciaTextoDto), ctrl.postLicenciaExtraer);
router.post('/licencias/solape', protect, validate(solapeLicenciaDto), ctrl.postLicenciaSolape);

router.post('/notificaciones/priorizar', protect, validate(notificacionesDto), ctrl.postNotificaciones);

export default router;
