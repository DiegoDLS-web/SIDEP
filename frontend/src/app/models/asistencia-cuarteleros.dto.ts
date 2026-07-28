import type { GrupoGuardia, UsuarioCuartelDto } from './guardias.dto';

export type AsistenciaCuarteleroDto = {
  id: string;
  fecha: string;
  usuarioRut: string;
  grupoGuardia: GrupoGuardia | null;
  presente: boolean;
  horaEntrada: string | null;
  horaSalida: string | null;
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
