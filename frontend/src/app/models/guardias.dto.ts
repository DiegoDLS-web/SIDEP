export type GrupoGuardia = '1' | '2' | '3' | '4';
export type TipoTurnoGuardia = '24H' | 'DIA' | 'NOCHE';

export type UsuarioCuartelDto = {
  rut: string;
  nombre: string;
  rol: string | null;
  cargo: string | null;
};

export type GuardiaMiembroDto = {
  id: string;
  usuarioRut: string;
  rolEnGuardia: string | null;
  usuario: UsuarioCuartelDto | null;
};

export type GuardiaTurnoDto = {
  id: string;
  fecha: string;
  grupo: GrupoGuardia;
  tipoTurno: TipoTurnoGuardia;
  cuarteleroRut: string | null;
  obacRut: string | null;
  observaciones: string | null;
  cuartelero: UsuarioCuartelDto | null;
  obac: UsuarioCuartelDto | null;
  registradoPor: UsuarioCuartelDto | null;
  miembros: GuardiaMiembroDto[];
  createdAt: string;
  updatedAt: string;
};

export type GuardiaResumenDto = {
  fecha: string;
  turnos: GuardiaTurnoDto[];
  gruposCubiertos: number;
  totalMiembros: number;
};

export type GuardiaDiaCalendarioDto = {
  fecha: string;
  dia: number;
  diaSemana: number;
  esFinDeSemana: boolean;
  estado: 'sin' | 'parcial' | 'completa';
  gruposNocturnos: GrupoGuardia[];
  turnos: GuardiaTurnoDto[];
};

export type GuardiaCalendarioDto = {
  anio: number;
  mes: number;
  mesLabel: string;
  dias: GuardiaDiaCalendarioDto[];
};

export const MESES_GUARDIA = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
] as const;

export const DIAS_SEMANA_GUARDIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const GRUPOS_GUARDIA: GrupoGuardia[] = ['1', '2', '3', '4'];
export const TIPOS_TURNO_GUARDIA: TipoTurnoGuardia[] = ['24H', 'DIA', 'NOCHE'];
