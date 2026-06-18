// ==========================================================
// 1. NUESTROS TIPOS ESTRICTOS (NUEVA BD POSTGRESQL)
// ==========================================================
export interface ChecklistPlantillaDTO {
  id: string; // UUID
  codigo: string;
  nombre: string;
  descripcion?: string;
  entidadTipo: string; 
  estructuraJson: any; 
  version: number;
  activo: number; // 1 o 0
}

export interface ChecklistEjecucionDTO {
  id: string; // UUID
  plantillaId: string; 
  revisorRut: string; 
  fechaRevision: string | Date;
  estado: string; 
  respuestasJson: any; 
  entidadTipo: string;
  entidadId: string; 
  revisor?: { nombres: string; apellidoPaterno: string; rut?: string; };
  plantilla?: { nombre: string; codigo?: string; };
}

export interface RegistrarChecklistDTO {
  carroId: string;
  revisorRut: string;
  plantillaId?: string;
  resultadosMateriales: unknown;
  entidadTipo?: string;
  firmaOficial?: string | null;
  firmaInspector?: string | null;
}

// ==========================================================
// 2. TIPOS DE COMPATIBILIDAD (FRONTEND COLEGA)
// ==========================================================
export type EstadoChecklist = 'COMPLETADO' | 'PENDIENTE' | 'CON_OBSERVACION';

export interface ChecklistRegistroDto {
  id: string | number;
  carroId: string | number;
  cuarteleroId: string;
  fecha: string;
  tipo: string;
  inspector: string | null;
  grupoGuardia: string | null;
  firmaOficial: string | null;
  firmaInspector?: string | null;
  observaciones: string | null;
  totalItems: number | null;
  itemsOk: number | null;
  detalle: unknown;
  vigente?: boolean | number;
  obsoleto?: boolean | number;
  estadoOperativoCarro?: boolean | number;
  estadoChecklist?: EstadoChecklist;
  carro?: { id: string | number; nomenclatura: string; nombre: string | null };
  cuartelero?: { id: string; nombre: string; rol: string };
  /** Nomenclatura de la unidad (ERA / listados). */
  unidad?: string;
}

export interface ChecklistResumenUnidadDto {
  id: string | number;
  unidad: string;
  nombre: string;
  imagenUrl?: string | null;
  ultimaRevision: {
    fecha: string;
    inspector: string | null;
    obac: string | null;
    responsable: string;
    completado: boolean | number;
    estadoChecklist?: EstadoChecklist;
  } | null;
  itemsTotal: number;
  itemsOk: number;
  itemsFaltantes: number;
}

export interface ChecklistUnidadResponseDto {
  unidad: string;
  carro: { id: string | number; nomenclatura: string; nombre: string | null };
  checklist: ChecklistRegistroDto | null;
}

export interface ChecklistEraPaginaDto {
  items: ChecklistRegistroDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ChecklistPlantillaUnidadResponseDto {
  ubicaciones: Array<{
    nombre: string;
    materiales: Array<{
      id?: string;
      nombre: string;
      cantidadRequerida: number;
      cantidadActual?: number;
    }>;
  }>;
}