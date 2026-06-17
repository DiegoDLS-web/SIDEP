import { z } from 'zod';

export const actualizarConfigDto = z.object({
  compania: z.object({
    nombreCompania: z.string().optional(),
    nombreBomba: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    emailInstitucional: z.string().email('Email institucional inválido').optional().or(z.literal('')),
    fechaFundacion: z.string().optional(),
  }).optional(),
  notificaciones: z.object({
    alertasEmergencia: z.boolean().optional(),
    alertasInventario: z.boolean().optional(),
    recordatoriosChecklist: z.boolean().optional(),
    resumenDiarioEmail: z.boolean().optional(),
  }).optional(),
  reportes: z.object({
    formatoPredeterminado: z.enum(['PDF', 'EXCEL']).optional(),
    logosPdf: z.enum(['NINGUNO', 'SIDEP', 'COMPANIA', 'AMBOS']).optional(),
    orientacionPdf: z.enum(['VERTICAL', 'HORIZONTAL']).optional(),
  }).optional(),
  navegacionPorRol: z.record(z.string(), z.array(z.string())).optional(),
});

export type ActualizarConfigDtoType = z.infer<typeof actualizarConfigDto>;
