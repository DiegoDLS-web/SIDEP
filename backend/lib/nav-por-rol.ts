/**
 * Rutas del menú lateral (`routerLink`). Solo estas claves pueden persistirse en configuración.
 */
export const RUTAS_MENU_SIDEP = [
  '/',
  '/partes',
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

const OPERATIVOS_BASE: RutaMenuSidep[] = [
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

/** Valores por defecto alineados con el menú típico de SIDEP. */
export function defaultNavegacionPorRol(): Record<string, string[]> {
  return {
    ADMIN: [...OPERATIVOS_BASE, '/usuarios', '/configuraciones'],
    CAPITAN: [...OPERATIVOS_BASE, '/usuarios'],
    TENIENTE: [...OPERATIVOS_BASE, '/usuarios'],
    VOLUNTARIOS: [...OPERATIVOS_BASE],
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
  const fallbackVol = defs['VOLUNTARIOS'] ?? OPERATIVOS_BASE;
  const base =
    navegacionPorRol[r] ??
    navegacionPorRol['VOLUNTARIOS'] ??
    defs[r] ??
    fallbackVol;
  return [...base];
}
