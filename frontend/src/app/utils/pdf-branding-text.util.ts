const DEFAULT_ORG = 'SIDEP';

/** Nombre visible en PDFs (branding público o fallback SIDEP). */
export function nombreOrganizacionPdf(nombreCompania: string | null | undefined): string {
  const n = (nombreCompania ?? '').trim();
  return n || DEFAULT_ORG;
}

/** Línea corta bajo el bloque rojo del encabezado (parte de emergencia). */
export function lineaSubtituloPartePdf(nombreCompania: string | null | undefined): string {
  return `${nombreOrganizacionPdf(nombreCompania)} · Parte de emergencia`;
}

/** Pie de página: parte operativo + marca temporal. */
export function lineaPieParteOperativoPdf(nombreCompania: string | null | undefined, generadoLegible: string): string {
  return `${nombreOrganizacionPdf(nombreCompania)} · Parte operativo · ${generadoLegible}`;
}
