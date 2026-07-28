"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const carrosController = __importStar(require("./controllers/carros.controller"));
const checklistsController = __importStar(require("./controllers/checklists.controller"));
const equipamientoController = __importStar(require("./controllers/equipamiento.controller"));
const catalogoMaterialesController = __importStar(require("./controllers/catalogo-materiales.controller"));
const inventariosController = __importStar(require("./controllers/inventarios.controller"));
const inventarioItemsController = __importStar(require("./controllers/inventario-items.controller"));
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_1 = require("../../middlewares/validate");
const inventario_dto_1 = require("./dtos/inventario.dto");
const upload_excel_middleware_1 = require("../../shared/storage/upload-excel.middleware");
const router = (0, express_1.Router)();
const rolesLogistica = (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE');
// --- CARROS ---
router.get('/carros', auth_middleware_1.protect, carrosController.getCarros);
router.get('/carros/historial-general', auth_middleware_1.protect, carrosController.getHistorialGeneralCarros);
router.patch('/carros/mantenimientos/:id', auth_middleware_1.protect, rolesLogistica, carrosController.editMantenimientoHistorial);
router.get('/carros/:id', auth_middleware_1.protect, carrosController.obtenerCarroPorId);
router.post('/carros', auth_middleware_1.protect, rolesLogistica, carrosController.addCarro);
router.patch('/carros/:id', auth_middleware_1.protect, rolesLogistica, carrosController.editCarro);
router.patch('/carros/:id/estado', auth_middleware_1.protect, rolesLogistica, carrosController.toggleEstadoCarro);
// --- EQUIPAMIENTO ---
router.post('/equipamiento/bolsos', auth_middleware_1.protect, rolesLogistica, equipamientoController.addBolsoTrauma);
router.get('/equipamiento/bolsos/selector', auth_middleware_1.protect, equipamientoController.getSelectorBolsos);
router.get('/equipamiento/bolsos/historial', auth_middleware_1.protect, equipamientoController.getHistorialBolsos);
router.get('/equipamiento/bolsos/historial/:id', auth_middleware_1.protect, equipamientoController.getHistorialBolsoPorId);
router.get('/equipamiento/bolsos/unidad/:unidad', auth_middleware_1.protect, equipamientoController.getUnidadBolsoTrauma);
router.post('/equipamiento/bolsos/unidad/:unidad/revision', auth_middleware_1.protect, equipamientoController.postRevisionBolsoTrauma);
router.post('/equipamiento/materiales', auth_middleware_1.protect, rolesLogistica, equipamientoController.addMaterialCarro);
router.get('/equipamiento/carro/:carroId', auth_middleware_1.protect, equipamientoController.getInventarioCarro);
router.get('/equipamiento/carro/:carroId/checklist-inventario', auth_middleware_1.protect, equipamientoController.getInventarioChecklistCarro);
router.post('/equipamiento/carro/:carroId/sincronizar-inventario', auth_middleware_1.protect, rolesLogistica, equipamientoController.postSincronizarInventarioCarro);
// --- CATÁLOGO DE MATERIALES ---
router.get('/catalogo-materiales', auth_middleware_1.protect, catalogoMaterialesController.getMateriales);
router.post('/catalogo-materiales', auth_middleware_1.protect, rolesLogistica, catalogoMaterialesController.postMaterial);
router.patch('/catalogo-materiales/:id', auth_middleware_1.protect, rolesLogistica, catalogoMaterialesController.patchMaterial);
router.patch('/catalogo-materiales/:id/activo', auth_middleware_1.protect, rolesLogistica, catalogoMaterialesController.patchMaterialActivo);
// --- INVENTARIOS / BODEGA ---
router.get('/inventarios/resumen', auth_middleware_1.protect, inventariosController.getResumen);
router.get('/inventarios/carros', auth_middleware_1.protect, inventariosController.getInventarioCarros);
// --- INVENTARIO INSTITUCIONAL (planilla / EPP) ---
router.get('/inventarios/movimientos', auth_middleware_1.protect, inventarioItemsController.getMovimientosItems);
router.get('/inventarios/alertas', auth_middleware_1.protect, inventarioItemsController.getAlertasInventario);
router.get('/inventarios/matriz-epp', auth_middleware_1.protect, inventarioItemsController.getMatrizEpp);
router.get('/inventarios/stock-por-nombres', auth_middleware_1.protect, inventarioItemsController.getStockPorNombres);
router.get('/inventarios/epp/usuario/:rut', auth_middleware_1.protect, inventarioItemsController.getEppPorUsuario);
router.get('/inventarios/items', auth_middleware_1.protect, inventarioItemsController.getItems);
router.post('/inventarios/items', auth_middleware_1.protect, rolesLogistica, (0, validate_1.validate)(inventario_dto_1.crearItemInventarioDto), inventarioItemsController.postCrearItem);
router.get('/inventarios/items/export', auth_middleware_1.protect, (0, validate_1.validateQuery)(inventario_dto_1.filtrosInventarioQueryDto), inventarioItemsController.getExportData);
router.get('/inventarios/items/export/excel', auth_middleware_1.protect, (0, validate_1.validateQuery)(inventario_dto_1.filtrosInventarioQueryDto), inventarioItemsController.getExportExcel);
router.get('/inventarios/items/export/pdf', auth_middleware_1.protect, (0, validate_1.validateQuery)(inventario_dto_1.filtrosInventarioQueryDto), inventarioItemsController.getExportPdf);
router.get('/inventarios/bodegas', auth_middleware_1.protect, inventarioItemsController.getBodegas);
router.get('/inventarios/importacion/estado', auth_middleware_1.protect, inventarioItemsController.getEstadoImportacion);
router.post('/inventarios/importacion', auth_middleware_1.protect, rolesLogistica, upload_excel_middleware_1.uploadExcelMemory.single('archivo'), inventarioItemsController.postImportacionInventario);
router.post('/inventarios/items/:id/movimiento', auth_middleware_1.protect, rolesLogistica, (0, validate_1.validate)(inventario_dto_1.movimientoInventarioDto), inventarioItemsController.postMovimientoItem);
router.patch('/inventarios/items/:id/cantidad', auth_middleware_1.protect, rolesLogistica, (0, validate_1.validate)(inventario_dto_1.ajustarCantidadDto), inventarioItemsController.patchAjustarCantidad);
router.patch('/inventarios/items/:id/meta', auth_middleware_1.protect, rolesLogistica, (0, validate_1.validate)(inventario_dto_1.metaItemDto), inventarioItemsController.patchMetaItem);
router.post('/inventarios/items/:id/asignar-epp', auth_middleware_1.protect, rolesLogistica, (0, validate_1.validate)(inventario_dto_1.asignarEppDto), inventarioItemsController.postAsignarEpp);
router.delete('/inventarios/items/asignaciones/:asignacionId', auth_middleware_1.protect, rolesLogistica, inventarioItemsController.deleteAsignacionEpp);
// --- CHECKLISTS ---
router.get('/checklist/plantillas', auth_middleware_1.protect, checklistsController.obtenerPlantillas);
router.post('/checklist/plantillas', auth_middleware_1.protect, rolesLogistica, checklistsController.addPlantilla);
router.patch('/checklist/plantillas/:id', auth_middleware_1.protect, rolesLogistica, checklistsController.editPlantilla);
router.post('/checklist/ejecucion', auth_middleware_1.protect, checklistsController.addEjecucion);
router.get('/checklist/historial', auth_middleware_1.protect, checklistsController.getHistorial);
router.get('/checklist/historial-batch', auth_middleware_1.protect, checklistsController.getHistorialBatch);
router.get('/checklist/ejecucion/:id', auth_middleware_1.protect, checklistsController.getDetalleEjecucion);
router.patch('/checklist/ejecucion/:id/estado', auth_middleware_1.protect, rolesLogistica, checklistsController.patchEstadoEjecucion);
exports.default = router;
