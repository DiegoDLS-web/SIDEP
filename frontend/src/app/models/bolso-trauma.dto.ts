export interface BolsoTraumaItemDto {
  numero: number;
  completitud: number;
  itemsFaltantes: number;
  status: 'complete' | 'incomplete';
}

export interface BolsoTraumaSelectorUnidadDto {
  id: number;
  unidad: string;
  nombre: string;
  cantidadBolsos: number;
  ultimaRevision: {
    fecha: string;
    responsable: string;
    completado: boolean;
  } | null;
  bolsos: BolsoTraumaItemDto[];
}

export interface BolsoTraumaRegistroDto {
  id: number;
  carroId: number;
  cuarteleroId: number;
  fecha: string;
  tipo: string;
  inspector: string | null;
  grupoGuardia: string | null;
  firmaOficial: string | null;
  observaciones: string | null;
  totalItems: number | null;
  itemsOk: number | null;
  detalle: unknown;
  carro: { id: number; nomenclatura: string; nombre: string | null };
  cuartelero: { id: number; nombre: string; rol: string };
}

export interface BolsoTraumaUnidadResponseDto {
  unidad: string;
  carro: { id: number; nomenclatura: string; nombre: string | null };
  checklist: BolsoTraumaRegistroDto | null;
}

export interface BolsoTraumaHistorialDto {
  id: number;
  fecha: string;
  unidad: string;
  carroNombre: string | null;
  inspector: string | null;
  responsable: string;
  grupoGuardia: string | null;
  totalItems: number | null;
  itemsOk: number | null;
  porcentaje: number | null;
  observaciones: string | null;
  /** Número de bolso revisado (metadato en detalle). */
  bolsoNumero?: number | null;
  /** true si se guardó como borrador. */
  borrador?: boolean;
}
