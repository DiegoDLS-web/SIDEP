export type SemaforoEstado = 'operativa' | 'mantencion' | 'fuera_servicio';

export interface DashboardResumenDto {
  anio: number;
  filtros: { clave: string | null; carroId: number | null };
  totalEmergencias: number;
  porcentajeResueltas: number;
  tiempoPromedioRespuestaMin: number;
  emergenciasEsteMes: number;
  porMes: Array<{ periodo: string; cantidad: number }>;
  porTipo: Array<{ claveEmergencia: string; cantidad: number }>;
  recientes: Array<{
    id: number;
    correlativo: string;
    claveEmergencia: string;
    direccion: string;
    fecha: string;
    estado: string;
    unidades: string[];
  }>;
  heatmapSemanas: number[][];
  alertas: Array<{
    tipo: string;
    severidad: 'critico' | 'advertencia';
    titulo: string;
    detalle: string;
    carroId?: number;
    nomenclatura?: string;
  }>;
  unidadesSemaforo: Array<{
    id: number;
    nomenclatura: string;
    nombre: string;
    estadoOperativo: boolean;
    semaforo: SemaforoEstado;
    checklistUnidad: {
      fecha: string;
      totalItems: number | null;
      itemsOk: number | null;
      completo: boolean;
    } | null;
    checklistEra: {
      fecha: string;
      totalItems: number | null;
      itemsOk: number | null;
      completo: boolean;
    } | null;
    checklistTrauma: {
      fecha: string;
      totalItems: number | null;
      itemsOk: number | null;
      completo: boolean;
    } | null;
  }>;
  generadoEn: string;
}
