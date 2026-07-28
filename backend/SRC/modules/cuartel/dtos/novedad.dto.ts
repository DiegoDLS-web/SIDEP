import { z } from 'zod';
import { gruposGuardia } from './guardia.dto';

export const categoriasNovedad = ['OPERATIVA', 'LOGISTICA', 'ADMINISTRATIVA', 'SEGURIDAD', 'OTRO'] as const;

export const crearNovedadDto = z.object({
  fechaHora: z.union([z.string(), z.date()]),
  categoria: z.enum(categoriasNovedad),
  titulo: z.string().min(3).max(200),
  descripcion: z.string().min(3).max(8000),
  grupoGuardia: z.enum(gruposGuardia).optional().nullable(),
  importante: z.boolean().optional(),
});

export const actualizarNovedadDto = crearNovedadDto.partial();

export const listarNovedadesQueryDto = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoria: z.enum(categoriasNovedad).optional(),
  importante: z.enum(['0', '1']).optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
