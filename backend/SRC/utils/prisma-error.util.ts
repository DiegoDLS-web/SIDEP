import { Prisma } from '@prisma/client';
import { AppError } from './errors/AppError';

/** Etiquetas legibles por restricción FK de PostgreSQL / Prisma. */
const ETIQUETAS_FK: Record<string, string> = {
  parte_emergencia_obac_rut_fkey: 'partes de emergencia (como OBAC)',
  parte_emergencia_clave_id_fkey: 'clave de emergencia',
  parte_emergencia_estado_id_fkey: 'estado del parte',
  paciente_emergencia_parte_id_fkey: 'pacientes del parte',
  paciente_emergencia_triage_id_fkey: 'triage',
  vehiculo_civil_emergencia_parte_id_fkey: 'vehículos civiles del parte',
  asistencia_personal_usuario_rut_fkey: 'asistencia en partes',
  asistencia_personal_parte_id_fkey: 'parte de emergencia',
  unidad_en_emergencia_carro_id_fkey: 'unidades en emergencia',
  unidad_en_emergencia_parte_id_fkey: 'parte de emergencia',
  unidad_en_emergencia_conductor_rut_fkey: 'conductor en emergencia',
  material_por_carro_carro_id_fkey: 'inventario del carro',
  material_por_carro_material_id_fkey: 'catálogo de materiales',
  bolso_trauma_carro_id_fkey: 'bolsos de trauma',
  bolso_trauma_tipo_id_fkey: 'tipo de bolso',
  checklist_ejecucion_revisor_rut_fkey: 'checklists (como revisor)',
  checklist_ejecucion_plantilla_id_fkey: 'plantilla de checklist',
  mantenimiento_carro_carro_id_fkey: 'mantenciones del carro',
  mantenimiento_carro_inspector_rut_fkey: 'mantenciones (como inspector)',
  mantenimiento_carro_conductor_rut_fkey: 'mantenciones (como conductor)',
  licencia_medica_usuario_rut_fkey: 'licencias médicas',
  licencia_medica_resolutor_rut_fkey: 'licencias resueltas',
  licencia_medica_estado_licencia_id_fkey: 'estado de licencia',
  usuario_rol_id_fkey: 'rol de usuario',
  usuario_cargo_id_fkey: 'cargo de oficialidad',
  usuario_tipo_voluntario_id_fkey: 'tipo de voluntario',
  usuario_estado_voluntario_id_fkey: 'estado del voluntario',
  usuario_grupo_sanguineo_id_fkey: 'grupo sanguíneo',
  auditoria_usuario_usuario_rut_fkey: 'auditoría del sistema',
};

function textoError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err ?? '');
}

/** Indica si el error proviene de una violación de clave foránea. */
export function esErrorIntegridadReferencial(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === 'P2003' || err.code === 'P2014';
  }
  const lower = textoError(err).toLowerCase();
  return (
    lower.includes('foreign key constraint') ||
    lower.includes('violates foreign key') ||
    lower.includes('clave foránea') ||
    lower.includes('clave foranea') ||
    lower.includes('integridad referencial') ||
    lower.includes('entidad referencial') ||
    lower.includes('23503')
  );
}

function nombreRestriccion(err: Prisma.PrismaClientKnownRequestError): string | null {
  const meta = err.meta ?? {};
  const constraint = meta['constraint'] as string | undefined;
  if (constraint?.trim()) return constraint.trim();
  const field = meta['field_name'] as string | undefined;
  if (field?.trim()) return field.trim();
  const model = meta['modelName'] as string | undefined;
  if (model?.trim()) return model.trim();
  return null;
}

function etiquetaDesdeRestriccion(nombre: string | null): string | null {
  if (!nombre) return null;
  const key = nombre.toLowerCase();
  if (ETIQUETAS_FK[key]) return ETIQUETAS_FK[key];
  for (const [fk, etiqueta] of Object.entries(ETIQUETAS_FK)) {
    if (key.includes(fk) || fk.includes(key)) return etiqueta;
  }
  return null;
}

/** Mensaje en español claro para el usuario final. */
export function mensajeIntegridadReferencial(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2003' || err.code === 'P2014')) {
    const etiqueta = etiquetaDesdeRestriccion(nombreRestriccion(err));
    if (etiqueta) {
      return `No se puede completar la operación: existen registros vinculados (${etiqueta}). Modifica o elimina esas referencias primero.`;
    }
  }

  const raw = textoError(err).toLowerCase();
  for (const [fk, etiqueta] of Object.entries(ETIQUETAS_FK)) {
    if (raw.includes(fk)) {
      return `No se puede completar la operación: existen registros vinculados (${etiqueta}). Modifica o elimina esas referencias primero.`;
    }
  }

  if (esErrorIntegridadReferencial(err)) {
    return 'No se puede eliminar o modificar este registro porque otros datos del sistema dependen de él (partes, checklists, licencias, mantenciones, etc.).';
  }

  return 'Conflicto de integridad de datos: la operación afectaría registros relacionados.';
}

export type ErrorHttpResuelto = {
  statusCode: number;
  message: string;
  errors?: string[];
};

/** Traduce errores conocidos (AppError, Prisma) a respuesta HTTP. */
export function resolverErrorHttp(err: unknown): ErrorHttpResuelto | null {
  if (err instanceof AppError) {
    const out: ErrorHttpResuelto = {
      statusCode: err.statusCode,
      message: err.message,
    };
    if (err.errors?.length) out.errors = err.errors;
    return out;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const campo = (err.meta?.target as string[])?.join(', ') || 'campo';
      return { statusCode: 409, message: `Ya existe un registro con ese ${campo}.` };
    }
    if (err.code === 'P2025') {
      return { statusCode: 404, message: 'Registro no encontrado.' };
    }
    if (err.code === 'P2003' || err.code === 'P2014') {
      return { statusCode: 409, message: mensajeIntegridadReferencial(err) };
    }
  }

  if (esErrorIntegridadReferencial(err)) {
    return { statusCode: 409, message: mensajeIntegridadReferencial(err) };
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 400, message: 'Datos inválidos enviados a la base de datos.' };
  }

  return null;
}

/** Mensaje seguro para exponer al cliente (sin detalles internos de BD). */
export function mensajeErrorCliente(err: unknown, fallback: string): string {
  return resolverErrorHttp(err)?.message ?? fallback;
}

/** Código HTTP sugerido para un error. */
export function statusErrorCliente(err: unknown, fallback = 500): number {
  return resolverErrorHttp(err)?.statusCode ?? fallback;
}

/** Respuesta JSON estándar para controladores con try/catch manual. */
export function respuestaErrorJson(
  err: unknown,
  fallback: string,
): { statusCode: number; body: { success: false; message: string; errors?: string[] } } {
  const resuelto = resolverErrorHttp(err);
  if (resuelto) {
    return {
      statusCode: resuelto.statusCode,
      body: {
        success: false,
        message: resuelto.message,
        ...(resuelto.errors ? { errors: resuelto.errors } : {}),
      },
    };
  }
  const legacy = err as { statusCode?: number; message?: string };
  return {
    statusCode: legacy?.statusCode && legacy.statusCode >= 400 ? legacy.statusCode : 500,
    body: { success: false, message: mensajeErrorCliente(err, fallback) },
  };
}
