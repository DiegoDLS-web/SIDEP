/**
 * Claves de nómina (padrón 1ª Cía.). Mantener alineado con `nominaCompania` en `prisma/seed.ts`.
 * Búsqueda insensible a tildes y mayúsculas.
 */
export declare function normalizarNombreParaClave(n: string): string;
export declare function claveNominaParaNombreCompleto(nombre: string | null | undefined): string | null;
export declare const CLAVE_NOMINA_POR_NOMBRE_SEED: Readonly<Record<string, string>>;
//# sourceMappingURL=clave-nomina-por-nombre.d.ts.map