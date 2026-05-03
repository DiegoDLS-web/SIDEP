type ConfigPayload = {
    compania: {
        nombreCompania: string;
        nombreBomba: string;
        direccion: string;
        telefono: string;
        emailInstitucional: string;
        fechaFundacion: string;
    };
    notificaciones: {
        alertasEmergencia: boolean;
        alertasInventario: boolean;
        recordatoriosChecklist: boolean;
        resumenDiarioEmail: boolean;
    };
    reportes: {
        formatoPredeterminado: 'PDF' | 'XLSX' | 'CSV';
        logosPdf: 'AMBOS' | 'SIDEP' | 'COMPANIA' | 'NINGUNO';
        orientacionPdf: 'VERTICAL' | 'HORIZONTAL';
    };
    navegacionPorRol: Record<string, string[]>;
};
/** Lectura unificada para auth y otras rutas. */
export declare function obtenerConfigSistema(): Promise<ConfigPayload>;
export declare const configuracionesRouter: import("express-serve-static-core").Router;
export {};
//# sourceMappingURL=configuraciones.d.ts.map