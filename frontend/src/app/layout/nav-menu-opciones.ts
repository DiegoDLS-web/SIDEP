/** Opciones editables en Configuraciones (alineadas con `routerLink` y con el backend `RUTAS_MENU_SIDEP`). */
export const OPCIONES_MENU_SIDEP: ReadonlyArray<{ path: string; label: string }> = [
  { path: '/', label: 'Estadísticas' },
  { path: '/partes', label: 'Partes' },
  { path: '/catalogo-emergencias', label: 'Tipos de emergencia' },
  { path: '/carros', label: 'Carros' },
  { path: '/inventarios', label: 'Inventarios' },
  { path: '/checklist', label: 'Checklist' },
  { path: '/checklist-era', label: 'Checklist ERA' },
  { path: '/bolso-trauma', label: 'Bolso de trauma' },
  { path: '/licencias-medicas', label: 'Licencias' },
  { path: '/guardias', label: 'Sistema de guardias' },
  { path: '/asistencia-cuartelero', label: 'Asistencia cuartelero' },
  { path: '/libro-novedades', label: 'Libro de novedades' },
  { path: '/analitica-operacional', label: 'Analítica operacional' },
  { path: '/usuarios', label: 'Usuarios' },
  { path: '/auditoria', label: 'Auditoría' },
  { path: '/configuraciones', label: 'Configuraciones' },
  { path: '/perfil', label: 'Mi perfil' },
];

/** Fallback local si falla `/api/auth/mi-navegacion` (misma lógica previa por rol). */
export function rutasMenuFallbackPorRol(rolRaw: string | undefined): string[] {
  const sinCatalogoNiAdmin = OPCIONES_MENU_SIDEP.filter(
    (x) =>
      x.path !== '/usuarios' &&
      x.path !== '/configuraciones' &&
      x.path !== '/catalogo-emergencias',
  ).map((x) => x.path);
  const operativosAdminCapitan = OPCIONES_MENU_SIDEP.filter(
    (x) => x.path !== '/usuarios' && x.path !== '/configuraciones',
  ).map((x) => x.path);
  const r = rolRaw?.trim().toUpperCase() ?? '';
  if (r === 'ADMIN') {
    return OPCIONES_MENU_SIDEP.map((x) => x.path);
  }
  if (r === 'CAPITAN') {
    return [...operativosAdminCapitan, '/usuarios'];
  }
  if (r === 'TENIENTE') {
    return [...sinCatalogoNiAdmin, '/usuarios'];
  }
  return sinCatalogoNiAdmin;
}
