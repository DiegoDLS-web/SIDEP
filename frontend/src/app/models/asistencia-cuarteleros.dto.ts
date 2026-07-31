import type { GrupoGuardia, UsuarioCuartelDto } from './guardias.dto';

export const ESTADOS_ASISTENCIA_GUARDIA = [
  'ASISTE',
  'NO_ASISTE',
  'DEJA_REEMPLAZO',
  'REEMPLAZA',
  'LIBERADO',
  'VACACIONES',
] as const;

export type EstadoAsistenciaGuardia = (typeof ESTADOS_ASISTENCIA_GUARDIA)[number];
export type TipoTurnoAsistencia = 'NOCTURNA' | 'DIURNA';

export const ETIQUETAS_ESTADO_ASISTENCIA: Record<EstadoAsistenciaGuardia, string> = {
  ASISTE: 'Asiste',
  NO_ASISTE: 'No asiste',
  DEJA_REEMPLAZO: 'Deja reemplazo',
  REEMPLAZA: 'Reemplaza',
  LIBERADO: 'Liberado',
  VACACIONES: 'Vacaciones',
};

export type AsistenciaCuarteleroDto = {
  id: string;
  fecha: string;
  usuarioRut: string;
  grupoGuardia: GrupoGuardia | null;
  tipoTurno: TipoTurnoAsistencia;
  estadoAsistencia: EstadoAsistenciaGuardia;
  presente: boolean;
  horaEntrada: string | null;
  horaSalida: string | null;
  firmaImagenUrl: string | null;
  observaciones: string | null;
  usuario: UsuarioCuartelDto | null;
  registradoPor: UsuarioCuartelDto | null;
  createdAt: string;
  updatedAt: string;
};

export type AsistenciaPaginaDto = {
  items: AsistenciaCuarteleroDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AsistenciaResumenDto = {
  fecha: string;
  total: number;
  presentes: number;
  ausentes: number;
  items: AsistenciaCuarteleroDto[];
};

export type PlanillaColumnaDto = {
  key: string;
  fecha: string;
  tipoTurno: TipoTurnoAsistencia;
  label: string;
  sublabel: string;
};

export type PlanillaCeldaDto = {
  id: string | null;
  estadoAsistencia: EstadoAsistenciaGuardia | null;
  horaEntrada: string | null;
  horaSalida: string | null;
  /** Indicador liviano: la firma base64 se carga solo al abrir el detalle. */
  tieneFirma: boolean;
  registradoPor: UsuarioCuartelDto | null;
  updatedAt: string | null;
};

export type PlanillaFilaDto = {
  numero: number;
  usuarioRut: string;
  nombre: string;
  grupoGuardia: GrupoGuardia | null;
  totalAsistencias: number;
  celdas: Record<string, PlanillaCeldaDto>;
};

export type PlanillaAsistenciaDto = {
  desde: string;
  hasta: string;
  columnas: PlanillaColumnaDto[];
  filas: PlanillaFilaDto[];
  registradores: Array<{
    rut: string;
    nombre: string;
    rol: string;
    ultimaActualizacion: string;
  }>;
  estados: EstadoAsistenciaGuardia[];
};
