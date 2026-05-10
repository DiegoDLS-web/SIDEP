/** Períodos del listado de partes (filtro rápido). */
export type PartesPeriodoFilter = 'todos' | 'hoy' | 'semana' | 'mes';

/** Comprueba que día/mes/año existe en calendario (horario local). */
export function fechaCalendarioValida(dia: number, mes1a12: number, anio: number): boolean {
  if (
    mes1a12 < 1 ||
    mes1a12 > 12 ||
    anio < 1000 ||
    anio > 9999 ||
    dia < 1 ||
    dia > 31 ||
    !Number.isInteger(dia) ||
    !Number.isInteger(mes1a12) ||
    !Number.isInteger(anio)
  ) {
    return false;
  }
  const dt = new Date(anio, mes1a12 - 1, dia);
  return (
    dt.getFullYear() === anio &&
    dt.getMonth() === mes1a12 - 1 &&
    dt.getDate() === dia
  );
}

/**
 * Mensaje de error si el usuario escribió texto en el campo fecha y no es DD/MM/AAAA válido.
 * Cadena vacía → null (sin error).
 */
export function mensajeErrorFechaParteSiHay(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return 'Usa el formato DD/MM/AAAA.';
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (!fechaCalendarioValida(d, mo, y)) {
    return 'Esa fecha no existe en el calendario.';
  }
  return null;
}

/** Rango en ISO UTC vía Date#toISOString (misma política que el listado antes del refactor). */
export function rangoIsoListadoPartes(params: {
  filtroFechaTrim: string;
  filtroPeriodo: PartesPeriodoFilter;
  /** Inyectado en tests; por defecto `new Date()`. */
  ahora?: Date;
}): { desde?: string; hasta?: string } {
  const fd = params.filtroFechaTrim;
  const ahoraBase = params.ahora ? new Date(params.ahora.getTime()) : new Date();

  if (fd) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(fd);
    if (m) {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      const y = Number(m[3]);
      if (fechaCalendarioValida(d, mo, y)) {
        const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
        const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
        return { desde: start.toISOString(), hasta: end.toISOString() };
      }
    }
    // Texto pero inválido: no fuerza día; período rápido puede seguir aplicando.
  }

  const hoy = new Date(ahoraBase);
  hoy.setHours(0, 0, 0, 0);

  if (params.filtroPeriodo === 'hoy') {
    const end = new Date(hoy);
    end.setHours(23, 59, 59, 999);
    return { desde: hoy.toISOString(), hasta: end.toISOString() };
  }

  if (params.filtroPeriodo === 'semana') {
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 7);
    const end = new Date(ahoraBase);
    end.setHours(23, 59, 59, 999);
    return { desde: desde.toISOString(), hasta: end.toISOString() };
  }

  if (params.filtroPeriodo === 'mes') {
    const y = hoy.getFullYear();
    const mes = hoy.getMonth();
    const desde = new Date(y, mes, 1, 0, 0, 0, 0);
    const hasta = new Date(y, mes + 1, 0, 23, 59, 59, 999);
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }

  return {};
}
