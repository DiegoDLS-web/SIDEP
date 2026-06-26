import * as XLSX from 'xlsx';

export interface ExcelExportSidepOpts {
  titulo: string;
  meta?: string[];
  columnas: string[];
  filas: unknown[][];
  nombreHoja?: string;
  nombreArchivo: string;
  anchosCols?: number[];
}

/** Exporta Excel con cabecera institucional SIDEP y anchos de columna opcionales. */
export function exportarExcelSidep(opts: ExcelExportSidepOpts): void {
  const generado = new Date();
  const encabezado: unknown[][] = [
    [opts.titulo],
    ['1ª Compañía Santa Juana · SIDEP'],
    [`Generado: ${generado.toLocaleString('es-CL')}`],
    ...(opts.meta ?? []).map((m) => [m]),
    [],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...encabezado, opts.columnas, ...opts.filas]);
  if (opts.anchosCols?.length) {
    ws['!cols'] = opts.anchosCols.map((wch) => ({ wch }));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.nombreHoja ?? 'Datos');
  XLSX.writeFile(wb, opts.nombreArchivo);
}
