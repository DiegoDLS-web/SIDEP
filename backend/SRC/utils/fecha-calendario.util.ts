/** Zona horaria operacional SIDEP (compañía en Chile). */
export const SIDEP_TIMEZONE = 'America/Santiago';

/** Clave `YYYY-MM-DD` según calendario en America/Santiago. */
export function fechaCalendarioKey(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SIDEP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

function parseCalendarioKey(key: string): { y: number; m: number; d: number } {
  const parts = key.split('-').map(Number);
  return { y: parts[0] ?? 0, m: parts[1] ?? 0, d: parts[2] ?? 0 };
}

/** Suma días sobre una clave de calendario (respeta DST vía mediodía UTC). */
export function sumarDiasCalendarioKey(key: string, delta: number): string {
  const { y, m, d } = parseCalendarioKey(key);
  const utc = Date.UTC(y, m - 1, d + delta, 12, 0, 0);
  return fechaCalendarioKey(new Date(utc));
}

/** Día de la semana 0=lunes … 6=domingo (calendario Santiago). */
export function diaSemanaCalendarioKey(key: string): number {
  const { y, m, d } = parseCalendarioKey(key);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SIDEP_TIMEZONE,
    weekday: 'short',
  }).format(new Date(utc));
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[weekday] ?? 0;
}

/** Inicio del bloque de heatmap: lunes de la semana más antigua (N semanas). */
export function inicioHeatmapDesdeFin(finKey: string, semanas: number): string {
  const diasDesdeLunes = diaSemanaCalendarioKey(finKey);
  return sumarDiasCalendarioKey(finKey, -(diasDesdeLunes + (semanas - 1) * 7));
}

/** Genera claves YYYY-MM-DD consecutivas [inicio, fin] inclusive. */
export function rangoCalendarioKeys(inicioKey: string, finKey: string): string[] {
  const keys: string[] = [];
  let cur = inicioKey;
  while (cur <= finKey) {
    keys.push(cur);
    cur = sumarDiasCalendarioKey(cur, 1);
  }
  return keys;
}
