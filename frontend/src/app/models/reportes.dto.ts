export interface ReporteEmergenciasDto {
  totalEmergencias: number;
  porcentajeResueltas: number;
  tiempoPromedioRespuestaMin: number;
  porMes: Array<{
    periodo: string;
    cantidad: number;
  }>;
}
