import type { HttpErrorResponse } from '@angular/common/http';

/** Mensaje usable en UI desde respuestas API habituales de SIDEP. */
export function mensajeApiError(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object' || !('error' in err)) {
    return fallback;
  }

  const he = err as HttpErrorResponse;
  const body = he.error;

  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;

    if (typeof record['message'] === 'string' && record['message'].trim()) {
      return record['message'].trim();
    }

    if (typeof record['error'] === 'string' && record['error'].trim()) {
      return record['error'].trim();
    }

    const nestedError = record['error'];
    if (nestedError && typeof nestedError === 'object' && nestedError !== null) {
      const nested = nestedError as Record<string, unknown>;
      if (typeof nested['message'] === 'string' && nested['message'].trim()) {
        return nested['message'].trim();
      }
    }

    const errors = record['errors'];
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && 'message' in first) {
        const msg = (first as { message: unknown }).message;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      }
    }
  }

  if (typeof he.message === 'string' && he.message.trim() && !he.message.startsWith('Http failure')) {
    return he.message.trim();
  }

  return fallback;
}
