import type { HttpErrorResponse } from '@angular/common/http';

/** Mensaje usable en UI desde cuerpo `{ error: { code, message } }` o legado `{ error: string }`. */
export function mensajeApiError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const he = err as HttpErrorResponse;
    const body = he.error;
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const e = (body as { error: unknown }).error;
      if (typeof e === 'string') return e;
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        return (e as { message: string }).message;
      }
    }
    if (typeof body === 'string' && body.trim()) return body;
  }
  return fallback;
}
