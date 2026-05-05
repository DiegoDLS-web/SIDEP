import type { CarroRegistroHistorialDto } from './carro-registro-historial.dto';

/** Respuesta JSON del backend (Prisma) para `Carro`. */
export interface CarroDto {
  id: number;
  nomenclatura: string;
  patente: string;
  estadoOperativo: boolean;
  nombre: string | null;
  tipo: string | null;
  marca: string | null;
  anioFabricacion: number | null;
  capacidadAgua: string | null;
  imagenUrl: string | null;
  kilometraje: number | null;
  ultimoMantenimiento: string | null;
  descripcionUltimoMantenimiento?: string | null;
  proximoMantenimiento: string | null;
  proximaRevisionTecnica?: string | null;
  ultimaRevisionBombaAgua?: string | null;
  ultimoInspector?: string | null;
  firmaUltimoInspector?: string | null;
  fechaUltimaInspeccion?: string | null;
  conductorAsignado: string | null;
  ultimoConductor?: string | null;
  motor: string | null;
  transmision: string | null;
  combustible: string | null;
  presionBomba: string | null;
  capacidadTanqueCombustible: string | null;
  /** Solo en detalle (`GET /api/carros/:id`); lista no lo incluye. */
  historialRegistros?: CarroRegistroHistorialDto[];
}

export type { CarroRegistroHistorialDto } from './carro-registro-historial.dto';
