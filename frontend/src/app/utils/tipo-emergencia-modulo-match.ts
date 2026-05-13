/**
 * Cruza claves del catálogo de emergencias (partes) con `ChecklistCarro.tipo` del backend.
 * Solo CHECKLIST_UNIDAD → UNIDAD, CHECKLIST_ERA → ERA, BOLSO_TRAUMA → TRAUMA tienen sentido
 * en historiales de checklist/bolso; códigos 10-x u otros no aplican a ese campo.
 */
const CLAVE_A_REGISTRO_TIPO: Partial<Record<string, 'UNIDAD' | 'ERA' | 'TRAUMA'>> = {
  CHECKLIST_UNIDAD: 'UNIDAD',
  CHECKLIST_ERA: 'ERA',
  BOLSO_TRAUMA: 'TRAUMA',
};

export function historialCoincideSeleccionTipoEmergencia(
  registroTipo: string | null | undefined,
  seleccion: string[],
): boolean {
  if (!seleccion.length) return true;
  const rt = (registroTipo ?? '').trim().toUpperCase();
  const hayAlgunaClaveMapeada = seleccion.some((c) => CLAVE_A_REGISTRO_TIPO[c] != null);
  if (!hayAlgunaClaveMapeada) return false;
  return seleccion.some((c) => CLAVE_A_REGISTRO_TIPO[c] === rt);
}
