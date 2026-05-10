export interface LoginResponseDto {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    rol: string;
    email: string | null;
    rut?: string;
    requiereCambioPassword?: boolean;
  };
}

export interface SesionUsuarioDto {
  id: number;
  nombre: string;
  rol: string;
  email: string | null;
  rut: string;
  activo: boolean;
  requiereCambioPassword?: boolean;
}
