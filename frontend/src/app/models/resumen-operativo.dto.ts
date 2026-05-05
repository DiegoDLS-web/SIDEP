export interface ResumenOperativoDto {
  asistencia: {
    marcasRegistradasTotal: number;
    emergenciasDistintasTotal: number;
    marcasRegistradasAnioActual: number;
    emergenciasDistintasAnioActual: number;
    marcasRegistradasMesActual: number;
    emergenciasDistintasMesActual: number;
    anioReferencia: number;
    mesReferencia: number;
  };
  licencias: {
    total: number;
    items: Array<{
      id: number;
      fechaInicio: string;
      fechaTermino: string;
      estado: string;
      motivo: string;
    }>;
  };
  emergenciasRecientes: Array<{
    id: number;
    correlativo: string;
    fecha: string;
    claveEmergencia: string;
    direccion: string;
    estado: string;
    obacNombre: string;
    marcasEnParte: number;
  }>;
}
