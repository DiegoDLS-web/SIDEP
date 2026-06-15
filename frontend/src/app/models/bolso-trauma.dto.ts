export interface BolsoTraumaDTO {
  id: string; // UUID
  tipoId: number;
  carroId: string; // UUID referenciando al Carro
  nombreIdentificador: string;
  activo: number; // 1 o 0
}

export interface CrearBolsoTraumaDTO {
  tipoId: number;
  carroId: string;
  nombreIdentificador: string;
}
export interface BolsoTraumaHistorialDto {
  id: string | number;
  fecha: string;
  unidad: string;
  bolsoNumero?: number;
  inspector?: string;
  responsable?: string;
  grupoGuardia?: string;
  porcentaje?: number;
  itemsOk?: number;
  totalItems?: number;
  observaciones?: string;
  estadoChecklist?: string;
  borrador?: boolean;
  tipo?: string;
}

export interface BolsoTraumaRegistroDto {
  id: string | number;
  fecha: string;
  carro: any;
  inspector?: string;
  cuartelero: any;
  grupoGuardia?: string;
  observaciones?: string;
  totalItems?: number;
  itemsOk?: number;
  detalle: any;
  firmaOficial?: string;
  firmaInspector?: string;
}

export interface BolsoTraumaSelectorUnidadDto {
  unidad: string;
  nombre: string;
  cantidadBolsos: number;
  bolsos: any[];
  ultimaRevision?: any;
}