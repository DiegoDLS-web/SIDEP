export type EstadoStockInventario = 'NORMAL' | 'BAJO' | 'CRITICO';

export type AsignacionEppDto = {
  id: string;
  usuarioRut: string;
  usuarioNombre: string;
  cantidad: number;
};

export type SistemaTallaInventario = 'BOTA' | 'ROPA' | null;

export type InventarioItemDto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  tipoInventario: string | null;
  tipoEpp: string | null;
  tipoEppEtiqueta: string;
  talla: string | null;
  sistemaTalla: SistemaTallaInventario;
  bodegaId: number;
  bodegaCodigo: string;
  bodegaNombre: string;
  marca: string | null;
  modelo: string | null;
  estadoFisico: string | null;
  valor: number | null;
  observaciones: string | null;
  unidad: string;
  /** Stock total físico (bodega + asignado). */
  cantidad: number;
  /** Unidades entregadas a voluntarios. */
  cantidadAsignada: number;
  /** Unidades libres en bodega. */
  cantidadDisponible: number;
  stockMinimo: number;
  stockCritico: number;
  esEppAsignable: boolean;
  estadoStock: EstadoStockInventario;
  asignaciones: AsignacionEppDto[];
};

export const TALLAS_BOTA = Array.from({ length: 12 }, (_, i) => String(35 + i));
export const TALLAS_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export type InventarioMetricasDto = {
  totalItems: number;
  stockNormal: number;
  stockBajo: number;
  stockCritico: number;
};

export type InventarioListadoDto = {
  items: InventarioItemDto[];
  metricas: InventarioMetricasDto;
  total: number;
  page: number;
  pageSize: number;
};

export type BodegaDto = {
  id: number;
  codigo: string;
  nombre: string;
};

// Legacy types (bodega movimientos / catálogo carros)
export type MaterialCatalogoDto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidad: string | null;
  activo: boolean;
  stockBodega: number;
  stockMinimo: number;
};

export type StockBodegaDto = {
  materialId: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidad: string | null;
  cantidad: number;
  stockMinimo: number;
  bajoMinimo: boolean;
};

export type MovimientoBodegaDto = {
  id: string;
  materialId: number;
  materialNombre: string;
  tipo: string;
  cantidad: number;
  cantidadAntes: number;
  cantidadDespues: number;
  motivo: string | null;
  usuarioNombre: string | null;
  createdAt: string;
};

export type ResumenInventarioDto = {
  totalMateriales: number;
  materialesBajoMinimo: number;
  totalUnidadesCarro: number;
  carrosConInventario: number;
  ultimosMovimientos: MovimientoBodegaDto[];
};

export type InventarioCarroDto = {
  carroId: string;
  nomenclatura: string;
  nombre: string;
  totalItems: number;
  materiales: Array<{
    materialId: number;
    codigo: string;
    nombre: string;
    cantidadObjetivo: number;
    ubicacion: string | null;
  }>;
};

export const CATEGORIAS_INVENTARIO = ['Equipamiento', 'Mangueras', 'Extintores', 'Uniformes'] as const;
