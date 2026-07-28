"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filtrosPartesExportQueryDto = exports.filtrosInventarioQueryDto = exports.metaItemDto = exports.ajustarCantidadDto = exports.asignarEppDto = exports.movimientoInventarioDto = exports.crearItemInventarioDto = void 0;
const zod_1 = require("zod");
exports.crearItemInventarioDto = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'Nombre obligatorio').max(200),
    cantidad: zod_1.z.coerce.number().int().min(1),
    tipoInventario: zod_1.z.string().max(80).optional(),
    bodegaCodigo: zod_1.z.string().max(20).optional(),
    marca: zod_1.z.string().max(100).nullable().optional(),
    modelo: zod_1.z.string().max(100).nullable().optional(),
    estadoFisico: zod_1.z.string().max(50).nullable().optional(),
    valor: zod_1.z.coerce.number().nullable().optional(),
    observaciones: zod_1.z.string().max(500).nullable().optional(),
    talla: zod_1.z.string().max(20).nullable().optional(),
    categoria: zod_1.z.string().max(80).nullable().optional(),
});
exports.movimientoInventarioDto = zod_1.z.object({
    tipo: zod_1.z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
    cantidad: zod_1.z.coerce.number(),
    motivo: zod_1.z.string().max(500).nullable().optional(),
});
exports.asignarEppDto = zod_1.z.object({
    usuarioRut: zod_1.z.string().min(1, 'RUT de voluntario requerido'),
    cantidad: zod_1.z.coerce.number().int().min(1).optional(),
    observaciones: zod_1.z.string().max(500).nullable().optional(),
});
exports.ajustarCantidadDto = zod_1.z.object({
    delta: zod_1.z.coerce.number(),
});
exports.metaItemDto = zod_1.z.object({
    talla: zod_1.z.string().max(20).nullable().optional(),
});
exports.filtrosInventarioQueryDto = zod_1.z.object({
    q: zod_1.z.string().optional(),
    bodega: zod_1.z.string().optional(),
    categoria: zod_1.z.string().optional(),
    voluntario: zod_1.z.string().optional(),
});
exports.filtrosPartesExportQueryDto = zod_1.z.object({
    q: zod_1.z.string().optional(),
    desde: zod_1.z.string().optional(),
    hasta: zod_1.z.string().optional(),
    tipos: zod_1.z.string().optional(),
    carros: zod_1.z.string().optional(),
    estado: zod_1.z.string().optional(),
    persona: zod_1.z.string().optional(),
});
