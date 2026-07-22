"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cambiarEstadoLicenciaDto = exports.crearLicenciaDto = void 0;
const zod_1 = require("zod");
exports.crearLicenciaDto = zod_1.z.object({
    fechaInicio: zod_1.z.string().min(1, 'Fecha de inicio es requerida'),
    fechaTermino: zod_1.z.string().min(1, 'Fecha de término es requerida'),
    motivo: zod_1.z.string().min(8, 'El motivo debe tener al menos 8 caracteres'),
    tipo: zod_1.z.string().optional(),
});
exports.cambiarEstadoLicenciaDto = zod_1.z.object({
    estado: zod_1.z.enum(['Aprobada', 'Rechazada', 'Anulada']),
    observacionResolucion: zod_1.z.string().min(8, 'El motivo debe tener al menos 8 caracteres'),
    fechaResolucion: zod_1.z.string().min(1, 'La fecha de resolución es requerida'),
});
