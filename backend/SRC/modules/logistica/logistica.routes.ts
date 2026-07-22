import { Router } from 'express';
import * as carrosController from './controllers/carros.controller';
import * as checklistsController from './controllers/checklists.controller';
import * as equipamientoController from './controllers/equipamiento.controller';
import * as catalogoMaterialesController from './controllers/catalogo-materiales.controller';
import * as inventariosController from './controllers/inventarios.controller';
import * as inventarioItemsController from './controllers/inventario-items.controller';
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

// --- CATÁLOGO DE MATERIALES ---
router.get('/catalogo-materiales', protect, catalogoMaterialesController.getMateriales);
router.post('/catalogo-materiales', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), catalogoMaterialesController.postMaterial);
router.patch('/catalogo-materiales/:id', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), catalogoMaterialesController.patchMaterial);
router.patch('/catalogo-materiales/:id/activo', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), catalogoMaterialesController.patchMaterialActivo);

// --- INVENTARIOS / BODEGA ---
router.get('/inventarios/resumen', protect, inventariosController.getResumen);
router.get('/inventarios/bodega', protect, inventariosController.getStockBodega);
router.get('/inventarios/carros', protect, inventariosController.getInventarioCarros);
router.get('/inventarios/bodega/movimientos', protect, inventariosController.getMovimientosBodega);
router.post('/inventarios/bodega/movimientos', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), inventariosController.postMovimientoBodega);

// --- INVENTARIO INSTITUCIONAL (planilla / EPP) ---
router.get('/inventarios/items', protect, inventarioItemsController.getItems);
router.get('/inventarios/items/export', protect, inventarioItemsController.getExportData);
router.get('/inventarios/bodegas', protect, inventarioItemsController.getBodegas);
router.get('/inventarios/importacion/estado', protect, inventarioItemsController.getEstadoImportacion);
router.patch('/inventarios/items/:id/cantidad', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), inventarioItemsController.patchAjustarCantidad);
router.post('/inventarios/items/:id/asignar-epp', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), inventarioItemsController.postAsignarEpp);
router.delete('/inventarios/items/asignaciones/:asignacionId', protect, requireRoles('ADMIN', 'CAPITAN', 'TENIENTE'), inventarioItemsController.deleteAsignacionEpp);

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
