export interface UsuarioBasicoDto {
  id: number;
  nombre: string;
  rut: string;
  rol: string;
  /** Data URL PNG/JPEG del perfil (partes, PDFs). */
  firmaImagen?: string | null;
}

export interface CarroBasicoDto {
  id: number;
  nomenclatura: string;
  patente: string;
}

export interface UnidadParteDto {
  id: number;
  parteId: number;
  carroId: number;
  /** Legado / resumen de línea. */
  horaSalida: string;
  horaLlegada: string;
  /** Horarios código 6-x (reloj). Opcional si el parte es anterior a la migración. */
  hora6_0?: string;
  hora6_3?: string;
  hora6_9?: string;
  hora6_10?: string;
  kmSalida: number;
  kmLlegada: number;
  carro: CarroBasicoDto;
}

export interface PacienteParteDto {
  id: number;
  parteId: number;
  nombre: string;
  triage: string;
  edad?: number | null;
  rut?: string | null;
}

/** Motivo de asistencia al marcar el padrón (cada contexto tiene su propia grilla). */
export type AsistenciaContextoKey =
  | 'emergencia'
  | 'curso'
  | 'cuartel'
  | 'comision'
  | 'comandancia';

/** Asistencia y personal en el lugar (metadata). */
export interface ParteAsistenciaMetadata {
  /** Casillas marcadas en el catálogo (id → presente). Lectura de partes antiguos sin contexto. */
  asistenciaSeleccion?: Record<string, boolean>;
  /** Por motivo: emergencia, curso, cuartel, comisión, comandancia. */
  asistenciaPorContexto?: Partial<Record<AsistenciaContextoKey, Record<string, boolean>>>;
  /** @deprecated Un solo campo; preferir comandoIncidenteCi/Js/Jo. */
  detalleComandoIncidente?: string;
  comandoIncidenteCi?: string;
  comandoIncidenteJs?: string;
  comandoIncidenteJo?: string;
  otraCompaniaNombre?: string;
  otraCompaniaNombreCompania?: string;
  otraCompaniaUnidad?: string;
  /** Total (p. ej. cantidad de voluntarios marcados); puede persistirse calculado. */
  asistenciaTotal?: string;
  /** Quién estuvo de oficial 12-8 */
  oficial128?: string;
  /** Radios marcadas (C1-1, C2-2, C3-3, …). */
  radiosSeleccion?: Record<string, boolean>;
  /** Por canal: quién usó la radio (nombre o clave). */
  radiosDetalle?: Record<string, string>;
  radiosUtilizadas?: string;
  encargadoDatos?: string;
  nombreObac?: string;
  /** Firma PNG (data URL) del encargado de tomar datos y del OBAC en el parte. */
  firmaEncargadoDatos?: string;
  firmaObac?: string;
}

/** Campos extra del parte (JSON en backend). */
export interface ParteMetadataDto {
  descripcionEmergencia?: string;
  trabajoRealizado?: string;
  /** Hora de reloj en que se recibió el llamado (HH:mm). */
  horaDelLlamado?: string;
  /** @deprecated Lectura de partes antiguos (clasificación global errónea). */
  horaLlamadoCodigo?: string;
  materialUtilizado?: string;
  asistencia?: ParteAsistenciaMetadata;
  observaciones?: string;
  /** carroId → nombre conductor de la unidad */
  conductoresPorCarroId?: Record<string, string>;
  vehiculos?: Array<{
    tipo: string;
    patente: string;
    marca: string;
    conductor: string;
    rut: string;
  }>;
  apoyoExterno?: Array<{
    tipo: string;
    nombre: string;
    cargo: string;
    patente: string;
    conductor: string;
    /** Lectura de partes guardados antes del cambio a patente/conductor. */
    movil?: string;
  }>;
}

export interface ParteEmergenciaDto {
  id: number;
  correlativo: string;
  claveEmergencia: string;
  direccion: string;
  fecha: string;
  estado: string;
  metadata?: ParteMetadataDto | null;
  obacId: number;
  obac: UsuarioBasicoDto;
  unidades: UnidadParteDto[];
  pacientes: PacienteParteDto[];
}
