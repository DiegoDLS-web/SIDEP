import type { EstadoChecklist } from '../models/checklist.dto';

export function calcularEstadoChecklist(
  totalItems: number | null | undefined,
  itemsOk: number | null | undefined,
  observaciones: string | null | undefined,
): EstadoChecklist {
  const total = Number(totalItems ?? 0);
  const ok = Number(itemsOk ?? 0);
  const tieneObservaciones = String(observaciones ?? '').trim().length > 0;
  if (tieneObservaciones) return 'CON_OBSERVACION';
  if (total > 0 && ok >= total) return 'COMPLETADO';
  return 'PENDIENTE';
}

export function etiquetaEstadoChecklist(estado: EstadoChecklist): string {
  if (estado === 'COMPLETADO') return 'Completado';
  if (estado === 'CON_OBSERVACION') return 'Con observación';
  return 'Pendiente';
}
