export interface ReporteEmergenciasDto {
  totalEmergencias: number;
  porcentajeResueltas: number;
  tiempoPromedioRespuestaMin: number;
  porMes: Array<{
    periodo: string;
    cantidad: number;
  }>;
}

export interface CuadroHonorDto {
  anio: number;
  mes: number;
  rango: {
    inicioMes: string;
    finMes: string;
    finQuincena: string;
  };
  rows: Array<{
    usuarioId: number;
    nombre: string;
    cargo: string;
    tipo: string;
    diasMensual: number;
    diasAnual: number;
    diasQuincena: number;
  }>;
}

export interface AnaliticaOperacionalDto {
  anio: number;
  mes: number;
  tiempoDespachoPromedioMin: number;
  tiempoRespuestaPromedioMin: number;
  duracionPromedioEmergenciaMin: number;
  cumplimientoRespuesta8MinPct: number;
  salidasTotalesMes: number;
  kilometrosTotalesMes: number;
  sectoresCriticos: Array<{
    sector: string;
    promedioRespuestaMin: number;
    casos: number;
  }>;
  usoUnidades: Array<{
    id: number;
    nomenclatura: string;
    salidas: number;
    km: number;
    kilometrosPromedioPorSalida: number;
  }>;
  cumplimientoChecklist: Array<{
    carroId: number;
    nomenclatura: string;
    diasConChecklist: number;
    diasMes: number;
    cumplimientoPct: number;
  }>;
  comparativoMensual?: {
    salidasMesAnterior: number;
    kilometrosMesAnterior: number;
    variacionSalidasPct: number;
    variacionKilometrosPct: number;
  };
  salidasPorSemana?: Array<{
    semana: number;
    salidas: number;
  }>;
  asistenciaVoluntariosPorMes?: Array<{
    mes: number;
    nombreMes: string;
    voluntariosConAsistencia: number;
    asistenciasRegistradas: number;
  }>;
  asistenciaVoluntariosTotalAnual?: number;
  asistenciaVoluntariosDetallePorMes?: Array<{
    mes: number;
    nombreMes: string;
    voluntarios: Array<{
      usuarioId: number;
      nombre: string;
      rol: string;
      cargo: string | null;
      asistenciasRegistradas: number;
      partesConAsistencia: number;
    }>;
  }>;
}
