import { z } from 'zod';

export const crearUsuarioDto = z.object({
  rut: z.string().min(1, 'RUT es requerido'),
  nombres: z.string().min(1, 'Nombres es requerido'),
  apellidoPaterno: z.string().min(1, 'Apellido paterno es requerido'),
  apellidoMaterno: z.string().optional().default(''),
  email: z.string().min(1, 'Email es requerido').email('Email inválido'),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  region: z.string().optional(),
  comuna: z.string().optional(),
  actividad: z.string().optional(),
  nacionalidad: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  fechaIngreso: z.string().optional(),
  rol: z.string().optional(),
  cargoOficialidad: z.string().optional(),
  tipoVoluntario: z.string().optional(),
  estadoVoluntario: z.string().optional(),
  grupoSanguineo: z.string().optional(),
  cuerpoBombero: z.string().optional(),
  compania: z.string().optional(),
  observacionesRegistro: z.string().nullable().optional(),
  firmaImagen: z.string().nullable().optional(),
  fotoPerfil: z.string().nullable().optional(),
  autorizadoConducir: z.boolean().optional(),
  claveNomina: z.string().nullable().optional(),
});

export const actualizarUsuarioDto = crearUsuarioDto.partial().extend({
  activo: z.boolean().optional(),
});

export type CrearUsuarioDtoType = z.infer<typeof crearUsuarioDto>;
export type ActualizarUsuarioDtoType = z.infer<typeof actualizarUsuarioDto>;
