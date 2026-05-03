export type EstadoChecklist = 'COMPLETADO' | 'PENDIENTE' | 'CON_OBSERVACION';

export interface ChecklistResumenUnidadDto {
  id: number;
  unidad: string;
  nombre: string;
  /** Foto principal de la unidad (misma que en gestión de carros). */
  imagenUrl?: string | null;
  ultimaRevision: {
    fecha: string;
    /** Texto libre del inspector (si existe). */
    inspector: string | null;
    /** Nombre del OBAC (cuartelero) al momento del registro. */
    obac: string | null;
    /** Compatibilidad: inspector u OBAC como texto único. */
    responsable: string;
    completado: boolean;
    estadoChecklist?: EstadoChecklist;
  } | null;
  itemsTotal: number;
  itemsOk: number;
  itemsFaltantes: number;
}

export interface ChecklistRegistroDto {
  id: number;
  carroId: number;
  cuarteleroId: number;
  fecha: string;
  tipo: 'UNIDAD' | 'ERA' | string;
  inspector: string | null;
  grupoGuardia: string | null;
  firmaOficial: string | null;
  firmaInspector?: string | null;
  observaciones: string | null;
  totalItems: number | null;
  itemsOk: number | null;
  detalle: unknown;
  vigente?: boolean;
  obsoleto?: boolean;
  estadoOperativoCarro?: boolean;
  estadoChecklist?: EstadoChecklist;
  carro: { id: number; nomenclatura: string; nombre: string | null };
  cuartelero: { id: number; nombre: string; rol: string };
}

export interface ChecklistUnidadResponseDto {
  unidad: string;
  carro: { id: number; nomenclatura: string; nombre: string | null };
  checklist: ChecklistRegistroDto | null;
}

export interface ChecklistPlantillaMaterialDto {
  nombre: string;
  cantidadRequerida: number;
}

export interface ChecklistPlantillaUbicacionDto {
  nombre: string;
  materiales: ChecklistPlantillaMaterialDto[];
}

export interface ChecklistPlantillaUnidadResponseDto {
  unidad: string;
  ubicaciones: ChecklistPlantillaUbicacionDto[];
}
