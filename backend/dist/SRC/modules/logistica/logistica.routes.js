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
const router = (0, express_1.Router)();
// --- CARROS ---
router.get('/carros', auth_middleware_1.protect, carrosController.getCarros);
router.get('/carros/historial-general', auth_middleware_1.protect, carrosController.getHistorialGeneralCarros);
router.patch('/carros/mantenimientos/:id', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.editMantenimientoHistorial);
router.get('/carros/:id', auth_middleware_1.protect, carrosController.obtenerCarroPorId);
router.post('/carros', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.addCarro);
router.patch('/carros/:id', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.editCarro);
router.patch('/carros/:id/estado', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), carrosController.toggleEstadoCarro);
// --- EQUIPAMIENTO ---
router.post('/equipamiento/bolsos', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), equipamientoController.addBolsoTrauma);
router.get('/equipamiento/bolsos/selector', auth_middleware_1.protect, equipamientoController.getSelectorBolsos);
router.get('/equipamiento/bolsos/historial', auth_middleware_1.protect, equipamientoController.getHistorialBolsos);
router.get('/equipamiento/bolsos/historial/:id', auth_middleware_1.protect, equipamientoController.getHistorialBolsoPorId);
router.get('/equipamiento/bolsos/unidad/:unidad', auth_middleware_1.protect, equipamientoController.getUnidadBolsoTrauma);
router.post('/equipamiento/bolsos/unidad/:unidad/revision', auth_middleware_1.protect, equipamientoController.postRevisionBolsoTrauma);
router.post('/equipamiento/materiales', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), equipamientoController.addMaterialCarro);
router.get('/equipamiento/carro/:carroId', auth_middleware_1.protect, equipamientoController.getInventarioCarro);
router.get('/equipamiento/carro/:carroId/checklist-inventario', auth_middleware_1.protect, equipamientoController.getInventarioChecklistCarro);
router.post('/equipamiento/carro/:carroId/sincronizar-inventario', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), equipamientoController.postSincronizarInventarioCarro);
// --- CATÁLOGO DE MATERIALES ---
router.get('/catalogo-materiales', auth_middleware_1.protect, catalogoMaterialesController.getMateriales);
router.post('/catalogo-materiales', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), catalogoMaterialesController.postMaterial);
router.patch('/catalogo-materiales/:id', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), catalogoMaterialesController.patchMaterial);
router.patch('/catalogo-materiales/:id/activo', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), catalogoMaterialesController.patchMaterialActivo);
// --- INVENTARIOS / BODEGA ---
router.get('/inventarios/resumen', auth_middleware_1.protect, inventariosController.getResumen);
router.get('/inventarios/bodega', auth_middleware_1.protect, inventariosController.getStockBodega);
router.get('/inventarios/carros', auth_middleware_1.protect, inventariosController.getInventarioCarros);
router.get('/inventarios/bodega/movimientos', auth_middleware_1.protect, inventariosController.getMovimientosBodega);
router.post('/inventarios/bodega/movimientos', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), inventariosController.postMovimientoBodega);
// --- INVENTARIO INSTITUCIONAL (planilla / EPP) ---
router.get('/inventarios/items', auth_middleware_1.protect, inventarioItemsController.getItems);
router.get('/inventarios/items/export', auth_middleware_1.protect, inventarioItemsController.getExportData);
router.get('/inventarios/bodegas', auth_middleware_1.protect, inventarioItemsController.getBodegas);
router.get('/inventarios/importacion/estado', auth_middleware_1.protect, inventarioItemsController.getEstadoImportacion);
router.patch('/inventarios/items/:id/cantidad', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), inventarioItemsController.patchAjustarCantidad);
router.post('/inventarios/items/:id/asignar-epp', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), inventarioItemsController.postAsignarEpp);
router.delete('/inventarios/items/asignaciones/:asignacionId', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), inventarioItemsController.deleteAsignacionEpp);
// --- CHECKLISTS ---
router.get('/checklist/plantillas', auth_middleware_1.protect, checklistsController.obtenerPlantillas);
router.post('/checklist/plantillas', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), checklistsController.addPlantilla);
router.patch('/checklist/plantillas/:id', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), checklistsController.editPlantilla);
router.post('/checklist/ejecucion', auth_middleware_1.protect, checklistsController.addEjecucion);
router.get('/checklist/historial', auth_middleware_1.protect, checklistsController.getHistorial);
router.get('/checklist/ejecucion/:id', auth_middleware_1.protect, checklistsController.getDetalleEjecucion);
router.patch('/checklist/ejecucion/:id/estado', auth_middleware_1.protect, (0, role_middleware_1.requireRoles)('ADMIN', 'CAPITAN', 'TENIENTE'), checklistsController.patchEstadoEjecucion);
exports.default = router;
