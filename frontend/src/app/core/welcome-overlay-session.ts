/**
 * La bienvenida se muestra una vez por pestaña: al recargar (F5) no se repite.
 * `limpiarBienvenidaSesionAlLogout` restaura el comportamiento en el próximo inicio de sesión.
 */
export const WELCOME_SESSION_STORAGE_KEY = 'sidep_bienvenida_mostrada';

export function bienvenidaYaMostradaEnEstaPestana(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(WELCOME_SESSION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function marcarBienvenidaCompletadaEnSesion(): void {
  try {
    globalThis.sessionStorage?.setItem(WELCOME_SESSION_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function limpiarBienvenidaSesionAlLogout(): void {
  try {
    globalThis.sessionStorage?.removeItem(WELCOME_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
