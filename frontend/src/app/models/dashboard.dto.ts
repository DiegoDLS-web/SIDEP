export type SemaforoEstado = 'operativa' | 'mantencion' | 'fuera_servicio';

export interface DashboardResumenDto {
  anio: number;
  filtros: { clave: string | null; carroId: string | null };
  totalEmergencias: number;
  porcentajeResueltas: number;
  tiempoPromedioRespuestaMin: number;
  emergenciasEsteMes: number;
  porMes: Array<{ periodo: string; cantidad: number }>;
  porTipo: Array<{ claveEmergencia: string; cantidad: number }>;
  recientes: Array<{
    id: string | number;
    correlativo: string;
    claveEmergencia: string;
    direccion: string;
    fecha: string;
    estado: string;
    unidades: string[];
  }>;
  heatmapSemanas: number[][];
  aniosConDatos?: number[];
  alertas: Array<{
    tipo: string;
    severidad: 'critico' | 'advertencia';
    titulo: string;
    detalle: string;
    carroId?: number;
    nomenclatura?: string;
  }>;
  unidadesSemaforo: Array<{
    id: string;
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
  cuarteleroEnTurno?: {
    activo: boolean;
    fuente: 'asistencia' | 'guardia' | null;
    fecha: string;
    tipoTurno: string;
    horaEntrada: string | null;
    horaSalida: string | null;
    usuario: { rut: string; nombre: string } | null;
    usuarioRut: string | null;
  } | null;
}
