export interface RolUsuarioDto {
  id: number;
  nombre: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RolCrearDto {
  nombre: string;
  activo?: boolean;
}

export interface RolActualizarDto {
  nombre?: string;
  activo?: boolean;
}
