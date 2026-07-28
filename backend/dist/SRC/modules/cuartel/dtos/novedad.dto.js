"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarNovedadesQueryDto = exports.actualizarNovedadDto = exports.crearNovedadDto = exports.categoriasNovedad = void 0;
const zod_1 = require("zod");
const guardia_dto_1 = require("./guardia.dto");
exports.categoriasNovedad = ['OPERATIVA', 'LOGISTICA', 'ADMINISTRATIVA', 'SEGURIDAD', 'OTRO'];
exports.crearNovedadDto = zod_1.z.object({
    fechaHora: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]),
    categoria: zod_1.z.enum(exports.categoriasNovedad),
    titulo: zod_1.z.string().min(3).max(200),
    descripcion: zod_1.z.string().min(3).max(8000),
    grupoGuardia: zod_1.z.enum(guardia_dto_1.gruposGuardia).optional().nullable(),
    importante: zod_1.z.boolean().optional(),
});
exports.actualizarNovedadDto = exports.crearNovedadDto.partial();
exports.listarNovedadesQueryDto = zod_1.z.object({
    desde: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    hasta: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    categoria: zod_1.z.enum(exports.categoriasNovedad).optional(),
    importante: zod_1.z.enum(['0', '1']).optional(),
    q: zod_1.z.string().max(120).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
