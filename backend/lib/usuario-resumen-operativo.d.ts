export type ResumenOperativoUsuarioDto = {
    asistencia: {
        marcasRegistradasTotal: number;
        emergenciasDistintasTotal: number;
        marcasRegistradasAnioActual: number;
        emergenciasDistintasAnioActual: number;
        marcasRegistradasMesActual: number;
        emergenciasDistintasMesActual: number;
        anioReferencia: number;
        mesReferencia: number;
    };
    licencias: {
        total: number;
        items: Array<{
            id: number;
            fechaInicio: string;
            fechaTermino: string;
            estado: string;
            motivo: string;
        }>;
    };
    emergenciasRecientes: Array<{
        id: number;
        correlativo: string;
        fecha: string;
        claveEmergencia: string;
        direccion: string;
        estado: string;
        obacNombre: string;
        /** Marcas “presente” del usuario en este parte (puede ser >1 por contextos). */
        marcasEnParte: number;
    }>;
};
export declare function buildResumenOperativoUsuario(usuarioId: number): Promise<ResumenOperativoUsuarioDto>;
//# sourceMappingURL=usuario-resumen-operativo.d.ts.map