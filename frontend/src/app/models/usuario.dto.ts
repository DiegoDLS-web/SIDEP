export interface UsuarioListaDto {
  id: number;
  nombre: string;
  rut: string;
  rol: string;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nacionalidad: string | null;
  grupoSanguineo: string | null;
  direccion: string | null;
  region: string | null;
  comuna: string | null;
  actividad: string | null;
  fechaNacimiento: string | null;
  fechaIngreso: string | null;
  tipoVoluntario: string | null;
  cuerpoBombero: string | null;
  compania: string | null;
  estadoVoluntario: string | null;
  cargoOficialidad: string | null;
  observacionesRegistro: string | null;
  firmaImagen: string | null;
  fotoPerfil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioCrearDto {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  nacionalidad: string;
  grupoSanguineo: string;
  direccion: string;
  region: string;
  comuna: string;
  actividad: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  email: string;
  telefono: string;
  tipoVoluntario: string;
  cuerpoBombero: string;
  compania: string;
  estadoVoluntario: string;
  cargoOficialidad: string;
  rol: string;
  observacionesRegistro?: string | null;
  firmaImagen?: string | null;
  fotoPerfil?: string | null;
}

export interface UsuarioActualizarDto {
  nombre?: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  rut?: string;
  nacionalidad?: string | null;
  grupoSanguineo?: string | null;
  direccion?: string | null;
  region?: string | null;
  comuna?: string | null;
  actividad?: string | null;
  fechaNacimiento?: string | null;
  fechaIngreso?: string | null;
  email?: string | null;
  telefono?: string | null;
  tipoVoluntario?: string;
  cuerpoBombero?: string | null;
  compania?: string | null;
  estadoVoluntario?: string;
  cargoOficialidad?: string;
  rol?: string;
  activo?: boolean;
  observacionesRegistro?: string | null;
  firmaImagen?: string | null;
  fotoPerfil?: string | null;
}
