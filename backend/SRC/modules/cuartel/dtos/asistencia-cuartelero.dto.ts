import { z } from 'zod';
import { gruposGuardia } from './guardia.dto';

export const tiposTurnoAsistencia = ['NOCTURNA', 'DIURNA'] as const;
export const estadosAsistenciaGuardia = [
  'ASISTE',
  'NO_ASISTE',
  'DEJA_REEMPLAZO',
  'REEMPLAZA',
  'LIBERADO',
] as const;

export const registrarAsistenciaDto = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usuarioRut: z.string().max(20),
  grupoGuardia: z.enum(gruposGuardia).optional().nullable(),
  tipoTurno: z.enum(tiposTurnoAsistencia).optional(),
  estadoAsistencia: z.enum(estadosAsistenciaGuardia).optional(),
  presente: z.boolean().optional(),
  horaEntrada: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  horaSalida: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
});

export const actualizarAsistenciaDto = registrarAsistenciaDto.omit({ fecha: true, usuarioRut: true }).partial();

export const upsertCeldaAsistenciaDto = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usuarioRut: z.string().max(20),
  tipoTurno: z.enum(tiposTurnoAsistencia),
  estadoAsistencia: z.enum(estadosAsistenciaGuardia).nullable().optional(),
  grupoGuardia: z.enum(gruposGuardia).optional().nullable(),
});

export const planillaAsistenciaQueryDto = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grupo: z.enum(gruposGuardia).optional(),
});

export const listarAsistenciaQueryDto = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  grupo: z.enum(gruposGuardia).optional(),
  presente: z.enum(['0', '1']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
