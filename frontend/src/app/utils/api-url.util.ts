import { environment } from '../../environments/environment';

/** Construye rutas API sin barras duplicadas. */
export function apiUrl(...segments: string[]): string {
  const base = environment.apiUrl.replace(/\/+$/, '');
  const path = segments
    .filter((s) => s != null && String(s).trim() !== '')
    .map((s) => String(s).replace(/^\/+|\/+$/g, ''))
    .join('/');
  return path ? `${base}/${path}` : base;
}
