import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CatalogoTiposEmergenciaService } from './catalogo-tipos-emergencia.service';
import { nombreArchivoPdfSidep } from '../utils/pdf-nombre-archivo.util';

@Injectable({ providedIn: 'root' })
export class PartesExportService {
  private readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);

  exportarPdfListado(partes: any[]): void {
    const generado = new Date();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('SIDEP · Historial de partes', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generado: ${generado.toLocaleString('es-CL')} · Registros: ${partes.length}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Correlativo', 'Fecha', 'Tipo', 'Dirección', 'OBAC', 'Estado']],
      body: partes.map((p: any) => [
        p.correlativo ? `P-${p.correlativo}` : String(p.id ?? '—'),
        p.fecha ? new Date(p.fecha).toLocaleString('es-CL') : '—',
        this.catalogoEmergencias.etiqueta(p.claveEmergencia || p.codigoEmergencia || '10-0'),
        p.direccion || '—',
        p.obac?.nombre || '—',
        p.estado || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [185, 28, 28] },
      margin: { left: 14, right: 14 },
    });

    doc.save(nombreArchivoPdfSidep(['Partes historial'], generado));
  }

  exportarExcelListado(partes: any[]): void {
    const generado = new Date();
    const encabezado = [
      ['SIDEP · Partes de emergencia'],
      [`Generado: ${generado.toLocaleString('es-CL')}`],
      [`Registros: ${partes.length}`],
      [],
    ];

    const columnas = ['Correlativo', 'Fecha', 'Tipo', 'Dirección', 'OBAC', 'Estado'];

    const filas = partes.map((p: any) => [
      p.correlativo || '—',
      new Date(p.fecha || '').toLocaleDateString('es-CL'),
      this.catalogoEmergencias.etiqueta(p.claveEmergencia || p.fechaEmergencia || '10-0'),
      p.direccion || '—',
      p.obac?.nombre || '—',
      p.estado || '—',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...encabezado, columnas, ...filas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partes');
    XLSX.writeFile(wb, `Partes_SIDEP_${generado.getTime()}.xlsx`);
  }

  exportarPdf(parte: any): void {
    const generado = new Date();
    const doc = new jsPDF();
    const titulo = parte.correlativo ? `Parte P-${parte.correlativo}` : 'Parte de emergencia';
    doc.setFontSize(15);
    doc.text(titulo, 14, 18);
    doc.setFontSize(10);
    doc.text(this.catalogoEmergencias.etiqueta(parte.claveEmergencia || parte.codigoEmergencia || '10-0'), 14, 26);
    doc.text(`Fecha: ${parte.fecha ? new Date(parte.fecha).toLocaleString('es-CL') : '—'}`, 14, 32);
    doc.text(`Dirección: ${parte.direccion || '—'}`, 14, 38);
    doc.text(`OBAC: ${parte.obac?.nombre || parte.metadata?.asistencia?.nombreObac || '—'}`, 14, 44);
    doc.text(`Estado: ${parte.estado || '—'}`, 14, 50);

    const filas: string[][] = [];
    const meta = parte.metadata ?? {};
    if (meta.descripcionEmergencia) filas.push(['Descripción', String(meta.descripcionEmergencia)]);
    if (meta.trabajoRealizado) filas.push(['Trabajo realizado', String(meta.trabajoRealizado)]);
    if (meta.materialUtilizado) filas.push(['Material', String(meta.materialUtilizado)]);
    if (meta.horaDelLlamado) filas.push(['Hora llamado', String(meta.horaDelLlamado)]);
    if (meta.observaciones) filas.push(['Observaciones', String(meta.observaciones)]);
    if (meta.asistencia?.asistenciaTotal) filas.push(['Asistencia total', String(meta.asistencia.asistenciaTotal)]);

    if (filas.length > 0) {
      autoTable(doc, {
        startY: 56,
        head: [['Campo', 'Detalle']],
        body: filas,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [24, 24, 27] },
        columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold' } },
        margin: { left: 14, right: 14 },
      });
    }

    doc.setFontSize(8);
    doc.text(`Generado: ${generado.toLocaleString('es-CL')}`, 14, 285);
    const id = parte.correlativo ?? parte.id ?? generado.getTime();
    doc.save(
      nombreArchivoPdfSidep(
        ['Parte', parte.correlativo ? `P-${parte.correlativo}` : String(id)],
        parte.fecha ?? generado,
      ),
    );
  }
}
