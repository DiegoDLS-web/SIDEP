"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarGuardiasQueryDto = exports.actualizarGuardiaDto = exports.crearGuardiaDto = exports.tiposTurnoGuardia = exports.gruposGuardia = void 0;
const zod_1 = require("zod");
exports.gruposGuardia = ['1', '2', '3', '4'];
exports.tiposTurnoGuardia = ['24H', 'DIA', 'NOCHE'];
exports.crearGuardiaDto = zod_1.z.object({
    fecha: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    grupo: zod_1.z.enum(exports.gruposGuardia),
    tipoTurno: zod_1.z.enum(exports.tiposTurnoGuardia).optional(),
    cuarteleroRut: zod_1.z.string().max(20).optional().nullable(),
    obacRut: zod_1.z.string().max(20).optional().nullable(),
    observaciones: zod_1.z.string().max(4000).optional().nullable(),
    miembrosRut: zod_1.z.array(zod_1.z.string().max(20)).optional(),
});
exports.actualizarGuardiaDto = exports.crearGuardiaDto.partial();
exports.listarGuardiasQueryDto = zod_1.z.object({
    desde: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    hasta: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    grupo: zod_1.z.enum(exports.gruposGuardia).optional(),
});
