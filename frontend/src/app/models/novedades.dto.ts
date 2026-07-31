import type { GrupoGuardia } from './guardias.dto';
import type { UsuarioCuartelDto } from './guardias.dto';

export type CategoriaNovedad = 'OPERATIVA' | 'LOGISTICA' | 'ADMINISTRATIVA' | 'SEGURIDAD' | 'OTRO';

export type ImagenNovedadDto = {
  url: string;
  publicId?: string | null;
};

export type LibroNovedadDto = {
  id: string;
  fechaHora: string;
  categoria: CategoriaNovedad;
  titulo: string;
  descripcion: string;
  grupoGuardia: GrupoGuardia | null;
  importante: boolean;
  oficialACargoRut: string;
  oficialACargo: UsuarioCuartelDto | null;
  imagenes: ImagenNovedadDto[];
  autorRut: string;
  autor: UsuarioCuartelDto | null;
  createdAt: string;
  updatedAt: string;
};

export type NovedadesPaginaDto = {
  items: LibroNovedadDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const CATEGORIAS_NOVEDAD: { value: CategoriaNovedad; label: string }[] = [
  { value: 'OPERATIVA', label: 'Operativa' },
  { value: 'LOGISTICA', label: 'Logística' },
  { value: 'ADMINISTRATIVA', label: 'Administrativa' },
  { value: 'SEGURIDAD', label: 'Seguridad' },
  { value: 'OTRO', label: 'Otro' },
];
