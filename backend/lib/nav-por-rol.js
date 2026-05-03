"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUTAS_MENU_SIDEP = void 0;
exports.defaultNavegacionPorRol = defaultNavegacionPorRol;
exports.mergeNavegacionPorRol = mergeNavegacionPorRol;
exports.rutasPermitidasParaRol = rutasPermitidasParaRol;
/**
 * Rutas del menú lateral (`routerLink`). Solo estas claves pueden persistirse en configuración.
 */
exports.RUTAS_MENU_SIDEP = [
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
];
const WHITELIST = new Set(exports.RUTAS_MENU_SIDEP);
const OPERATIVOS_BASE = [
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
function defaultNavegacionPorRol() {
    return {
        ADMIN: [...OPERATIVOS_BASE, '/usuarios', '/configuraciones'],
        CAPITAN: [...OPERATIVOS_BASE, '/usuarios'],
        TENIENTE: [...OPERATIVOS_BASE, '/usuarios'],
        VOLUNTARIOS: [...OPERATIVOS_BASE],
    };
}
function mergeNavegacionPorRol(raw) {
    const def = defaultNavegacionPorRol();
    const out = {};
    for (const [k, v] of Object.entries(def)) {
        out[k] = [...v];
    }
    if (!raw || typeof raw !== 'object') {
        return out;
    }
    const input = raw;
    for (const [roleKey, val] of Object.entries(input)) {
        const key = roleKey.trim().toUpperCase();
        if (!Array.isArray(val)) {
            continue;
        }
        const paths = val
            .filter((x) => typeof x === 'string' && WHITELIST.has(x.trim()))
            .map((x) => x.trim());
        out[key] = paths.length > 0 ? paths : [...(def[key] ?? def['VOLUNTARIOS'])];
    }
    return out;
}
function rutasPermitidasParaRol(rolRaw, navegacionPorRol) {
    const r = rolRaw?.trim().toUpperCase() || 'VOLUNTARIOS';
    const defs = defaultNavegacionPorRol();
    const fallbackVol = defs['VOLUNTARIOS'] ?? OPERATIVOS_BASE;
    const base = navegacionPorRol[r] ??
        navegacionPorRol['VOLUNTARIOS'] ??
        defs[r] ??
        fallbackVol;
    return [...base];
}
//# sourceMappingURL=nav-por-rol.js.map