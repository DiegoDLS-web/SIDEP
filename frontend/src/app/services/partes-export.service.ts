import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ParteEmergenciaDto, ParteMetadataDto } from '../models/parte.dto';

type DocWithLast = jsPDF & { lastAutoTable?: { finalY: number } };

const M = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - M * 2;

/** Rojo institucional (alineado con otros PDFs SIDEP). */
const C_ACCENT: [number, number, number] = [185, 28, 28];
const C_TEXT_MUTED: [number, number, number] = [82, 82, 91];
const C_BG_SOFT: [number, number, number] = [250, 250, 251];
const C_BORDER: [number, number, number] = [228, 228, 231];

function lastTableY(doc: jsPDF): number {
  return (doc as DocWithLast).lastAutoTable?.finalY ?? M;
}

function fmtFirmaJsPdf(firma: string): 'PNG' | 'JPEG' {
  const l = firma.slice(0, 60).toLowerCase();
  if (l.includes('jpeg') || l.includes('jpg')) {
    return 'JPEG';
  }
  return 'PNG';
}

function addWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineHeight: number,
): number {
  const t = (text ?? '').trim() || '—';
  const lines = doc.splitTextToSize(t, maxW);
  let yy = y;
  for (const line of lines) {
    if (yy > 275) {
      doc.addPage();
      yy = M + 6;
    }
    doc.text(line, x, yy);
    yy += lineHeight;
  }
  return yy;
}

function sectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(...C_ACCENT);
  doc.rect(M, y, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text(title, M + 6, y + 4.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function ensureSpace(doc: jsPDF, y: number, minBottom: number): number {
  if (y > minBottom) {
    doc.addPage();
    return M + 4;
  }
  return y;
}

function fmtFechaHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL');
}

function fmtKm(km: number): string {
  if (Number.isNaN(km)) {
    return '—';
  }
  return new Intl.NumberFormat('es-CL').format(km);
}

function resumenAsistencia(m: ParteMetadataDto | null | undefined): string {
  const a = m?.asistencia;
  if (!a) {
    return '';
  }
  const partes: string[] = [];
  if (a.asistenciaTotal?.trim()) {
    partes.push(`Total indicado: ${a.asistenciaTotal.trim()}`);
  }
  if (a.oficial128?.trim()) {
    partes.push(`Oficial 12-8: ${a.oficial128.trim()}`);
  }
  const cmd = [a.comandoIncidenteCi, a.comandoIncidenteJs, a.comandoIncidenteJo]
    .filter((x) => x?.trim())
    .join(' · ');
  if (cmd) {
    partes.push(`Comando incidente: ${cmd}`);
  }
  if (a.otraCompaniaNombre?.trim()) {
    partes.push(`Apoyo otra compañía: ${a.otraCompaniaNombre.trim()}`);
  }
  if (a.encargadoDatos?.trim()) {
    partes.push(`Encargado datos: ${a.encargadoDatos.trim()}`);
  }
  if (a.radiosUtilizadas?.trim()) {
    partes.push(`Radios: ${a.radiosUtilizadas.trim()}`);
  }
  return partes.join('\n');
}

@Injectable({ providedIn: 'root' })
export class PartesExportService {
  private logosPromise: Promise<{ sidep: string | null; compania: string | null }> | null = null;

  private cargarLogoComoDataUrl(path: string): Promise<string | null> {
    return fetch(path)
      .then((res) => (res.ok ? res.blob() : null))
      .then(
        (blob) =>
          new Promise<string | null>((resolve) => {
            if (!blob) {
              resolve(null);
              return;
            }
            const fr = new FileReader();
            fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
            fr.onerror = () => resolve(null);
            fr.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }

  private getLogos(): Promise<{ sidep: string | null; compania: string | null }> {
    if (!this.logosPromise) {
      this.logosPromise = Promise.all([
        this.cargarLogoComoDataUrl('/assets/logos/sidep-logo.png'),
        this.cargarLogoComoDataUrl('/assets/logos/compania-logo.png'),
      ]).then(([sidep, compania]) => ({ sidep, compania }));
    }
    return this.logosPromise;
  }

  exportarPdf(parte: ParteEmergenciaDto): void {
    void this.exportarPdfAsync(parte);
  }

  private async exportarPdfAsync(parte: ParteEmergenciaDto): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const m = parte.metadata;
    const logos = await this.getLogos();

    // ——— Cabecera principal ———
    doc.setFillColor(...C_ACCENT);
    doc.roundedRect(M, M, CONTENT_W, 26, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('SIDEP · Parte de emergencia', M + 4, M + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('Registro operativo', M + 4, M + 16);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const idTxt = `N° ${parte.correlativo}`;
    doc.text(idTxt, M + CONTENT_W - 4, M + 14, { align: 'right' });
    if (logos.sidep?.startsWith('data:image')) {
      try {
        doc.addImage(logos.sidep, fmtFirmaJsPdf(logos.sidep), M + 1.5, M + 1.8, 8.5, 8.5);
      } catch {
        // ignore logo rendering errors
      }
    }
    if (logos.compania?.startsWith('data:image')) {
      try {
        doc.addImage(logos.compania, fmtFirmaJsPdf(logos.compania), M + CONTENT_W - 18, M + 1.2, 14, 10);
      } catch {
        // ignore logo rendering errors
      }
    }
    doc.setTextColor(0, 0, 0);

    let y = M + 32;

    // Franja resumen (clave, estado, fecha)
    doc.setFillColor(...C_BG_SOFT);
    doc.setDrawColor(...C_BORDER);
    doc.roundedRect(M, y, CONTENT_W, 16, 1.5, 1.5, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text('Clave', M + 4, y + 6);
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(parte.claveEmergencia || '—', M + 4, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text('Estado', M + 58, y + 6);
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text((parte.estado || '—').toUpperCase(), M + 58, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text('Fecha y hora', M + 110, y + 6);
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtFechaHora(parte.fecha), M + 110, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    y += 22;

    y = ensureSpace(doc, y, 240);

    // ——— Sección: Identificación ———
    y = sectionHeading(doc, y, 'Identificación del hecho');
    const filasIdent: [string, string][] = [
      ['Dirección / lugar', parte.direccion || '—'],
      [
        'Oficial a cargo (OBAC)',
        `${parte.obac.nombre}${parte.obac.rut ? ` · RUT ${parte.obac.rut}` : ''}`,
      ],
    ];
    autoTable(doc, {
      startY: y,
      body: filasIdent,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        lineColor: C_BORDER,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', textColor: C_TEXT_MUTED, fillColor: C_BG_SOFT },
        1: { cellWidth: CONTENT_W - 48 - 0.5 },
      },
      margin: { left: M, right: M },
      tableWidth: CONTENT_W,
    });
    y = lastTableY(doc) + 8;

    y = ensureSpace(doc, y, 230);

    // ——— Detalle narrativo ———
    const tieneNarrativa = Boolean(
      m?.descripcionEmergencia?.trim() ||
        m?.trabajoRealizado?.trim() ||
        m?.materialUtilizado?.trim() ||
        m?.observaciones?.trim() ||
        m?.horaDelLlamado?.trim(),
    );
    if (tieneNarrativa) {
      y = sectionHeading(doc, y, 'Detalle del incidente');
      doc.setFontSize(8);
      doc.setTextColor(...C_TEXT_MUTED);
      const bloques: { lab: string; val: string }[] = [];
      if (m?.horaDelLlamado?.trim()) {
        bloques.push({ lab: 'Hora del llamado (reloj)', val: m.horaDelLlamado.trim() });
      }
      if (m?.descripcionEmergencia?.trim()) {
        bloques.push({ lab: 'Descripción de la emergencia', val: m.descripcionEmergencia.trim() });
      }
      if (m?.trabajoRealizado?.trim()) {
        bloques.push({ lab: 'Trabajo realizado', val: m.trabajoRealizado.trim() });
      }
      if (m?.materialUtilizado?.trim()) {
        bloques.push({ lab: 'Material utilizado', val: m.materialUtilizado.trim() });
      }
      if (m?.observaciones?.trim()) {
        bloques.push({ lab: 'Observaciones', val: m.observaciones.trim() });
      }
      for (const b of bloques) {
        y = ensureSpace(doc, y, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C_TEXT_MUTED);
        doc.text(b.lab.toUpperCase(), M, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(24, 24, 27);
        y = addWrapped(doc, b.val, M, y, CONTENT_W, 4.2) + 5;
      }
      doc.setTextColor(0, 0, 0);
      y += 2;
    }

    y = ensureSpace(doc, y, 220);

    // ——— Unidades ———
    y = sectionHeading(doc, y, 'Unidades despachadas');
    autoTable(doc, {
      startY: y,
      head: [['Unidad', 'Patente', '6-0', '6-3', '6-9', '6-10', 'KM salida', 'KM llegada']],
      body: parte.unidades.map((u) => [
        u.carro.nomenclatura,
        u.carro.patente ?? '—',
        u.hora6_0 ?? u.horaSalida ?? '—',
        u.hora6_3 ?? '—',
        u.hora6_9 ?? '—',
        u.hora6_10 ?? u.horaLlegada ?? '—',
        fmtKm(u.kmSalida),
        fmtKm(u.kmLlegada),
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: C_ACCENT,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: { fontSize: 8.5, textColor: [24, 24, 27] },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      styles: { cellPadding: 2.5, lineColor: C_BORDER, lineWidth: 0.1 },
      margin: { left: M, right: M },
      tableWidth: CONTENT_W,
    });
    y = lastTableY(doc) + 8;

    // Conductores por unidad
    const cond = m?.conductoresPorCarroId;
    if (cond && Object.keys(cond).length > 0) {
      y = ensureSpace(doc, y, 240);
      y = sectionHeading(doc, y, 'Conductores por unidad');
      const cuerpo = Object.entries(cond).map(([carroId, nombre]) => [
        `Carro ID ${carroId}`,
        nombre?.trim() || '—',
      ]);
      autoTable(doc, {
        startY: y,
        head: [['Referencia', 'Conductor']],
        body: cuerpo,
        headStyles: { fillColor: [63, 63, 70], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 9 },
        styles: { cellPadding: 2 },
        margin: { left: M, right: M },
        tableWidth: CONTENT_W,
      });
      y = lastTableY(doc) + 8;
    }

    y = ensureSpace(doc, y, 220);

    // ——— Pacientes ———
    if (parte.pacientes.length > 0) {
      y = sectionHeading(doc, y, 'Pacientes');
      autoTable(doc, {
        startY: y,
        head: [['Nombre', 'Edad', 'RUT', 'Triage']],
        body: parte.pacientes.map((p) => [
          p.nombre,
          p.edad != null ? String(p.edad) : '—',
          p.rut ?? '—',
          p.triage,
        ]),
        headStyles: {
          fillColor: C_ACCENT,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [252, 252, 253] },
        styles: { cellPadding: 2.5 },
        margin: { left: M, right: M },
        tableWidth: CONTENT_W,
      });
      y = lastTableY(doc) + 8;
    }

    // Vehículos en metadata
    if (m?.vehiculos && m.vehiculos.length > 0) {
      y = ensureSpace(doc, y, 230);
      y = sectionHeading(doc, y, 'Vehículos registrados');
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Patente', 'Marca', 'Conductor', 'RUT']],
        body: m.vehiculos.map((v) => [
          v.tipo || '—',
          v.patente || '—',
          v.marca || '—',
          v.conductor || '—',
          v.rut || '—',
        ]),
        headStyles: { fillColor: [63, 63, 70], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: 2 },
        margin: { left: M, right: M },
        tableWidth: CONTENT_W,
      });
      y = lastTableY(doc) + 8;
    }

    // Apoyo externo
    if (m?.apoyoExterno && m.apoyoExterno.length > 0) {
      y = ensureSpace(doc, y, 230);
      y = sectionHeading(doc, y, 'Apoyo externo');
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Nombre / institución', 'Cargo', 'Patente', 'Conductor']],
        body: m.apoyoExterno.map((a) => [
          a.tipo || '—',
          a.nombre || '—',
          a.cargo || '—',
          a.patente || '—',
          a.conductor || '—',
        ]),
        headStyles: { fillColor: [63, 63, 70], textColor: [255, 255, 255], fontSize: 7 },
        bodyStyles: { fontSize: 7.5 },
        styles: { cellPadding: 1.8 },
        margin: { left: M, right: M },
        tableWidth: CONTENT_W,
      });
      y = lastTableY(doc) + 8;
    }

    // Asistencia / personal (texto resumido)
    const txtAsist = resumenAsistencia(m);
    if (txtAsist) {
      y = ensureSpace(doc, y, 250);
      y = sectionHeading(doc, y, 'Personal y asistencia');
      doc.setFontSize(9);
      doc.setTextColor(24, 24, 27);
      y = addWrapped(doc, txtAsist, M, y, CONTENT_W, 4) + 6;
    }

    y = ensureSpace(doc, y, 200);

    // ——— Firma ———
    y = sectionHeading(doc, y, 'Firma del oficial a cargo (OBAC)');
    const firmaObac =
      m?.asistencia?.firmaObac?.trim() ||
      parte.obac.firmaImagen?.trim() ||
      '';
    if (firmaObac.startsWith('data:image')) {
      y += 2;
      try {
        const w = 64;
        const h = 22;
        if (y + h > 275) {
          doc.addPage();
          y = M + 4;
        }
        doc.addImage(firmaObac, fmtFirmaJsPdf(firmaObac), M, y, w, h);
        y += h + 4;
      } catch {
        doc.setFontSize(9);
        doc.setTextColor(...C_TEXT_MUTED);
        doc.text('No se pudo incrustar la imagen de la firma.', M, y + 4);
        y += 10;
      }
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...C_TEXT_MUTED);
      doc.text('Sin firma digital adjunta en este parte.', M, y + 4);
      y += 10;
    }
    doc.setTextColor(0, 0, 0);

    // Pie al final de la última página (si hubo saltos de página)
    const totalPages = doc.getNumberOfPages();
    doc.setPage(totalPages);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text(
      `Documento generado por SIDEP · ${fmtFechaHora(new Date().toISOString())}${
        totalPages > 1 ? ` · Pág. ${totalPages}` : ''
      }`,
      PAGE_W / 2,
      pageH - 6,
      { align: 'center' },
    );

    doc.save(`parte-${parte.correlativo}.pdf`);
  }

  exportarExcelListado(partes: ParteEmergenciaDto[]): void {
    const rows = partes.map((p) => ({
      ID: p.correlativo,
      Fecha: new Date(p.fecha).toLocaleDateString('es-CL'),
      Hora: new Date(p.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      Clave: p.claveEmergencia,
      Direccion: p.direccion,
      OBAC: p.obac.nombre,
      Estado: p.estado,
      Unidades: p.unidades.map((u) => u.carro.nomenclatura).join(', '),
      Pacientes: p.pacientes.length,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partes');
    XLSX.writeFile(wb, `partes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
}
