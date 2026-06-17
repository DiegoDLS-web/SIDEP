import { z } from 'zod';

export const crearParteDto = z.object({
  correlativo: z.string().min(1, 'Correlativo es requerido'),
  fechaEmergencia: z.string().datetime({ message: 'Fecha de emergencia es inválida' }).or(z.string().min(1)),
  claveId: z.number().int().positive('Clave de emergencia es requerida'),
  direccion: z.string().min(1, 'Dirección es requerida'),
  referenciaLugar: z.string().optional(),
  trabajoRealizado: z.string().optional(),
  obacRut: z.string().optional(),
  asistencias: z.array(z.object({
    usuarioRut: z.string().min(1),
  })).optional(),
  unidades: z.array(z.object({
    carroId: z.number().int().positive(),
    conductorRut: z.string().optional(),
  })).optional(),
});

export const actualizarParteDto = z.object({
  direccion: z.string().optional(),
  referenciaLugar: z.string().optional(),
  trabajoRealizado: z.string().optional(),
  estadoId: z.number().int().optional(),
});

export type CrearParteDtoType = z.infer<typeof crearParteDto>;
export type ActualizarParteDtoType = z.infer<typeof actualizarParteDto>;
