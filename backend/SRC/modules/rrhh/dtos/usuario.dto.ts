import { z } from 'zod';

export const crearUsuarioDto = z.object({
  rut: z.string().min(1, 'RUT es requerido'),
  nombres: z.string().min(1, 'Nombres es requerido'),
  apellidoPaterno: z.string().min(1, 'Apellido paterno es requerido'),
  apellidoMaterno: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  rolId: z.number().int().positive().optional(),
  cargoOficialidad: z.string().optional(),
  tipoVoluntario: z.string().optional(),
  estadoVoluntario: z.string().optional(),
  grupoSanguineo: z.string().optional(),
});

export const actualizarUsuarioDto = crearUsuarioDto.partial();

export type CrearUsuarioDtoType = z.infer<typeof crearUsuarioDto>;
export type ActualizarUsuarioDtoType = z.infer<typeof actualizarUsuarioDto>;
