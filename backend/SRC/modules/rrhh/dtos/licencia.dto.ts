import { z } from 'zod';

export const crearLicenciaDto = z.object({
  fechaInicio: z.string().min(1, 'Fecha de inicio es requerida'),
  fechaTermino: z.string().min(1, 'Fecha de término es requerida'),
  motivo: z.string().min(8, 'El motivo debe tener al menos 8 caracteres'),
  tipo: z.string().optional(),
});

export const cambiarEstadoLicenciaDto = z.object({
  estado: z.enum(['Aprobada', 'Rechazada', 'Anulada']),
  observacionResolucion: z.string().min(8, 'El motivo debe tener al menos 8 caracteres'),
  fechaResolucion: z.string().min(1, 'La fecha de resolución es requerida'),
});

export type CrearLicenciaDtoType = z.infer<typeof crearLicenciaDto>;
export type CambiarEstadoLicenciaDtoType = z.infer<typeof cambiarEstadoLicenciaDto>;
