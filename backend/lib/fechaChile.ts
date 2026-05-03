const TZ = 'America/Santiago';

/** Fecha/hora legible en zona Chile (listados, logs, PDF alineado con web). */
export function formatFechaHoraChile(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}
