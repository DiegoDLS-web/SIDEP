import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CarroRegistroHistorialDto } from '../models/carro-registro-historial.dto';
import type { ChecklistRegistroDto } from '../models/checklist.dto';
import { calcularEstadoChecklist, etiquetaEstadoChecklist } from '../utils/checklist-estado';

type UnidadMaterial = {
  ubicacion: string;
  material: string;
  requerida: number;
  actual: number;
  estado: string;
};

type EstadoChecklistPdf = 'COMPLETADO' | 'PENDIENTE' | 'CON_OBSERVACION';

type EraEquipo = {
  numero: number;
  marca: string;
  tipo: string;
  ubicacion: string;
  codigoMascara?: string;
  codigoArnes?: string;
  presion: string;
  estado: string;
  mascaraLimpia?: string;
  mascaraBolsaGenero?: string;
  mascaraCondicion?: string;
  presionMayor2000?: string;
  cilindroCondicion?: string;
  codigoCilindro?: string;
  arnesLimpio?: string;
  arnesCorreasSueltas?: string;
  arnesFuga?: string;
  arnesModuloDigital?: string;
  arnesModuloAnalogo?: string;
  arnesAlarma?: string;
  arnesCondicion?: string;
};

type EraRecambio = {
  numero: number;
  tipo: string;
  presionAire: string;
  estado: string;
  presionMayor2000?: string;
  condicionGeneral?: string;
  codigoCilindro?: string;
};

function fmtFechaPdf(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL');
}

function fmtFechaHoraPdf(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL');
}

function fmtFirmaParaJsPdf(firma: string): 'PNG' | 'JPEG' {
  const lower = firma.slice(0, 60).toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) {
    return 'JPEG';
  }
  return 'PNG';
}

