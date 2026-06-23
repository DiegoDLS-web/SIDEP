export interface LoginResponseDto {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    rol: string;
    email: string | null;
    rut?: string;
    activo?: boolean;
    estadoVoluntario?: string | null;
    requiereCambioPassword?: boolean;
  };
}

export interface SesionUsuarioDto {
  id: string;
  nombre: string;
  rol: string;
  email: string | null;
  rut: string;
  activo: boolean;
  estadoVoluntario?: string | null;
  requiereCambioPassword?: boolean;
}
