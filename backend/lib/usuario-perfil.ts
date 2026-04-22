/** Cargos institucionales (un valor por persona). */
export const CARGOS_OFICIALIDAD = [
  'DIRECTOR_COMPANIA',
  'SECRETARIO_COMPANIA',
  'TESORERO_COMPANIA',
  'PRO_SECRETARIO_COMPANIA',
  'CAPITAN_COMPANIA',
  'TENIENTE_PRIMERO',
  'TENIENTE_SEGUNDO',
  'TENIENTE_TERCERO',
  'TENIENTE_CUARTO',
  'AYUDANTE_COMPANIA',
  'PRO_AYUDANTE',
  'VICE_SUPERINTENDENTE',
  'SECRETARIO_GENERAL',
  'TESORERO_GENERAL',
  'SEGUNDO_COMANDANTE',
  'INSPECTOR_COMANDANCIA_1',
  'INSPECTOR_COMANDANCIA_2',
] as const;

export const TIPOS_VOLUNTARIO = [
  'ACTIVO',
  'HONORARIO',
  'CUARTELERO',
  'CANJE',
  'CONFEDERADO',
  'INSIGNE',
] as const;

export const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'DESCONOCIDO'] as const;

export function esCargoValido(c: string | undefined | null): boolean {
  if (!c?.trim()) return false;
  return (CARGOS_OFICIALIDAD as readonly string[]).includes(c.trim());
}

export function esTipoVoluntarioValido(t: string | undefined | null): boolean {
  if (!t?.trim()) return false;
  return (TIPOS_VOLUNTARIO as readonly string[]).includes(t.trim());
}

export function nombreCompletoDesdePartes(p: {
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
}): string {
  const partes = [p.nombres, p.apellidoPaterno, p.apellidoMaterno].map((x) => (x ?? '').trim()).filter(Boolean);
  return partes.join(' ').trim();
}

const MAX_FIRMA_CHARS = 2_800_000;

export function normalizarFirmaDataUrl(raw: string | undefined | null): string | null {
  if (raw == null || raw === '') return null;
  const s = raw.trim();
  if (!s.startsWith('data:image/')) {
    throw new Error('La firma debe ser una imagen en base64 (data:image/...)');
  }
  if (s.length > MAX_FIRMA_CHARS) {
    throw new Error('La imagen de firma es demasiado grande');
  }
  const lower = s.slice(0, 40).toLowerCase();
  if (!lower.includes('png') && !lower.includes('jpeg') && !lower.includes('jpg')) {
    throw new Error('Solo se permiten imágenes PNG o JPEG');
  }
  return s;
}
