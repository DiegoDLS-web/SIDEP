import type { HttpErrorResponse } from '@angular/common/http';

const MENSAJE_INTEGRIDAD_REFERENCIAL =
  'No se puede eliminar o modificar este registro porque otros datos del sistema dependen de él (partes, checklists, licencias, mantenciones, etc.).';

function esTextoIntegridadReferencial(texto: string): boolean {
  const lower = texto.toLowerCase();
  return (
    lower.includes('foreign key') ||
    lower.includes('violates foreign key') ||
    lower.includes('clave foránea') ||
    lower.includes('clave foranea') ||
    lower.includes('integridad referencial') ||
    lower.includes('entidad referencial') ||
    lower.includes('violacion a la integridad') ||
    lower.includes('violación a la integridad') ||
    lower.includes('p2003') ||
    lower.includes('23503')
  );
}

function normalizarMensajeIntegridad(texto: string): string {
  if (esTextoIntegridadReferencial(texto)) {
    return MENSAJE_INTEGRIDAD_REFERENCIAL;
  }
  return texto;
}

/** Mensaje usable en UI desde respuestas API habituales de SIDEP. */
export function mensajeApiError(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object' || !('error' in err)) {
    return fallback;
  }

  const he = err as HttpErrorResponse;
  const body = he.error;

  if (typeof body === 'string' && body.trim()) {
    return normalizarMensajeIntegridad(body.trim());
  }

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;

    if (typeof record['message'] === 'string' && record['message'].trim()) {
      return normalizarMensajeIntegridad(record['message'].trim());
    }

    if (typeof record['error'] === 'string' && record['error'].trim()) {
      return normalizarMensajeIntegridad(record['error'].trim());
    }

    const nestedError = record['error'];
    if (nestedError && typeof nestedError === 'object' && nestedError !== null) {
      const nested = nestedError as Record<string, unknown>;
      if (typeof nested['message'] === 'string' && nested['message'].trim()) {
        return normalizarMensajeIntegridad(nested['message'].trim());
      }
    }

    const errors = record['errors'];
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];
      if (typeof first === 'string') return normalizarMensajeIntegridad(first);
      if (first && typeof first === 'object' && 'message' in first) {
        const msg = (first as { message: unknown }).message;
        if (typeof msg === 'string' && msg.trim()) {
          return normalizarMensajeIntegridad(msg.trim());
        }
      }
    }
  }

  if (typeof he.message === 'string' && he.message.trim() && !he.message.startsWith('Http failure')) {
    return normalizarMensajeIntegridad(he.message.trim());
  }

  return fallback;
}
