/** Opciones editables en Configuraciones (alineadas con `routerLink` y con el backend `RUTAS_MENU_SIDEP`). */
export const OPCIONES_MENU_SIDEP: ReadonlyArray<{ path: string; label: string }> = [
  { path: '/', label: 'Estadísticas' },
  { path: '/partes', label: 'Partes' },
  { path: '/carros', label: 'Carros' },
  { path: '/checklist', label: 'Checklist' },
  { path: '/checklist-era', label: 'Checklist ERA' },
  { path: '/bolso-trauma', label: 'Bolso de trauma' },
  { path: '/licencias-medicas', label: 'Licencias' },
  { path: '/analitica-operacional', label: 'Analítica operacional' },
  { path: '/usuarios', label: 'Usuarios' },
  { path: '/configuraciones', label: 'Configuraciones' },
  { path: '/perfil', label: 'Mi perfil' },
];

/** Fallback local si falla `/api/auth/mi-navegacion` (misma lógica previa por rol). */
export function rutasMenuFallbackPorRol(rolRaw: string | undefined): string[] {
  const operativos = OPCIONES_MENU_SIDEP.filter(
    (x) =>
      x.path !== '/usuarios' &&
      x.path !== '/configuraciones',
  ).map((x) => x.path);
  const r = rolRaw?.trim().toUpperCase() ?? '';
  if (r === 'ADMIN') {
    return OPCIONES_MENU_SIDEP.map((x) => x.path);
  }
  if (r === 'CAPITAN' || r === 'TENIENTE') {
    return [...operativos, '/usuarios'];
  }
  return operativos;
}
