/**
 * Rutas del menú lateral (`routerLink`). Solo estas claves pueden persistirse en configuración.
 */
export declare const RUTAS_MENU_SIDEP: readonly ["/", "/partes", "/carros", "/checklist", "/checklist-era", "/bolso-trauma", "/licencias-medicas", "/analitica-operacional", "/usuarios", "/configuraciones", "/perfil"];
export type RutaMenuSidep = (typeof RUTAS_MENU_SIDEP)[number];
/** Valores por defecto alineados con el menú típico de SIDEP. */
export declare function defaultNavegacionPorRol(): Record<string, string[]>;
export declare function mergeNavegacionPorRol(raw: unknown): Record<string, string[]>;
export declare function rutasPermitidasParaRol(rolRaw: string | undefined | null, navegacionPorRol: Record<string, string[]>): string[];
//# sourceMappingURL=nav-por-rol.d.ts.map