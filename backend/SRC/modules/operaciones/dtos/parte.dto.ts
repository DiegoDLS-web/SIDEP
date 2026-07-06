import { z } from 'zod';

const valorFlexible = z.union([z.string(), z.number(), z.null()]).optional();

const unidadParteSchema = z
  .object({
    carroId: z.union([z.string(), z.number()]),
    conductorRut: z.string().optional(),
    horaSalida: z.string().optional(),
    horaLlegada: z.string().optional(),
    hora6_0: z.string().optional(),
    hora6_3: z.string().optional(),
    hora6_9: z.string().optional(),
    hora6_10: z.string().optional(),
    kmSalida: valorFlexible,
    kmLlegada: valorFlexible,
  })
  .passthrough();

const pacienteParteSchema = z
  .object({
    nombre: z.string().optional(),
    triage: z.string().optional(),
    edad: valorFlexible,
    rut: z.string().optional(),
  })
  .passthrough();

const parteBodyBase = {
  claveEmergencia: z.string().optional(),
  claveId: z.union([z.number(), z.string()]).optional(),
  direccion: z.string().optional(),
  referenciaLugar: z.string().optional(),
  fecha: z.union([z.string(), z.date()]).optional(),
  fechaEmergencia: z.union([z.string(), z.date()]).optional(),
  estado: z.enum(['BORRADOR', 'PENDIENTE', 'COMPLETADO', 'ANULADO']).optional(),
  obacId: z.string().optional(),
  obacRut: z.string().optional(),
  motivoPendiente: z.string().nullable().optional(),
  descripcionEmergencia: z.string().nullable().optional(),
  trabajoRealizado: z.string().nullable().optional(),
  materialUtilizado: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),
  unidades: z.array(unidadParteSchema).optional(),
  pacientes: z.array(pacienteParteSchema).optional(),
  asistencias: z.array(z.object({ usuarioRut: z.string().min(1) }).passthrough()).optional(),
  vehiculosAfectados: z.array(z.record(z.string(), z.unknown())).optional(),
  apoyosExternos: z.array(z.record(z.string(), z.unknown())).optional(),
  otrasCompanias: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

function tieneObac(data: Record<string, unknown>): boolean {
  return Boolean(String(data['obacRut'] || data['obacId'] || '').trim());
}

/** Payload real enviado por el frontend al crear un parte. */
export const crearParteDto = z
  .object(parteBodyBase)
  .passthrough()
  .refine(tieneObac, { message: 'OBAC es obligatorio (obacRut u obacId).' });

/** Actualización parcial; al menos un campo debe venir en el body. */
export const actualizarParteDto = z
  .object(parteBodyBase)
  .partial()
  .passthrough()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'El cuerpo de actualización no puede estar vacío.',
  });

export type CrearParteDtoType = z.infer<typeof crearParteDto>;
export type ActualizarParteDtoType = z.infer<typeof actualizarParteDto>;
