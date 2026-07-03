import type { CarroRegistroHistorialDto } from './carro-registro-historial.dto';

export interface CarroDto {
  // --- NUESTROS TIPOS ESTRICTOS (POSTGRESQL) ---
  id: string; // UUID
  nomenclatura: string;
  patente: string;
  estadoOperativo: number; // 1 o 0
  motivoFueraServicio?: string | null;
  fueraServicioDesde?: string | null;
  nombre: string | null;
  marca: string | null;
  kilometraje: number;
  /** Último km registrado en despacho (km llegada o salida del último parte). */
  ultimoKmDespacho?: number;

  // --- CAMPOS VISUALES DE LA FICHA (COMPATIBILIDAD CON FRONTEND) ---
  tipo?: string | null;
  anioFabricacion?: number | null;
  capacidadAgua?: string | null;
  imagenUrl?: string | null;
  ultimoMantenimiento?: string | null;
  descripcionUltimoMantenimiento?: string | null;
  proximoMantenimiento?: string | null;
  proximaRevisionTecnica?: string | null;
  ultimaRevisionBombaAgua?: string | null;
  ultimoInspector?: string | null;
  firmaUltimoInspector?: string | null;
  fechaUltimaInspeccion?: string | null;
  conductorAsignado?: string | null;
  ultimoConductor?: string | null;
  motor?: string | null;
  transmision?: string | null;
  combustible?: string | null;
  presionBomba?: string | null;
  capacidadTanqueCombustible?: string | null;

  // --- RELACIONES ---
  bolsos?: any[]; 
  materiales?: any[];
  historialRegistros?: CarroRegistroHistorialDto[];
}

export interface CrearCarroDto {
  patente: string;
  nomenclatura: string;
  nombre: string;
  marca: string;
  kilometraje?: number;
}

export interface ActualizarCarroDto extends Partial<CrearCarroDto> {
  estadoOperativo?: number;
}