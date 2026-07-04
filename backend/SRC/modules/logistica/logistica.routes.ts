import { Router } from 'express';
import * as carrosController from './controllers/carros.controller';
import * as checklistsController from './controllers/checklists.controller';
import * as equipamientoController from './controllers/equipamiento.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';

const router = Router();

// --- CARROS ---
router.get('/carros', protect, carrosController.getCarros);
router.get('/carros/historial-general', protect, carrosController.getHistorialGeneralCarros);
router.patch(
    '/carros/mantenimientos/:id',
    protect,
    requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'),
    carrosController.editMantenimientoHistorial,
);
router.get('/carros/:id', protect, carrosController.obtenerCarroPorId);
router.post('/carros', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.addCarro);
router.patch('/carros/:id', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.editCarro);
router.patch('/carros/:id/estado', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.toggleEstadoCarro);

// --- EQUIPAMIENTO ---
router.post('/equipamiento/bolsos', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), equipamientoController.addBolsoTrauma);
router.get('/equipamiento/bolsos/selector', protect, equipamientoController.getSelectorBolsos);
router.get('/equipamiento/bolsos/historial', protect, equipamientoController.getHistorialBolsos);
router.get('/equipamiento/bolsos/historial/:id', protect, equipamientoController.getHistorialBolsoPorId);
router.get('/equipamiento/bolsos/unidad/:unidad', protect, equipamientoController.getUnidadBolsoTrauma);
router.post('/equipamiento/bolsos/unidad/:unidad/revision', protect, equipamientoController.postRevisionBolsoTrauma);
router.post('/equipamiento/materiales', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), equipamientoController.addMaterialCarro);
router.get('/equipamiento/carro/:carroId', protect, equipamientoController.getInventarioCarro);
router.get('/equipamiento/carro/:carroId/checklist-inventario', protect, equipamientoController.getInventarioChecklistCarro);
router.post('/equipamiento/carro/:carroId/sincronizar-inventario', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), equipamientoController.postSincronizarInventarioCarro);

// --- CHECKLISTS ---
router.get('/checklist/plantillas', protect, checklistsController.obtenerPlantillas);
router.post('/checklist/plantillas', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), checklistsController.addPlantilla);
router.patch('/checklist/plantillas/:id', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), checklistsController.editPlantilla);
router.post('/checklist/ejecucion', protect, checklistsController.addEjecucion);
router.get('/checklist/historial', protect, checklistsController.getHistorial);
router.get('/checklist/ejecucion/:id', protect, checklistsController.getDetalleEjecucion);
router.patch(
    '/checklist/ejecucion/:id/estado',
    protect,
    requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'),
    checklistsController.patchEstadoEjecucion,
);

export default router;
