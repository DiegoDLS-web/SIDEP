/**
 * Inferencia de tipo EPP / sistema de talla desde nombre de artículo.
 */
export const TALLAS_BOTA = Array.from({ length: 12 }, (_, i) => String(35 + i)); // 35–46
export const TALLAS_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export type SistemaTalla = 'BOTA' | 'ROPA' | null;

export function inferirTipoEpp(nombre: string, categoria?: string | null): string | null {
  const n = `${nombre} ${categoria ?? ''}`.toLowerCase();

  if (/bota/.test(n) && /estructural/.test(n)) return 'BOTA_ESTRUCTURAL';
  if (/bota/.test(n) && /(forestal|incendio)/.test(n)) return 'BOTA_FORESTAL';
  if (/bota/.test(n)) return 'BOTA_ESTRUCTURAL';

  if (/chaqueta/.test(n) && /rescate/.test(n)) return 'CHAQUETA_RESCATE';
  if (/chaqueta/.test(n) && /forestal/.test(n)) return 'CHAQUETA_FORESTAL';
  if (/chaqueta/.test(n) && /agua/.test(n)) return 'CHAQUETA_AGUA';
  if (/chaqueta/.test(n) && /uniforme/.test(n)) return 'CHAQUETA_UNIFORME';
  if (/chaqueta/.test(n)) return 'CHAQUETA';

  if (/jardinera/.test(n)) return 'JARDINERA';
  if (/uniforme\s*(n[úu]mero\s*)?1|uniforme\s*n[ºo°.]?\s*1/.test(n)) return 'UNIFORME_N1';
  if (/gorra/.test(n)) return 'GORRA';
  if (/casco/.test(n)) return 'CASCO';
  if (/guante/.test(n)) return 'GUANTE';
  if (/pantal[oó]n/.test(n)) return 'PANTALON';

  return null;
}

export function inferirSistemaTalla(tipoEpp: string | null): SistemaTalla {
  if (!tipoEpp) return null;
  if (tipoEpp.startsWith('BOTA_')) return 'BOTA';
  if (
    tipoEpp.startsWith('CHAQUETA') ||
    tipoEpp === 'JARDINERA' ||
    tipoEpp === 'UNIFORME_N1' ||
    tipoEpp === 'GORRA' ||
    tipoEpp === 'PANTALON'
  ) {
    return 'ROPA';
  }
  return null;
}

export function validarTalla(sistema: SistemaTalla, talla: string | null | undefined): string | null {
  if (!sistema) return null;
  const t = String(talla ?? '').trim().toUpperCase();
  if (!t) return `Debes indicar la talla (${sistema === 'BOTA' ? '35–46' : 'XS–XXL'}).`;
  if (sistema === 'BOTA' && !TALLAS_BOTA.includes(t)) {
    return `Talla de bota inválida. Usa una entre 35 y 46.`;
  }
  if (sistema === 'ROPA' && !(TALLAS_ROPA as readonly string[]).includes(t)) {
    return `Talla de ropa inválida. Usa XS, S, M, L, XL o XXL.`;
  }
  return null;
}

/** Intenta leer talla desde el nombre (ej. "Bota estructural 43", "Chaqueta M"). */
export function extraerTallaDeNombre(nombre: string, sistema: SistemaTalla): string | null {
  if (!sistema) return null;
  if (sistema === 'BOTA') {
    const m = nombre.match(/\b(3[5-9]|4[0-6])\b/);
    return m?.[1] ?? null;
  }
  const m = nombre.toUpperCase().match(/\b(XXL|XL|XS|S|M|L)\b/);
  return m?.[1] ?? null;
}

export function etiquetaTipoEpp(tipo: string | null | undefined): string {
  if (!tipo) return '—';
  return tipo
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
