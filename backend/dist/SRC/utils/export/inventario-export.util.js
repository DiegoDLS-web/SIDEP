"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarExcelInventario = generarExcelInventario;
exports.generarPdfInventario = generarPdfInventario;
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const COLUMNAS = [
    'Código',
    'Artículo',
    'Talla',
    'Tipo EPP',
    'Categoría',
    'Ubicación',
    'Total',
    'Asignados',
    'Disponibles',
    'Stock mín.',
    'Estado stock',
    'Asignado a',
    'Marca',
    'Modelo',
    'Estado físico',
    'Valor',
    'Observaciones',
];
function ubicacionItem(f) {
    const asignados = f.asignaciones.map((a) => a.usuarioNombre).join('; ');
    const bodega = f.bodegaNombre;
    if (f.cantidadAsignada > 0 && f.cantidadDisponible <= 0) {
        return asignados ? `Voluntario: ${asignados}` : bodega;
    }
    if (f.cantidadAsignada > 0 && f.cantidadDisponible > 0) {
        return `${bodega} · asignado: ${asignados}`;
    }
    return bodega;
}
function filaItem(f) {
    return [
        f.codigo,
        f.nombre,
        f.talla ?? '—',
        f.tipoEppEtiqueta ?? '—',
        f.categoria ?? '—',
        ubicacionItem(f),
        f.cantidad,
        f.cantidadAsignada,
        f.cantidadDisponible,
        f.stockMinimo,
        f.estadoStock,
        f.asignaciones.map((a) => a.usuarioNombre).join('; ') || '—',
        f.marca ?? '—',
        f.modelo ?? '—',
        f.estadoFisico ?? '—',
        f.valor ?? '—',
        f.observaciones ?? '—',
    ];
}
async function generarExcelInventario(items, tituloHoja = 'Inventario') {
    const wb = new exceljs_1.default.Workbook();
    const ws = wb.addWorksheet(tituloHoja.slice(0, 31));
    ws.addRow(COLUMNAS);
    const header = ws.getRow(1);
    header.font = { bold: true };
    for (const item of items) {
        ws.addRow(filaItem(item));
    }
    ws.columns.forEach((col) => {
        col.width = 16;
    });
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}
async function generarPdfInventario(items, titulo) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4', layout: 'landscape' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.fontSize(14).text(titulo, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(8).text(`Generado: ${new Date().toLocaleString('es-CL')} · ${items.length} ítems`);
        doc.moveDown();
        const colWidths = [45, 90, 30, 45, 50, 80, 30, 35, 35, 35, 45, 70, 40, 40, 40, 35, 60];
        let y = doc.y;
        const startX = 40;
        doc.fontSize(7).font('Helvetica-Bold');
        let x = startX;
        COLUMNAS.forEach((col, i) => {
            doc.text(col, x, y, { width: colWidths[i], continued: false });
            x += colWidths[i];
        });
        y += 14;
        doc.font('Helvetica');
        for (const item of items) {
            if (y > 520) {
                doc.addPage({ layout: 'landscape', margin: 40 });
                y = 40;
            }
            const row = filaItem(item);
            x = startX;
            row.forEach((cell, i) => {
                doc.text(String(cell), x, y, { width: colWidths[i], continued: false });
                x += colWidths[i];
            });
            y += 12;
        }
        doc.end();
    });
}
