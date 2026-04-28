/** Cargos institucionales (un valor por persona). */
export declare const CARGOS_OFICIALIDAD: readonly ["DIRECTOR_COMPANIA", "SECRETARIO_COMPANIA", "TESORERO_COMPANIA", "PRO_SECRETARIO_COMPANIA", "CAPITAN_COMPANIA", "TENIENTE_PRIMERO", "TENIENTE_SEGUNDO", "TENIENTE_TERCERO", "TENIENTE_CUARTO", "AYUDANTE_COMPANIA", "PRO_AYUDANTE", "VICE_SUPERINTENDENTE", "SECRETARIO_GENERAL", "TESORERO_GENERAL", "SEGUNDO_COMANDANTE", "INSPECTOR_COMANDANCIA_1", "INSPECTOR_COMANDANCIA_2"];
export declare const TIPOS_VOLUNTARIO: readonly ["ACTIVO", "VOLUNTARIO", "OFICIAL", "CADETE", "ASPIRANTE", "HONORARIO", "CUARTELERO", "CANJE", "CONFEDERADO", "INSIGNE"];
export declare const GRUPOS_SANGUINEOS: readonly ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "DESCONOCIDO"];
export declare function esCargoValido(c: string | undefined | null): boolean;
export declare function esTipoVoluntarioValido(t: string | undefined | null): boolean;
export declare function nombreCompletoDesdePartes(p: {
    nombres?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
}): string;
export declare function normalizarFirmaDataUrl(raw: string | undefined | null): string | null;
//# sourceMappingURL=usuario-perfil.d.ts.map