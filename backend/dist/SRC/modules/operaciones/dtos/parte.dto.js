"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarParteDto = exports.crearParteDto = void 0;
const zod_1 = require("zod");
const valorFlexible = zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]).optional();
const unidadParteSchema = zod_1.z
    .object({
    carroId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    conductorRut: zod_1.z.string().optional(),
    horaSalida: zod_1.z.string().optional(),
    horaLlegada: zod_1.z.string().optional(),
    hora6_0: zod_1.z.string().optional(),
    hora6_3: zod_1.z.string().optional(),
    hora6_9: zod_1.z.string().optional(),
    hora6_10: zod_1.z.string().optional(),
    kmSalida: valorFlexible,
    kmLlegada: valorFlexible,
})
    .passthrough();
const pacienteParteSchema = zod_1.z
    .object({
    nombre: zod_1.z.string().optional(),
    triage: zod_1.z.string().optional(),
    edad: valorFlexible,
    rut: zod_1.z.string().optional(),
})
    .passthrough();
const parteBodyBase = {
    claveEmergencia: zod_1.z.string().optional(),
    claveId: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    direccion: zod_1.z.string().optional(),
    referenciaLugar: zod_1.z.string().optional(),
    fecha: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    fechaEmergencia: zod_1.z.union([zod_1.z.string(), zod_1.z.date()]).optional(),
    estado: zod_1.z.enum(['BORRADOR', 'PENDIENTE', 'COMPLETADO', 'ANULADO']).optional(),
    obacId: zod_1.z.string().optional(),
    obacRut: zod_1.z.string().optional(),
    motivoPendiente: zod_1.z.string().nullable().optional(),
    descripcionEmergencia: zod_1.z.string().nullable().optional(),
    trabajoRealizado: zod_1.z.string().nullable().optional(),
    materialUtilizado: zod_1.z.string().nullable().optional(),
    observaciones: zod_1.z.string().nullable().optional(),
    unidades: zod_1.z.array(unidadParteSchema).optional(),
    pacientes: zod_1.z.array(pacienteParteSchema).optional(),
    asistencias: zod_1.z.array(zod_1.z.object({ usuarioRut: zod_1.z.string().min(1) }).passthrough()).optional(),
    vehiculosAfectados: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).optional(),
    apoyosExternos: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).optional(),
    otrasCompanias: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
};
function tieneObac(data) {
    return Boolean(String(data['obacRut'] || data['obacId'] || '').trim());
}
/** Payload real enviado por el frontend al crear un parte. */
exports.crearParteDto = zod_1.z
    .object(parteBodyBase)
    .passthrough()
    .refine(tieneObac, { message: 'OBAC es obligatorio (obacRut u obacId).' });
/** Actualización parcial; al menos un campo debe venir en el body. */
exports.actualizarParteDto = zod_1.z
    .object(parteBodyBase)
    .partial()
    .passthrough()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'El cuerpo de actualización no puede estar vacío.',
});
