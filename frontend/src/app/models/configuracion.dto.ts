export interface ConfiguracionCompaniaDto {
  nombreCompania: string;
  nombreBomba: string;
  direccion: string;
  telefono: string;
  emailInstitucional: string;
  fechaFundacion: string;
}

export interface ConfiguracionNotificacionesDto {
  alertasEmergencia: boolean;
  alertasInventario: boolean;
  recordatoriosChecklist: boolean;
  resumenDiarioEmail: boolean;
}

/** Logos institucionales en cabeceras de PDF exportados desde el navegador */
export type LogosPdfCabecera = 'AMBOS' | 'SIDEP' | 'COMPANIA' | 'NINGUNO';

export interface ConfiguracionReportesDto {
  formatoPredeterminado: 'PDF' | 'XLSX' | 'CSV';
  logosPdf: LogosPdfCabecera;
  orientacionPdf: 'VERTICAL' | 'HORIZONTAL';
}

/** Ítem del catálogo editable por ADMIN / CAPITÁN (`claveEmergencia` en partes). */
export interface TipoEmergenciaItemDto {
  value: string;
  label: string;
}

export interface ConfiguracionSistemaDto {
  compania: ConfiguracionCompaniaDto;
  notificaciones: ConfiguracionNotificacionesDto;
  reportes: ConfiguracionReportesDto;
  /** rutas permitidas (`routerLink`) por rol — configurable solo por administradores. */
  navegacionPorRol?: Record<string, string[]>;
  /** Catálogo de tipos (persistido); si falta, el cliente usa `partes.constants`. */
  tiposEmergencia?: TipoEmergenciaItemDto[];
}
