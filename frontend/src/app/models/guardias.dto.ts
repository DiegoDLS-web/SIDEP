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

export const GRUPOS_GUARDIA: GrupoGuardia[] = ['1', '2', '3', '4'];
export const TIPOS_TURNO_GUARDIA: TipoTurnoGuardia[] = ['24H', 'DIA', 'NOCHE'];
