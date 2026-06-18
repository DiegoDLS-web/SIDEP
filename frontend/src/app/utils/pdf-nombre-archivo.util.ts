/** Nombre de archivo PDF institucional: `SIDEP - Carro - … - DD-MM-YYYY`. */
export function nombreArchivoPdfSidep(
  segmentos: string[],
  fechaDoc: Date | string = new Date(),
): string {
  const d = fechaDoc instanceof Date ? fechaDoc : new Date(fechaDoc);
  const fecha =
    Number.isNaN(d.getTime())
      ? new Date().toLocaleDateString('es-CL').replace(/\//g, '-')
      : d.toLocaleDateString('es-CL').replace(/\//g, '-');
  const cuerpo = segmentos
    .map((s) =>
      String(s ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\\/:*?"<>|]/g, '-'),
    )
    .filter(Boolean)
    .join(' - ');
  return `SIDEP - ${cuerpo} - ${fecha}.pdf`;
}
