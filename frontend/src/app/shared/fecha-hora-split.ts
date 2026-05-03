import { formatDate } from '@angular/common';

/** Como historial de partes: día arriba, hora (24 h) debajo en `es-CL`. */
export function splitFechaHoraEsCl(iso: string | null | undefined): { fecha: string; hora: string } {
  if (iso == null || String(iso).trim() === '') {
    return { fecha: '—', hora: '—' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { fecha: '—', hora: '—' };
  }
  return {
    fecha: formatDate(d, 'dd/MM/yyyy', 'es-CL'),
    hora: formatDate(d, 'HH:mm', 'es-CL'),
  };
}
