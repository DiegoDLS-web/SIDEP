export interface ParteEmergenciaDTO {
  id: string; // UUID
  correlativo: string;
  direccion: string;
  estadoId: number;
  claveId: number;
  obacRut: string; // RUT en vez de ID numérico
  fechaEmergencia: string | Date;
  referenciaLugar?: string;
  trabajoRealizado?: string;
  materialUtilizado?: string;

  // Relaciones anidadas devueltas por el GET general
  clave?: { nombre: string; codigo: string };
  estado?: { nombre: string };
  obac?: { nombres: string; apellidoPaterno: string; rut: string };
  _count?: {
    asistencias: number;
    unidades: number;
  };
}

export interface VehiculoCivilDTO {
  tipoVehiculo: string;
  patente: string;
  marca: string;
  conductor: string;
  rutConductor: string;
}

export interface CarroAsistenteDTO {
  carroId: string; // UUID
  conductorRut?: string;
  horaSalida: string | Date;
  horaLlegada: string | Date;
  kmSalida: number;
  kmLlegada: number;
}

export interface CrearParteEmergenciaDTO {
  correlativo: string;
  direccion: string;
  estadoId: number;
  claveId: number;
  obacRut: string;
  fechaHecho?: string | Date;
  referenciaLugar?: string;
  trabajoRealizado?: string;
  materialUtilizado?: string;
  
  // Arrays para guardar las relaciones de una sola vez
  vehiculosCiviles?: VehiculoCivilDTO[];
  personalAsistente?: string[]; // Array de RUTs
  carrosAsistentes?: CarroAsistenteDTO[];
}