"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarAsistenciaQueryDto = exports.planillaAsistenciaQueryDto = exports.upsertCeldaAsistenciaDto = exports.actualizarAsistenciaDto = exports.registrarAsistenciaDto = exports.estadosAsistenciaGuardia = exports.tiposTurnoAsistencia = void 0;
const zod_1 = require("zod");
const guardia_dto_1 = require("./guardia.dto");
exports.tiposTurnoAsistencia = ['NOCTURNA', 'DIURNA'];
exports.estadosAsistenciaGuardia = [
    'ASISTE',
    'NO_ASISTE',
    'DEJA_REEMPLAZO',
    'REEMPLAZA',
    'LIBERADO',
];
exports.registrarAsistenciaDto = zod_1.z.object({
    fecha: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    usuarioRut: zod_1.z.string().max(20),
    grupoGuardia: zod_1.z.enum(guardia_dto_1.gruposGuardia).optional().nullable(),
    tipoTurno: zod_1.z.enum(exports.tiposTurnoAsistencia).optional(),
    estadoAsistencia: zod_1.z.enum(exports.estadosAsistenciaGuardia).optional(),
    presente: zod_1.z.boolean().optional(),
    horaEntrada: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    horaSalida: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    observaciones: zod_1.z.string().max(2000).optional().nullable(),
});
exports.actualizarAsistenciaDto = exports.registrarAsistenciaDto.omit({ fecha: true, usuarioRut: true }).partial();
exports.upsertCeldaAsistenciaDto = zod_1.z.object({
    fecha: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    usuarioRut: zod_1.z.string().max(20),
    tipoTurno: zod_1.z.enum(exports.tiposTurnoAsistencia),
    estadoAsistencia: zod_1.z.enum(exports.estadosAsistenciaGuardia).nullable().optional(),
    grupoGuardia: zod_1.z.enum(guardia_dto_1.gruposGuardia).optional().nullable(),
});
exports.planillaAsistenciaQueryDto = zod_1.z.object({
    desde: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hasta: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    grupo: zod_1.z.enum(guardia_dto_1.gruposGuardia).optional(),
});
exports.listarAsistenciaQueryDto = zod_1.z.object({
    fecha: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    desde: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    hasta: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    grupo: zod_1.z.enum(guardia_dto_1.gruposGuardia).optional(),
    presente: zod_1.z.enum(['0', '1']).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    pageSize: zod_1.z.coerce.number().int().min(1).max(200).optional(),
});
