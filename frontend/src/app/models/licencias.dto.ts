export type LicenciaEstado = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'ANULADA';

export interface LicenciaMedicaDto {
  id: string;
  usuarioId: string;
  fechaInicio: string;
  fechaTermino: string;
  motivo: string;
  archivoUrl: string | null;
  estado: LicenciaEstado;
  observacionResolucion: string | null;
  resueltoPorId: string | null;
  resueltoEn: string | null;
  createdAt: string;
  updatedAt: string;
  usuario?: {
    id: string;
    nombre: string;
    rut?: string;
    rol: string;
    cargoOficialidad?: string | null;
  };
  resueltoPor?: {
    id: string;
    nombre: string;
    rol: string;
    cargoOficialidad?: string | null;
    firmaImagen?: string | null;
  } | null;
}

export interface LicenciaActivaDto {
  id: string;
  usuarioId: string;
  fechaInicio: string;
  fechaTermino: string;
  motivo: string;
}

export interface LicenciaResumenUsuarioDto {
  id: string;
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