function stampFechaArchivo(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function keyUbicacionNombre(v: string): string {
  return (v || '').trim().toLowerCase();
}

function estadoChecklistDesdeRegistro(r: {
  totalItems?: number | null;
  itemsOk?: number | null;
  observaciones?: string | null;
  estadoChecklist?: EstadoChecklistPdf;
}): EstadoChecklistPdf {
  return (r.estadoChecklist as EstadoChecklistPdf | undefined) ??
    calcularEstadoChecklist(r.totalItems ?? null, r.itemsOk ?? null, r.observaciones ?? null);
}

function drawHeaderCard(doc: jsPDF, title: string, subtitle: string): void {
  doc.setFillColor(185, 28, 28);
  doc.roundedRect(12, 10, 186, 24, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(title, 18, 21);
  doc.setFontSize(10);
  doc.text(subtitle, 18, 29);
  doc.setTextColor(20, 20, 20);
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
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

  private async drawHeaderMarca(doc: jsPDF, title: string, subtitle: string): Promise<void> {
    drawHeaderCard(doc, title, subtitle);
    const logos = await this.getLogos();
    if (logos.sidep?.startsWith('data:image')) {
      try {
        doc.addImage(logos.sidep, fmtFirmaParaJsPdf(logos.sidep), 14, 12, 11, 11);
      } catch {
        // ignore logo rendering errors
      }
    }
    if (logos.compania?.startsWith('data:image')) {
      try {
        doc.addImage(logos.compania, fmtFirmaParaJsPdf(logos.compania), 176, 11, 18, 14);
      } catch {
        // ignore logo rendering errors
      }
    }
  }

  private finalizarDocumentoPdf(doc: jsPDF): void {
    const totalPages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const generado = fmtFechaHoraPdf(new Date().toISOString());
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(228, 228, 231);
      doc.line(14, pageH - 11.5, pageW - 14, pageH - 11.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(82, 82, 91);
      doc.text(`SIDEP · Documento oficial · ${generado}`, 14, pageH - 7);
      doc.text(`Página ${page} de ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
      doc.setTextColor(20, 20, 20);
    }
  }

  /**
   * PDF de un snapshot del historial de mantención / inspección de un carro.
   */
  async exportarRegistroHistorialCarro(input: {
    nomenclatura: string;
    patente: string | null;
    nombreUnidad: string | null;
    registro: CarroRegistroHistorialDto;
  }): Promise<void> {
    const doc = new jsPDF();
    const r = input.registro;
    const margin = 14;
    const pageW = doc.internal.pageSize.getWidth();
    const textW = pageW - 2 * margin;
    const esSnapshotActual = r.id === 0;

    await this.drawHeaderMarca(doc, `Registro ${input.nomenclatura}`, 'SIDEP · Mantención e inspección');
    doc.setFontSize(10);
    doc.text(`Unidad: ${input.nomenclatura}`, margin, 42);
    doc.text(`Nombre: ${input.nombreUnidad?.trim() || '—'}`, margin, 48);
    doc.text(`Patente: ${input.patente || '—'}`, margin, 54);

    autoTable(doc, {
      startY: 60,
      head: [['Campo', 'Valor']],
      body: [
        ['Documento', esSnapshotActual ? 'PDF actual' : 'Registro de historial'],
        ['Registro guardado el', esSnapshotActual ? fmtFechaHoraPdf(new Date().toISOString()) : fmtFechaHoraPdf(r.creadoEn)],
        ['Último mantenimiento', fmtFechaPdf(r.ultimoMantenimiento)],
        ['Próximo mantenimiento', fmtFechaPdf(r.proximoMantenimiento)],
        ['Próxima revisión técnica', fmtFechaPdf(r.proximaRevisionTecnica)],
        ['Última revisión bomba de agua', fmtFechaPdf(r.ultimaRevisionBombaAgua)],
        ['Último conductor', r.ultimoConductor?.trim() || '—'],
        ['Inspector', r.ultimoInspector?.trim() || '—'],
        ['Fecha inspección', fmtFechaPdf(r.fechaUltimaInspeccion)],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [180, 30, 30] },
      columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: textW - 62 } },
    });

    const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
    let y = lastY + 10;

    doc.setFontSize(10);
    doc.text('Descripción Última Mantención:', margin, y);
    y += 6;
    const desc = (r.descripcionUltimoMantenimiento ?? '—').trim() || '—';
    const descLines = doc.splitTextToSize(desc, textW);
    for (const line of descLines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    }

    y += 4;
    if (y > 236) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.text('Firma del inspector:', margin, y);
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 91);
    doc.text(`Fecha inspección: ${fmtFechaPdf(r.fechaUltimaInspeccion)}`, margin + 64, y);
    doc.setTextColor(20, 20, 20);
    y += 4;

    const firma = r.firmaUltimoInspector?.trim();
    if (firma?.startsWith('data:image')) {
      try {
        const imgW = 70;
        const imgH = 22;
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), margin, y, imgW, imgH);
        y += imgH + 2;
      } catch {
        doc.setFontSize(9);
        doc.setTextColor(82, 82, 91);
        doc.text('(No se pudo incrustar la imagen de la firma.)', margin, y + 6);
        doc.setTextColor(20, 20, 20);
        y += 10;
      }
    } else {
      doc.setFontSize(9);
      doc.setTextColor(82, 82, 91);
      doc.text('Sin firma registrada.', margin, y + 6);
      doc.setTextColor(20, 20, 20);
      y += 10;
    }

    const safeNom = input.nomenclatura.replace(/[^\w-]+/g, '_');
    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-carro-${safeNom}-historial-${r.id}-${stampFechaArchivo()}.pdf`);
  }

  async exportarChecklistUnidad(input: {
    unidad: string;
    inspector: string;
    grupoGuardia: string;
    responsable: string;
    firmaOficial: string;
    fechaRegistro?: string;
    observaciones: string;
    totalItems: number;
    itemsOk: number;
    materiales: UnidadMaterial[];
  }): Promise<void> {
    const doc = new jsPDF();
    await this.drawHeaderMarca(doc, `Checklist Unidad ${input.unidad}`, 'SIDEP · Control operativo de materiales');
    doc.setFontSize(10);
    doc.text(`Inspector: ${input.inspector || '—'}`, 14, 42);
    doc.text(`Grupo de guardia: ${input.grupoGuardia || '—'}`, 14, 48);
    doc.text(`Responsable (OBAC): ${input.responsable || '—'}`, 108, 42);
    const fechaTxt = input.fechaRegistro
      ? fmtFechaHoraPdf(input.fechaRegistro)
      : fmtFechaHoraPdf(new Date().toISOString());
    doc.text(`Fecha de registro: ${fechaTxt}`, 108, 48);

    autoTable(doc, {
      startY: 56,
      theme: 'grid',
      head: [['Total ítems', 'Ítems OK', 'Faltantes', 'Estado checklist']],
      body: [[
        String(input.totalItems),
        String(input.itemsOk),
        String(Math.max(input.totalItems - input.itemsOk, 0)),
        etiquetaEstadoChecklist(calcularEstadoChecklist(input.totalItems, input.itemsOk, input.observaciones)),
      ]],
      styles: { halign: 'center', fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255] },
      bodyStyles: { textColor: [20, 20, 20] },
    });

    let headerY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 56;
    headerY += 8;

    const grupos = new Map<string, { nombre: string; items: UnidadMaterial[] }>();
    for (const m of input.materiales) {
      const key = keyUbicacionNombre(m.ubicacion);
      if (!grupos.has(key)) {
        grupos.set(key, { nombre: m.ubicacion || 'Sin ubicación', items: [] });
      }
      grupos.get(key)!.items.push(m);
    }

    let y = headerY;
    for (const [, grupo] of grupos) {
      // Salto de página preventivo si no queda espacio para título + cabecera.
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(10);
      doc.setTextColor(82, 82, 91);
      doc.text(`Ubicación: ${grupo.nombre}`, 14, y);
      doc.setTextColor(20, 20, 20);
      y += 3;

      autoTable(doc, {
        startY: y + 2,
        head: [['Material', 'Cant. Req.', 'Cant. Actual', 'Estado']],
        body: grupo.items.map((m) => [m.material, String(m.requerida), String(m.actual), m.estado]),
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [200, 30, 30] },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 24, halign: 'center' },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
        },
      });
      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 2) + 7;
    }

    doc.setFontSize(10);
    doc.text('Observaciones:', 14, y + 10);
    const obsY = y + 16;
    const obsLines = doc.splitTextToSize(input.observaciones || 'Sin observaciones.', 180);
    doc.text(obsLines, 14, obsY);

    let firmaY = obsY + obsLines.length * 5 + 8;
    const firma = input.firmaOficial?.trim();
    if (firmaY > 250) {
      doc.addPage();
      firmaY = 20;
    }
    doc.setFontSize(10);
    doc.text('Firma oficial a cargo (OBAC):', 14, firmaY);
    firmaY += 5;
    if (firma?.startsWith('data:image')) {
      try {
        const imgW = 70;
        const imgH = 22;
        if (firmaY + imgH > 280) {
          doc.addPage();
          firmaY = 20;
          doc.setFontSize(10);
          doc.text('Firma oficial a cargo (OBAC):', 14, firmaY);
          firmaY += 5;
        }
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), 14, firmaY, imgW, imgH);
      } catch {
        doc.setFontSize(9);
        doc.text('(No se pudo incrustar la imagen de la firma.)', 14, firmaY + 4);
      }
    } else {
      doc.setFontSize(9);
      doc.text('Sin firma digital adjunta.', 14, firmaY + 4);
    }

    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-checklist-unidad-${input.unidad}-${stampFechaArchivo()}.pdf`);
  }

  async exportarRegistroChecklistHistorial(input: {
    unidad: string;
    nombreUnidad?: string;
    registro: ChecklistRegistroDto;
  }): Promise<void> {
    const doc = new jsPDF();
    await this.drawHeaderMarca(doc, `Historial Checklist ${input.unidad}`, 'SIDEP · Registro individual');
    const r = input.registro;
    doc.setFontSize(10);
    doc.text(`Unidad: ${input.unidad}`, 14, 42);
    doc.text(`Nombre: ${input.nombreUnidad || r.carro?.nombre || '—'}`, 14, 48);
    doc.text(`Fecha: ${fmtFechaHoraPdf(r.fecha)}`, 14, 54);

    autoTable(doc, {
      startY: 60,
      head: [['Campo', 'Valor']],
      body: [
        ['Tipo', r.tipo || '—'],
        ['Estado checklist', etiquetaEstadoChecklist(estadoChecklistDesdeRegistro(r))],
        ['Inspector', r.inspector?.trim() || '—'],
        ['Guardia', r.grupoGuardia?.trim() || '—'],
        ['Responsable (OBAC)', r.cuartelero?.nombre || '—'],
        ['Ítems OK', `${r.itemsOk ?? 0}/${r.totalItems ?? 0}`],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [180, 30, 30] },
      columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 130 } },
    });

    const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
    doc.setFontSize(10);
    doc.text('Observaciones:', 14, y + 10);
    doc.text((r.observaciones?.trim() || 'Sin observaciones.').slice(0, 500), 14, y + 16);

    const firma = r.firmaOficial?.trim();
    if (firma?.startsWith('data:image')) {
      try {
        doc.text('Firma OBAC:', 14, y + 30);
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), 14, y + 34, 70, 22);
      } catch {
        // ignore image errors
      }
    }
    const safeNom = input.unidad.replace(/[^\w-]+/g, '_');
    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-checklist-${safeNom}-registro-${r.id}-${stampFechaArchivo()}.pdf`);
  }

  async exportarHistorialChecklistUnidad(input: {
    unidad: string;
    nombreUnidad: string;
    registros: Array<ChecklistRegistroDto & { unidad?: string; nombreUnidad?: string }>;
  }): Promise<void> {
    const doc = new jsPDF();
    await this.drawHeaderMarca(doc, `Historial Checklist ${input.unidad}`, input.nombreUnidad || 'Unidad sin nombre');
    doc.setFontSize(10);
    doc.text(`Generado: ${fmtFechaHoraPdf(new Date().toISOString())}`, 14, 42);
    doc.text(`Registros: ${input.registros.length}`, 150, 42);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Unidad', 'Bolso', 'Estado', 'Inspector', 'Responsable (OBAC)', 'Guardia']],
      body: input.registros.map((registro) => {
        const estado = etiquetaEstadoChecklist(estadoChecklistDesdeRegistro(registro));
        return [
          fmtFechaHoraPdf(registro.fecha),
          registro.unidad ?? '—',
          '—',
          estado,
          registro.inspector?.trim() || '—',
          registro.cuartelero?.nombre ?? '—',
          registro.grupoGuardia?.trim() || '—',
        ];
      }),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 30, 30] },
      alternateRowStyles: { fillColor: [247, 247, 247] },
    });

    let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 50;
    for (const registro of input.registros.slice(0, 12)) {
      const siguiente = y + 10;
      if (siguiente > 265) {
        doc.addPage();
        y = 18;
      } else {
        y = siguiente;
      }
      doc.setFontSize(11);
      doc.text(
        `${fmtFechaPdf(registro.fecha)} · ${registro.cuartelero.nombre} · ${registro.itemsOk ?? 0}/${registro.totalItems ?? 0}`,
        14,
        y,
      );
      y += 5;
      doc.setFontSize(9);
      const obs = (registro.observaciones?.trim() || 'Sin observaciones.').slice(0, 180);
      doc.text(`Obs: ${obs}`, 14, y);
    }

    const safeNom = input.unidad.replace(/[^\w-]+/g, '_');
    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-checklist-${safeNom}-historial-${stampFechaArchivo()}.pdf`);
  }

  async exportarChecklistEra(input: {
    unidad: string;
    nombreCarro?: string;
    fechaInspeccion?: string;
    inspector: string;
    grupoGuardia: string;
    responsable: string;
    firmaOficial: string;
    observaciones: string;
    equipos: EraEquipo[];
    recambios: EraRecambio[];
  }): Promise<void> {
    const doc = new jsPDF();
    await this.drawHeaderMarca(doc, `Check List ERA ${input.unidad}`, 'SIDEP · Equipos ERA');
    const unidadDesc = input.nombreCarro && input.nombreCarro !== '—' ? `${input.unidad} · ${input.nombreCarro}` : input.unidad;
    const firma = input.firmaOficial?.trim();
    const totalEquipos = input.equipos.length;
    const totalRecambios = input.recambios.length;
    const operativosEquipos = input.equipos.filter((e) => (e.arnesCondicion || '').toUpperCase() === 'OPERATIVO').length;
    const operativosRecambios = input.recambios.filter((r) => (r.condicionGeneral || '').toUpperCase() === 'OPERATIVO').length;
    const totalChequeos = totalEquipos + totalRecambios;
    const totalOk = operativosEquipos + operativosRecambios;
    const cumplimiento = totalChequeos > 0 ? Math.round((totalOk / totalChequeos) * 100) : 0;
    const estadoChecklistEra = calcularEstadoChecklist(totalChequeos, totalOk, input.observaciones);

    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Valor']],
      body: [
        ['Unidad', unidadDesc || '—'],
        ['Fecha inspección', input.fechaInspeccion || '—'],
        ['Inspector', input.inspector || '—'],
        ['Grupo de guardia', input.grupoGuardia || '—'],
        ['OBAC / responsable', input.responsable || '—'],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.3, lineColor: [228, 228, 231], lineWidth: 0.1 },
      headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold', textColor: [63, 63, 70] }, 1: { cellWidth: 134 } },
      margin: { left: 14, right: 14 },
    });

    const yMeta = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
    autoTable(doc, {
      startY: yMeta + 4,
      head: [['Equipos ERA', 'Recambios', 'Operativos', 'Cumplimiento', 'Estado checklist']],
      body: [[
        String(totalEquipos),
        String(totalRecambios),
        `${totalOk}/${totalChequeos}`,
        `${cumplimiento}%`,
        etiquetaEstadoChecklist(estadoChecklistEra),
      ]],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3.2, halign: 'center' },
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [24, 24, 27], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    });

    let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yMeta + 12;
    y += 6;

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, y, 182, 7, 1.3, 1.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Equipos ERA', 17, y + 4.7);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');

    autoTable(doc, {
      startY: y + 9,
      head: [
        [
          '#',
          'Marca',
          'Tipo',
          'Ubicación',
          'Máscara',
          'Cilindro/Presión',
          'Arnés',
          'Estado',
        ],
      ],
      body: input.equipos.map((e) => [
        String(e.numero),
        e.marca || '—',
        e.tipo || '—',
        e.ubicacion || '—',
        [e.codigoMascara, e.mascaraLimpia, e.mascaraCondicion].filter((x) => (x ?? '').trim()).join(' · ') || '—',
        [e.codigoCilindro, e.presion, e.cilindroCondicion].filter((x) => (x ?? '').trim()).join(' · ') || '—',
        [e.codigoArnes, e.arnesLimpio, e.arnesCondicion].filter((x) => (x ?? '').trim()).join(' · ') || '—',
        e.estado || e.arnesCondicion || '—',
      ]),
      theme: 'striped',
      styles: { fontSize: 7.8, cellPadding: 2.1, lineColor: [228, 228, 231], lineWidth: 0.1 },
      headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 16 },
        3: { cellWidth: 20 },
        4: { cellWidth: 43 },
        5: { cellWidth: 43 },
        6: { cellWidth: 20 },
        7: { cellWidth: 10, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    const y1 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 9;
    let yRec = y1 + 6;
    if (yRec > 255) {
      doc.addPage();
      yRec = 18;
    }
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, yRec, 182, 7, 1.3, 1.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Cilindros de recambio', 17, yRec + 4.7);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');

    autoTable(doc, {
      startY: yRec + 9,
      head: [['#', 'Tipo', 'Presión aire', '>2000', 'Cond. gral.', 'Código', 'Estado']],
      body: input.recambios.map((r) => [
        String(r.numero),
        r.tipo || '—',
        r.presionAire || '—',
        r.presionMayor2000 ?? '—',
        r.condicionGeneral ?? '—',
        r.codigoCilindro?.trim() || '—',
        r.estado || r.condicionGeneral || '—',
      ]),
      theme: 'striped',
      styles: { fontSize: 8.2, cellPadding: 2.3, lineColor: [228, 228, 231], lineWidth: 0.1 },
      headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      margin: { left: 14, right: 14 },
    });

    const y2 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yRec + 9;
    let yObs = y2 + 8;
    if (yObs > 246) {
      doc.addPage();
      yObs = 18;
    }
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, yObs, 182, 7, 1.3, 1.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Observaciones y firma', 17, yObs + 4.7);
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');

    const obs = (input.observaciones || 'Sin observaciones.').trim() || 'Sin observaciones.';
    const obsLines = doc.splitTextToSize(obs, 176);
    doc.setFontSize(9);
    doc.text(obsLines, 14, yObs + 13);
    let yFirma = yObs + 13 + obsLines.length * 4.2 + 4;
    if (yFirma > 258) {
      doc.addPage();
      yFirma = 20;
    }
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`OBAC: ${input.responsable || '—'}`, 14, yFirma);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(14, yFirma + 2, 80, 24, 1.2, 1.2);
    if (firma?.startsWith('data:image')) {
      try {
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), 16, yFirma + 4, 76, 20);
      } catch {
        doc.setFontSize(8.5);
        doc.setTextColor(82, 82, 91);
        doc.text('No se pudo incrustar la firma.', 18, yFirma + 15);
        doc.setTextColor(20, 20, 20);
      }
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text('Sin firma digital adjunta.', 18, yFirma + 15);
      doc.setTextColor(20, 20, 20);
    }

    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-checklist-era-${input.unidad}-${stampFechaArchivo()}.pdf`);
  }

  /** Tabla de historial de bolsos de trauma (mismo criterio visual que la pantalla). */
  async exportarHistorialBolsoTrauma(input: {
    registros: Array<{
      fecha: string;
      unidad: string;
      bolsoNumero?: number | null;
      borrador?: boolean;
        estadoChecklist?: EstadoChecklistPdf;
      inspector: string | null;
      responsable: string;
      grupoGuardia: string | null;
      totalItems: number | null;
      itemsOk: number | null;
      porcentaje: number | null;
      observaciones: string | null;
    }>;
  }): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape' });
    await this.drawHeaderMarca(doc, 'Historial Bolsos de Trauma', 'SIDEP · Exportación de registros');
    doc.setFontSize(10);
    doc.text(`Generado: ${fmtFechaHoraPdf(new Date().toISOString())}`, 14, 42);
    doc.text(`Registros: ${input.registros.length}`, 200, 42);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Unidad', 'Bolso', 'Estado', 'Inspector', 'Responsable', 'Guardia', 'Cumplimiento', 'Obs.']],
      body: input.registros.map((r) => {
        const t = Number(r.totalItems) || 0;
        const ok = Number(r.itemsOk) || 0;
        const pct =
          r.porcentaje != null
            ? `${r.porcentaje}%`
            : t > 0
              ? `${Math.round((ok / t) * 100)}%`
              : '—';
        const cumpl = t > 0 ? `${ok}/${t} (${pct})` : '—';
        const obs = (r.observaciones?.trim() || '—').slice(0, 48);
        const estado = etiquetaEstadoChecklist(estadoChecklistDesdeRegistro(r));
        return [
          fmtFechaHoraPdf(r.fecha),
          r.unidad,
          r.bolsoNumero != null ? String(r.bolsoNumero) : '—',
          estado,
          r.inspector?.trim() || '—',
          r.responsable?.trim() || '—',
          r.grupoGuardia?.trim() || '—',
          cumpl,
          obs,
        ];
      }),
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [200, 30, 30] },
      alternateRowStyles: { fillColor: [247, 247, 247] },
    });

    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-bolsos-trauma-historial-${stampFechaArchivo()}.pdf`);
  }

  async exportarLicencia(input: {
    id: number;
    solicitante: string;
    rut?: string | null;
    rol?: string | null;
    fechaInicio: string;
    fechaTermino: string;
    motivo: string;
    estado: string;
    observacionResolucion?: string | null;
    resueltoPor?: string | null;
    resueltoEn?: string | null;
  }): Promise<void> {
    const doc = new jsPDF();
    await this.drawHeaderMarca(doc, `Licencia #${input.id}`, 'SIDEP · Documento de licencia');
    doc.setFontSize(10);
    doc.text(`Solicitante: ${input.solicitante || '—'}`, 14, 42);
    doc.text(`RUT: ${input.rut || '—'}`, 14, 48);
    doc.text(`Rol/Cargo: ${input.rol || '—'}`, 14, 54);

    autoTable(doc, {
      startY: 62,
      head: [['Campo', 'Valor']],
      body: [
        ['Fecha inicio', fmtFechaPdf(input.fechaInicio)],
        ['Fecha término', fmtFechaPdf(input.fechaTermino)],
        ['Estado', input.estado || '—'],
        ['Resuelto por', input.resueltoPor || '—'],
        ['Fecha resolución', fmtFechaHoraPdf(input.resueltoEn || null)],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [180, 30, 30] },
      columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 130 } },
    });

    const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 62;
    doc.setFontSize(10);
    doc.text('Motivo:', 14, y + 10);
    const motivoLines = doc.splitTextToSize(input.motivo || '—', 180);
    doc.text(motivoLines, 14, y + 16);

    const y2 = y + 16 + motivoLines.length * 5;
    doc.text('Observación de resolución:', 14, y2 + 8);
    const obsLines = doc.splitTextToSize(input.observacionResolucion || 'Sin observación.', 180);
    doc.text(obsLines, 14, y2 + 14);

    this.finalizarDocumentoPdf(doc);
    doc.save(`SIDEP-licencia-${input.id}-${stampFechaArchivo()}.pdf`);
  }
}
