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

export interface ConfiguracionReportesDto {
  formatoPredeterminado: 'PDF' | 'XLSX' | 'CSV';
  incluirLogo: boolean;
  orientacionPdf: 'VERTICAL' | 'HORIZONTAL';
}

export interface ConfiguracionSistemaDto {
  compania: ConfiguracionCompaniaDto;
  notificaciones: ConfiguracionNotificacionesDto;
  reportes: ConfiguracionReportesDto;
}
