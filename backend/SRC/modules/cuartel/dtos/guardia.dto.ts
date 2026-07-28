import { z } from 'zod';

export const gruposGuardia = ['1', '2', '3', '4'] as const;
export const tiposTurnoGuardia = ['24H', 'DIA', 'NOCHE'] as const;

export const crearGuardiaDto = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grupo: z.enum(gruposGuardia),
  tipoTurno: z.enum(tiposTurnoGuardia).optional(),
  cuarteleroRut: z.string().max(20).optional().nullable(),
  obacRut: z.string().max(20).optional().nullable(),
  observaciones: z.string().max(4000).optional().nullable(),
  miembrosRut: z.array(z.string().max(20)).optional(),
});

export const actualizarGuardiaDto = crearGuardiaDto.partial();

export const listarGuardiasQueryDto = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  grupo: z.enum(gruposGuardia).optional(),
});
