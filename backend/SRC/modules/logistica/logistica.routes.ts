import { Router } from 'express';
import * as carrosController from './controllers/carros.controller';
import * as checklistsController from './controllers/checklists.controller';
import * as equipamientoController from './controllers/equipamiento.controller';
import * as catalogoMaterialesController from './controllers/catalogo-materiales.controller';
import * as inventariosController from './controllers/inventarios.controller';
import * as inventarioItemsController from './controllers/inventario-items.controller';
import { protect } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/role.middleware';
import { validate, validateQuery } from '../../middlewares/validate';
import {
  crearItemInventarioDto,
  movimientoInventarioDto,
  asignarEppDto,
  ajustarCantidadDto,
  metaItemDto,
  filtrosInventarioQueryDto,
} from './dtos/inventario.dto';
import { uploadExcelMemory } from '../../shared/storage/upload-excel.middleware';

const router = Router();
const rolesLogistica = requireRoles('ADMIN', 'CAPITAN', 'TENIENTE');

// --- CARROS ---
router.get('/carros', protect, carrosController.getCarros);
router.get('/carros/historial-general', protect, carrosController.getHistorialGeneralCarros);
router.patch(
    '/carros/mantenimientos/:id',
    protect,
    rolesLogistica,
    carrosController.editMantenimientoHistorial,
);
router.get('/carros/:id', protect, carrosController.obtenerCarroPorId);
router.post('/carros', protect, rolesLogistica, carrosController.addCarro);
router.patch('/carros/:id', protect, rolesLogistica, carrosController.editCarro);
router.patch('/carros/:id/estado', protect, rolesLogistica, carrosController.toggleEstadoCarro);

// --- EQUIPAMIENTO ---
router.post('/equipamiento/bolsos', protect, rolesLogistica, equipamientoController.addBolsoTrauma);
router.get('/equipamiento/bolsos/selector', protect, equipamientoController.getSelectorBolsos);
router.get('/equipamiento/bolsos/historial', protect, equipamientoController.getHistorialBolsos);
router.get('/equipamiento/bolsos/historial/:id', protect, equipamientoController.getHistorialBolsoPorId);
router.get('/equipamiento/bolsos/unidad/:unidad', protect, equipamientoController.getUnidadBolsoTrauma);
router.post('/equipamiento/bolsos/unidad/:unidad/revision', protect, equipamientoController.postRevisionBolsoTrauma);
router.post('/equipamiento/materiales', protect, rolesLogistica, equipamientoController.addMaterialCarro);
router.get('/equipamiento/carro/:carroId', protect, equipamientoController.getInventarioCarro);
router.get('/equipamiento/carro/:carroId/checklist-inventario', protect, equipamientoController.getInventarioChecklistCarro);
router.post('/equipamiento/carro/:carroId/sincronizar-inventario', protect, rolesLogistica, equipamientoController.postSincronizarInventarioCarro);

// --- CATÁLOGO DE MATERIALES ---
router.get('/catalogo-materiales', protect, catalogoMaterialesController.getMateriales);
router.post('/catalogo-materiales', protect, rolesLogistica, catalogoMaterialesController.postMaterial);
router.patch('/catalogo-materiales/:id', protect, rolesLogistica, catalogoMaterialesController.patchMaterial);
router.patch('/catalogo-materiales/:id/activo', protect, rolesLogistica, catalogoMaterialesController.patchMaterialActivo);

// --- INVENTARIOS / BODEGA ---
router.get('/inventarios/resumen', protect, inventariosController.getResumen);
router.get('/inventarios/carros', protect, inventariosController.getInventarioCarros);

// --- INVENTARIO INSTITUCIONAL (planilla / EPP) ---
router.get('/inventarios/movimientos', protect, inventarioItemsController.getMovimientosItems);
router.get('/inventarios/alertas', protect, inventarioItemsController.getAlertasInventario);
router.get('/inventarios/matriz-epp', protect, inventarioItemsController.getMatrizEpp);
router.get('/inventarios/stock-por-nombres', protect, inventarioItemsController.getStockPorNombres);
router.get('/inventarios/epp/usuario/:rut', protect, inventarioItemsController.getEppPorUsuario);
router.get('/inventarios/items', protect, inventarioItemsController.getItems);
router.post('/inventarios/items', protect, rolesLogistica, validate(crearItemInventarioDto), inventarioItemsController.postCrearItem);
router.get('/inventarios/items/export', protect, validateQuery(filtrosInventarioQueryDto), inventarioItemsController.getExportData);
router.get('/inventarios/items/export/excel', protect, validateQuery(filtrosInventarioQueryDto), inventarioItemsController.getExportExcel);
router.get('/inventarios/items/export/pdf', protect, validateQuery(filtrosInventarioQueryDto), inventarioItemsController.getExportPdf);
router.get('/inventarios/bodegas', protect, inventarioItemsController.getBodegas);
router.get('/inventarios/importacion/estado', protect, inventarioItemsController.getEstadoImportacion);
router.post(
  '/inventarios/importacion',
  protect,
  rolesLogistica,
  uploadExcelMemory.single('archivo'),
  inventarioItemsController.postImportacionInventario,
);
router.post('/inventarios/items/:id/movimiento', protect, rolesLogistica, validate(movimientoInventarioDto), inventarioItemsController.postMovimientoItem);
router.patch('/inventarios/items/:id/cantidad', protect, rolesLogistica, validate(ajustarCantidadDto), inventarioItemsController.patchAjustarCantidad);
router.patch('/inventarios/items/:id/meta', protect, rolesLogistica, validate(metaItemDto), inventarioItemsController.patchMetaItem);
router.post('/inventarios/items/:id/asignar-epp', protect, rolesLogistica, validate(asignarEppDto), inventarioItemsController.postAsignarEpp);
router.delete('/inventarios/items/asignaciones/:asignacionId', protect, rolesLogistica, inventarioItemsController.deleteAsignacionEpp);

// --- CHECKLISTS ---
router.get('/checklist/plantillas', protect, checklistsController.obtenerPlantillas);
router.post('/checklist/plantillas', protect, rolesLogistica, checklistsController.addPlantilla);
router.patch('/checklist/plantillas/:id', protect, rolesLogistica, checklistsController.editPlantilla);
router.post('/checklist/ejecucion', protect, checklistsController.addEjecucion);
router.get('/checklist/historial', protect, checklistsController.getHistorial);
router.get('/checklist/historial-batch', protect, checklistsController.getHistorialBatch);
router.get('/checklist/ejecucion/:id', protect, checklistsController.getDetalleEjecucion);
router.patch(
    '/checklist/ejecucion/:id/estado',
    protect,
    rolesLogistica,
    checklistsController.patchEstadoEjecucion,
);

export default router;
