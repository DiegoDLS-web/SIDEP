import { z } from 'zod';

export const crearItemInventarioDto = z.object({
  nombre: z.string().min(1, 'Nombre obligatorio').max(200),
  cantidad: z.coerce.number().int().min(1),
  tipoInventario: z.string().max(80).optional(),
  bodegaCodigo: z.string().max(20).optional(),
  marca: z.string().max(100).nullable().optional(),
  modelo: z.string().max(100).nullable().optional(),
  estadoFisico: z.string().max(50).nullable().optional(),
  valor: z.coerce.number().nullable().optional(),
  observaciones: z.string().max(500).nullable().optional(),
  talla: z.string().max(20).nullable().optional(),
  categoria: z.string().max(80).nullable().optional(),
});

export const movimientoInventarioDto = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.coerce.number(),
  motivo: z.string().max(500).nullable().optional(),
});

export const asignarEppDto = z.object({
  usuarioRut: z.string().min(1, 'RUT de voluntario requerido'),
  cantidad: z.coerce.number().int().min(1).optional(),
  observaciones: z.string().max(500).nullable().optional(),
});

export const ajustarCantidadDto = z.object({
  delta: z.coerce.number(),
});

export const metaItemDto = z.object({
  talla: z.string().max(20).nullable().optional(),
});

export const filtrosInventarioQueryDto = z.object({
  q: z.string().optional(),
  bodega: z.string().optional(),
  categoria: z.string().optional(),
  voluntario: z.string().optional(),
});

export const filtrosPartesExportQueryDto = z.object({
  q: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  tipos: z.string().optional(),
  carros: z.string().optional(),
  estado: z.string().optional(),
  persona: z.string().optional(),
});
