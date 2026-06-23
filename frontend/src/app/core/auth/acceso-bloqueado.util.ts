const STORAGE_KEY = 'sidep_acceso_bloqueado';

export function guardarMensajeAccesoBloqueado(mensaje: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mensaje.trim());
  } catch {
    /* ignore */
  }
}

export function consumirMensajeAccesoBloqueado(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value) sessionStorage.removeItem(STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function esErrorUsuarioInactivo(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('error' in err)) return false;
  const body = (err as { error?: unknown }).error;
  if (!body || typeof body !== 'object') return false;
  return (body as Record<string, unknown>)['codigo'] === 'USUARIO_INACTIVO';
}
