import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

type ParteListado = {
  id?: string;
  correlativo?: number | string | null;
  fechaEmergencia?: string | Date | null;
  claveEmergencia?: string | null;
  codigoEmergencia?: string | null;
  direccion?: string | null;
  estado?: string | null;
  clave?: { codigo?: string; nombre?: string } | null;
  obac?: { nombre?: string } | null;
  unidades?: Array<{ carro?: { nombre?: string; codigo?: string } | null }> | null;
  metadata?: { comuna?: string } | null;
};

const COLUMNAS = [
  'N° Parte',
  'Fecha',
  'Clave',
  'Dirección',
  'Estado',
  'Carro',
  'OBAC',
];

function filaParte(p: ParteListado): string[] {
  const fecha = p.fechaEmergencia ? new Date(p.fechaEmergencia).toLocaleString('es-CL') : '—';
  const carro = p.unidades?.[0]?.carro?.nombre ?? p.unidades?.[0]?.carro?.codigo ?? '—';
  return [
    String(p.correlativo ?? p.id ?? '—'),
    fecha,
    p.claveEmergencia ?? p.codigoEmergencia ?? p.clave?.codigo ?? '—',
    p.direccion ?? '—',
    p.estado ?? '—',
    carro,
    p.obac?.nombre ?? '—',
  ];
}

export async function generarExcelPartes(partes: ParteListado[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Partes');
  ws.addRow(COLUMNAS);
  ws.getRow(1).font = { bold: true };
  for (const p of partes) {
    ws.addRow(filaParte(p));
  }
  ws.columns.forEach((c) => {
    c.width = 18;
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generarPdfPartes(partes: ParteListado[], titulo: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).text(titulo, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).text(`${partes.length} registros · ${new Date().toLocaleString('es-CL')}`);
    doc.moveDown();

    const widths = [50, 80, 50, 140, 50, 60, 90];
    let y = doc.y;
    const startX = 40;
    doc.fontSize(8).font('Helvetica-Bold');
    let x = startX;
    COLUMNAS.forEach((col, i) => {
      doc.text(col, x, y, { width: widths[i]! });
      x += widths[i]!;
    });
    y += 16;
    doc.font('Helvetica').fontSize(7);

    for (const p of partes) {
      if (y > 520) {
        doc.addPage({ layout: 'landscape', margin: 40 });
        y = 40;
      }
      const row = filaParte(p);
      x = startX;
      row.forEach((cell, i) => {
        doc.text(cell, x, y, { width: widths[i]! });
        x += widths[i]!;
      });
      y += 12;
    }
    doc.end();
  });
}
