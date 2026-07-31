import { z } from 'zod';

export const textoLibreDto = z.object({
  texto: z.string().min(4).max(20000),
});

export const direccionDto = z.object({
  direccion: z.string().min(3).max(500),
  referencia: z.string().max(500).optional().nullable(),
});

export const partePayloadDto = z.object({
  payload: z.record(z.string(), z.unknown()),
});

export const checklistCriticosDto = z.object({
  unidad: z.string().max(80).optional(),
  tipo: z.string().max(80).optional(),
  itemsFallados: z
    .array(
      z.object({
        nombre: z.string().min(1).max(200),
        critico: z.boolean().optional(),
        observacion: z.string().max(1000).optional().nullable(),
      }),
    )
    .max(200)
    .optional(),
});

export const clasificarEstadoDto = z.object({
  descripcion: z.string().max(500_000).optional().nullable(),
});

export const movimientoDescDto = z.object({
  descripcion: z.string().min(3).max(4000),
});

export const matchingTallaDto = z.object({
  nombreArticulo: z.string().min(1).max(200),
  talla: z.string().max(10).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
});

export const preguntaDto = z.object({
  pregunta: z.string().min(3).max(2000),
  anio: z.coerce.number().int().optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});

export const rangoDto = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  grupo: z.string().max(10).optional(),
});

export const licenciaTextoDto = z.object({
  texto: z.string().min(10).max(50000),
});

export const solapeLicenciaDto = z.object({
  usuarioRut: z.string().min(3).max(20),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaTermino: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const notificacionesDto = z.object({
  alertas: z
    .array(
      z.object({
        tipo: z.string().max(80).optional(),
        severidad: z.string().max(40).optional(),
        titulo: z.string().min(1).max(300),
        detalle: z.string().max(2000).optional(),
      }),
    )
    .max(100),
});