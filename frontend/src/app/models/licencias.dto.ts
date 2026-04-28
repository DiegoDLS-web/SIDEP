export type LicenciaEstado = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA';

export interface LicenciaMedicaDto {
  id: number;
  usuarioId: number;
  fechaInicio: string;
  fechaTermino: string;
  motivo: string;
  archivoUrl: string | null;
  estado: LicenciaEstado;
  observacionResolucion: string | null;
  resueltoPorId: number | null;
  resueltoEn: string | null;
  createdAt: string;
  updatedAt: string;
  usuario?: {
    id: number;
    nombre: string;
    rut?: string;
    rol: string;
    cargoOficialidad?: string | null;
  };
  resueltoPor?: {
    id: number;
    nombre: string;
    rol: string;
  } | null;
}

export interface LicenciaActivaDto {
  id: number;
  usuarioId: number;
  fechaInicio: string;
  fechaTermino: string;
  motivo: string;
}

export interface LicenciaResumenUsuarioDto {
  id: number;
  nombre: string;
  rut?: string;
  rol: string;
  cargoOficialidad?: string | null;
}

export interface LicenciasResumenDto {
  fecha: string;
  mandoPermiso: LicenciaResumenUsuarioDto[];
  sinPermiso: LicenciaResumenUsuarioDto[];
  conLicencia: LicenciaResumenUsuarioDto[];
}
