import { z } from 'zod';

export const loginDto = z.object({
  rut: z.string().min(1, 'RUT es requerido'),
  password: z.string().min(1, 'Contraseña es requerida'),
});

export const mfaVerifyDto = z.object({
  mfaToken: z.string().min(1, 'Token MFA requerido'),
  code: z.string().min(6, 'Código de 6 dígitos requerido').max(8),
});

export const mfaCodeDto = z.object({
  code: z.string().min(6, 'Código de 6 dígitos requerido').max(8),
});

export const cambiarPasswordDto = z.object({
  passwordActual: z.string().min(1, 'Contraseña actual es requerida'),
  passwordNueva: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});

export const recuperarPasswordDto = z.object({
  email: z.string().email('Email inválido'),
});

export const restablecerPasswordDto = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const registerDto = z.object({
  rut: z.string().min(1, 'RUT es requerido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombres: z.string().min(1, 'Nombres es requerido'),
  apellidoPaterno: z.string().min(1, 'Apellido paterno es requerido'),
  apellidoMaterno: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

export type LoginDtoType = z.infer<typeof loginDto>;
export type CambiarPasswordDtoType = z.infer<typeof cambiarPasswordDto>;
export type RegisterDtoType = z.infer<typeof registerDto>;
