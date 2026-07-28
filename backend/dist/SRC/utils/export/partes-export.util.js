"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarExcelPartes = generarExcelPartes;
exports.generarPdfPartes = generarPdfPartes;
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const COLUMNAS = [
    'N° Parte',
    'Fecha',
    'Clave',
    'Dirección',
    'Estado',
    'Carro',
    'OBAC',
];
function filaParte(p) {
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
async function generarExcelPartes(partes) {
    const wb = new exceljs_1.default.Workbook();
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
async function generarPdfPartes(partes, titulo) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4', layout: 'landscape' });
        const chunks = [];
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
            doc.text(col, x, y, { width: widths[i] });
            x += widths[i];
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
                doc.text(cell, x, y, { width: widths[i] });
                x += widths[i];
            });
            y += 12;
        }
        doc.end();
    });
}
