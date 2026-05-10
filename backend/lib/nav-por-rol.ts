/**
 * Rutas del menú lateral (`routerLink`). Solo estas claves pueden persistirse en configuración.
 */
export const RUTAS_MENU_SIDEP = [
  '/',
  '/partes',
  '/catalogo-emergencias',
  '/carros',
  '/checklist',
  '/checklist-era',
  '/bolso-trauma',
  '/licencias-medicas',
  '/analitica-operacional',
  '/usuarios',
  '/configuraciones',
  '/perfil',
] as const;

export type RutaMenuSidep = (typeof RUTAS_MENU_SIDEP)[number];

const WHITELIST = new Set<string>(RUTAS_MENU_SIDEP);

/** Operativo estándar sin pantalla de catálogo de tipos (tenientes / voluntarios). */
const OPERATIVOS_SIN_CATALOGO_EMERG: RutaMenuSidep[] = [
  '/',
  '/partes',
  '/carros',
  '/checklist',
  '/checklist-era',
  '/bolso-trauma',
  '/licencias-medicas',
  '/analitica-operacional',
  '/perfil',
];

/** Incluye edición de tipos de emergencia (solo ADMIN y CAPITÁN en guard de ruta). */
const OPERATIVOS_CON_CATALOGO_EMERG: RutaMenuSidep[] = [
  '/',
  '/partes',
  '/catalogo-emergencias',
  '/carros',
  '/checklist',
  '/checklist-era',
  '/bolso-trauma',
  '/licencias-medicas',
  '/analitica-operacional',
  '/perfil',
];

/** Valores por defecto alineados con el menú típico de SIDEP. */
export function defaultNavegacionPorRol(): Record<string, string[]> {
  return {
    ADMIN: [...OPERATIVOS_CON_CATALOGO_EMERG, '/usuarios', '/configuraciones'],
    CAPITAN: [...OPERATIVOS_CON_CATALOGO_EMERG, '/usuarios'],
    TENIENTE: [...OPERATIVOS_SIN_CATALOGO_EMERG, '/usuarios'],
    VOLUNTARIOS: [...OPERATIVOS_SIN_CATALOGO_EMERG],
  };
}

export function mergeNavegacionPorRol(raw: unknown): Record<string, string[]> {
  const def = defaultNavegacionPorRol();
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(def)) {
    out[k] = [...v];
  }
  if (!raw || typeof raw !== 'object') {
    return out;
  }
  const input = raw as Record<string, unknown>;
  for (const [roleKey, val] of Object.entries(input)) {
    const key = roleKey.trim().toUpperCase();
    if (!Array.isArray(val)) {
      continue;
    }
    const paths = val
      .filter((x): x is string => typeof x === 'string' && WHITELIST.has(x.trim()))
      .map((x) => x.trim());
    out[key] = paths.length > 0 ? paths : [...(def[key] ?? def['VOLUNTARIOS']!)];
  }
  return out;
}

export function rutasPermitidasParaRol(rolRaw: string | undefined | null, navegacionPorRol: Record<string, string[]>): string[] {
  const r = rolRaw?.trim().toUpperCase() || 'VOLUNTARIOS';
  const defs = defaultNavegacionPorRol();
  const fallbackVol = defs['VOLUNTARIOS'] ?? OPERATIVOS_SIN_CATALOGO_EMERG;
  const base =
    navegacionPorRol[r] ??
    navegacionPorRol['VOLUNTARIOS'] ??
    defs[r] ??
    fallbackVol;
  return [...base];
}
