export interface ExcelExportSidepOpts {
  titulo: string;
  meta?: string[];
  columnas: string[];
  filas: unknown[][];
  nombreHoja?: string;
  nombreArchivo: string;
  anchosCols?: number[];
}

export interface ExcelHojaSidep {
  nombreHoja: string;
  titulo: string;
  meta?: string[];
  columnas: string[];
  filas: unknown[][];
  anchosCols?: number[];
}

type XlsxStyleModule = typeof import('xlsx-js-style');
let xlsxPromise: Promise<XlsxStyleModule> | null = null;

function loadXlsx(): Promise<XlsxStyleModule> {
  if (!xlsxPromise) xlsxPromise = import('xlsx-js-style');
  return xlsxPromise;
}

const ESTILO_TITULO = {
  font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '1F2937' } },
  alignment: { vertical: 'center', horizontal: 'left' },
};

const ESTILO_SUBTITULO = {
  font: { sz: 11, color: { rgb: 'D1D5DB' } },
  fill: { fgColor: { rgb: '111827' } },
};

const ESTILO_META = {
  font: { sz: 10, italic: true, color: { rgb: '9CA3AF' } },
  fill: { fgColor: { rgb: '111827' } },
};

const ESTILO_HEADER = {
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'B45309' } },
  alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: '78350F' } },
    bottom: { style: 'thin', color: { rgb: '78350F' } },
    left: { style: 'thin', color: { rgb: '78350F' } },
    right: { style: 'thin', color: { rgb: '78350F' } },
  },
};

const ESTILO_CELDA = {
  font: { sz: 10, color: { rgb: '1F2937' } },
  alignment: { vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
};

const ESTILO_CELDA_ZEBRA = {
  ...ESTILO_CELDA,
  fill: { fgColor: { rgb: 'F9FAFB' } },
};

function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x >= 0) {
    s = String.fromCharCode((x % 26) + 65) + s;
    x = Math.floor(x / 26) - 1;
  }
  return s;
}

function aplicarEstilosHoja(
  XLSX: XlsxStyleModule,
  ws: import('xlsx-js-style').WorkSheet,
  encabezadoFilas: number,
  numCols: number,
  numFilasDatos: number,
): void {
  const tituloAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[tituloAddr]) ws[tituloAddr].s = ESTILO_TITULO;

  for (let r = 1; r < encabezadoFilas - 1; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[addr]) ws[addr].s = r === 1 ? ESTILO_SUBTITULO : ESTILO_META;
  }

  const headerRow = encabezadoFilas - 1;
  for (let c = 0; c < numCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    if (ws[addr]) ws[addr].s = ESTILO_HEADER;
  }

  for (let r = 0; r < numFilasDatos; r++) {
    const filaReal = encabezadoFilas + r;
    const estilo = r % 2 === 1 ? ESTILO_CELDA_ZEBRA : ESTILO_CELDA;
    for (let c = 0; c < numCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: filaReal, c });
      if (ws[addr]) ws[addr].s = estilo;
    }
  }

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, numCols - 1) } }];
  ws['!freeze'] = { xSplit: 0, ySplit: encabezadoFilas, topLeftCell: `A${encabezadoFilas + 1}`, activePane: 'bottomLeft' };
  ws['!autofilter'] = {
    ref: `${colLetter(0)}${encabezadoFilas}:${colLetter(numCols - 1)}${encabezadoFilas + numFilasDatos}`,
  };
}

function construirHoja(XLSX: XlsxStyleModule, opts: ExcelHojaSidep, generado: Date) {
  const encabezado: unknown[][] = [
    [opts.titulo],
    ['1ª Compañía Santa Juana · SIDEP'],
    [`Generado: ${generado.toLocaleString('es-CL')}`],
    ...(opts.meta ?? []).map((m) => [m]),
    [],
  ];
  const encabezadoFilas = encabezado.length + 1;
  const ws = XLSX.utils.aoa_to_sheet([...encabezado, opts.columnas, ...opts.filas]);
  if (opts.anchosCols?.length) {
    ws['!cols'] = opts.anchosCols.map((wch) => ({ wch }));
  }
  aplicarEstilosHoja(XLSX, ws, encabezadoFilas, opts.columnas.length, opts.filas.length);
  return ws;
}

/** Exporta Excel con cabecera institucional SIDEP y estilos (carga xlsx-js-style bajo demanda). */
export function exportarExcelSidep(opts: ExcelExportSidepOpts): void {
  void loadXlsx().then((XLSX) => {
    const generado = new Date();
    const ws = construirHoja(
      XLSX,
      {
        nombreHoja: opts.nombreHoja ?? 'Datos',
        titulo: opts.titulo,
        meta: opts.meta,
        columnas: opts.columnas,
        filas: opts.filas,
        anchosCols: opts.anchosCols,
      },
      generado,
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, opts.nombreHoja ?? 'Datos');
    XLSX.writeFile(wb, opts.nombreArchivo);
  });
}

/** Exporta un libro Excel con varias hojas estilizadas. */
export function exportarExcelMultiHojaSidep(hojas: ExcelHojaSidep[], nombreArchivo: string): void {
  void loadXlsx().then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const generado = new Date();
    for (const hoja of hojas) {
      const ws = construirHoja(XLSX, hoja, generado);
      const nombre = hoja.nombreHoja.slice(0, 31).replace(/[\\/?*[\]:]/g, '-');
      XLSX.utils.book_append_sheet(wb, ws, nombre || 'Datos');
    }
    XLSX.writeFile(wb, nombreArchivo);
  });
}

/** Matriz EPP/uniformes: filas = tipo, columnas = tallas. */
export function exportarExcelMatrizEpp(
  matriz: Array<{
    tipoEppEtiqueta: string;
    tallas: string[];
    celdas: Record<string, { cantidad: number; cantidadDisponible: number; asignaciones: Array<{ usuarioNombre: string }> } | null>;
    totalCantidad: number;
    totalDisponible: number;
    totalAsignado: number;
  }>,
  nombreArchivo: string,
  titulo = 'Matriz EPP / Uniformes por talla',
): void {
  if (!matriz.length) return;
  const tallasUnicas = [...new Set(matriz.flatMap((f) => f.tallas))].filter((t) => t !== '—');
  const columnas = ['Tipo EPP', ...tallasUnicas, 'Total', 'Disponible', 'Asignado'];
  const filas = matriz.map((fila) => {
    const celdasTalla = tallasUnicas.map((t) => {
      const c = fila.celdas[t];
      if (!c) return '';
      const nombres = c.asignaciones.map((a) => a.usuarioNombre.split(' ')[0]).join(', ');
      return nombres ? `${c.cantidad} (${nombres})` : String(c.cantidad);
    });
    return [fila.tipoEppEtiqueta, ...celdasTalla, fila.totalCantidad, fila.totalDisponible, fila.totalAsignado];
  });
  exportarExcelSidep({
    titulo,
    meta: [`Tipos EPP: ${matriz.length}`, `Tallas: ${tallasUnicas.join(', ')}`],
    columnas,
    filas,
    nombreHoja: 'Matriz tallas',
    nombreArchivo,
    anchosCols: [22, ...tallasUnicas.map(() => 10), 8, 10, 10],
  });
}
