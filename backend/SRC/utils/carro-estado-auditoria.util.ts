export interface UltimoCambioEstadoCarroDto {
  motivo: string;
  fechaEfectiva: string;
  registradoEn?: string;
}

export function parsearUltimoCambioEstadoCarro(
  detalle: string | null | undefined,
): Omit<UltimoCambioEstadoCarroDto, 'registradoEn'> | null {
  if (!detalle) return null;
  const match = detalle.match(/Motivo:\s*(.+?)\.\s*Fecha:\s*(.+?)\.\s*$/);
  if (!match) return null;
  return { motivo: match[1]!.trim(), fechaEfectiva: match[2]!.trim() };
}

export function formatearFechaAlertaCarro(fecha: string): string {
  const iso = fecha.slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (y && m && d) return `${d}/${m}/${y}`;
  return fecha;
}

export function detalleEstadoOficialCarro(
  cambio: Omit<UltimoCambioEstadoCarroDto, 'registradoEn'> | null | undefined,
  fallback: string,
): string {
  if (!cambio?.motivo) return fallback;
  const fechaTxt = cambio.fechaEfectiva ? formatearFechaAlertaCarro(cambio.fechaEfectiva) : '—';
  return `Motivo: ${cambio.motivo}. Fecha efectiva: ${fechaTxt}.`;
}
