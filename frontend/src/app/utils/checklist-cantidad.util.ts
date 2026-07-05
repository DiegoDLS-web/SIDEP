export const MAX_CANTIDAD_CHECKLIST = 50;
export const MAX_PRESION_AIRE_ERA = 5000;

/** Normaliza cantidades de checklist (0 … max, sin negativos). */
export function normalizarCantidadChecklist(raw: unknown, max = MAX_CANTIDAD_CHECKLIST): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(0, n));
}

/** Normaliza presión de aire ERA como texto numérico (0 … 5000). */
export function normalizarPresionAireEra(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return '0';
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return '0';
  return String(Math.min(MAX_PRESION_AIRE_ERA, Math.max(0, n)));
}

export function mensajeCantidadChecklistInvalida(raw: unknown, max = MAX_CANTIDAD_CHECKLIST): string | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 'Cantidad inválida.';
  if (n < 0) return 'No se permiten cantidades negativas.';
  if (n > max) return `La cantidad máxima permitida es ${max}.`;
  return null;
}

/** Reinicia cantidades actuales a 0 (nuevo registro de inspección). */
export function reiniciarCantidadesActualesUbicaciones<
  T extends { materiales: Array<{ cantidadActual: number } & Record<string, unknown>> },
>(ubicaciones: T[]): T[] {
  return ubicaciones.map((u) => ({
    ...u,
    materiales: u.materiales.map((m) => ({ ...m, cantidadActual: 0 })),
  }));
}

export function mensajePresionAireInvalida(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d]/g, '') || NaN);
  if (!Number.isFinite(n)) return 'Presión de aire inválida.';
  if (n < 0) return 'No se permiten presiones negativas.';
  if (n > MAX_PRESION_AIRE_ERA) return `La presión máxima permitida es ${MAX_PRESION_AIRE_ERA}.`;
  return null;
}
