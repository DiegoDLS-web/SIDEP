import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LogosPdfCabecera } from '../models/configuracion.dto';
import { ConfiguracionesService } from './configuraciones.service';
import { logosActivosPorConfig } from '../utils/reportes-logos.util';
import { COMPANIA_LOGO_TRY_PATHS, SIDEP_MARK_PNG_ABSOLUTE } from '../shared/sidep-branding';
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

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly configApi = inject(ConfiguracionesService);

  private resolverUrlLogo(path: string): string {
    const p = path.startsWith('/') ? path.slice(1) : path;
    if (typeof document !== 'undefined' && document?.baseURI) {
      try {
        return new URL(p, document.baseURI).toString();
      } catch {
        /* ignore */
      }
    }
    return path.startsWith('/') ? path : `/${path}`;
  }

  private cargarLogoComoDataUrl(path: string): Promise<string | null> {
    return fetch(this.resolverUrlLogo(path))
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

  private async cargarPrimeraCompaniaDisponible(): Promise<string | null> {
    for (const p of COMPANIA_LOGO_TRY_PATHS) {
      const data = await this.cargarLogoComoDataUrl(p);
      if (data?.startsWith('data:image')) {
        return data;
      }
    }
    return null;
  }

  private getLogos(): Promise<{ sidep: string | null; compania: string | null }> {
    return Promise.all([
      this.cargarLogoComoDataUrl(SIDEP_MARK_PNG_ABSOLUTE),
      this.cargarPrimeraCompaniaDisponible(),
    ]).then(([sidep, compania]) => ({ sidep, compania }));
  }

  private async modoLogosPdf(): Promise<LogosPdfCabecera> {
    try {
      const c = await firstValueFrom(this.configApi.obtener().pipe(catchError(() => of(null))));
      const m = c?.reportes?.logosPdf;
      if (m === 'NINGUNO' || m === 'SIDEP' || m === 'COMPANIA' || m === 'AMBOS') {
        return m;
      }
    } catch {
      /* ignore */
    }
    return 'AMBOS';
  }

  /**
   * Cabecera roja con logos SIDEP (izquierda) y compañía (derecha).
   * Los textos se dibujan después de los logos para no quedar tapados.
   * @returns posición Y recomendada para el cuerpo del documento (debajo de la cabecera).
   */
  private async drawHeaderMarca(doc: jsPDF, title: string, subtitle: string): Promise<number> {
    const [logos, modoPdf] = await Promise.all([this.getLogos(), this.modoLogosPdf()]);
    const activos = logosActivosPorConfig(modoPdf);
    const pageW = doc.internal.pageSize.getWidth();
    const pad = 12;
    const top = 10;
    const stripeW = 2.8;
    const logoSidep = 12.5;
    /** Logo compañía (sin fondo; el PNG puede ser circular). */
    const logoCompSlot = 22;
    const logoCompInset = pad + stripeW + 2;
    const hasSidep = activos.sidep && !!logos.sidep?.startsWith('data:image');
    const hasComp = activos.compania && !!logos.compania?.startsWith('data:image');
    const reserveRight = (hasComp ? logoCompSlot : 0) + 10;

    let titleX = pad + stripeW + 5;
    if (hasSidep) {
      titleX = pad + stripeW + 4 + logoSidep + 3;
    }
    const textRight = pageW - pad - reserveRight;
    const titleMaxW = Math.max(38, textRight - titleX);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const titleLines = doc.splitTextToSize(title, titleMaxW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const subLines = doc.splitTextToSize(subtitle, titleMaxW);
    const lineHT = 5.8;
    const lineHS = 4.2;
    const headerInnerH = Math.max(20, Math.min(titleLines.length, 2) * lineHT + subLines.length * lineHS + 8);
    const headerH = Math.min(38, Math.max(26, headerInnerH));

    doc.setFillColor(153, 27, 27);
    doc.roundedRect(pad, top, pageW - 2 * pad, headerH, 4, 4, 'F');
    doc.setFillColor(239, 68, 68);
    doc.rect(pad, top, stripeW + 2, headerH, 'F');

    const logoY = top + (headerH - logoSidep) / 2;
    if (hasSidep) {
      try {
        doc.addImage(logos.sidep!, fmtFirmaParaJsPdf(logos.sidep!), pad + stripeW + 3, logoY, logoSidep, logoSidep);
      } catch {
        /* ignore */
      }
    }
    const compSquareX = pageW - logoCompInset - logoCompSlot;
    if (hasComp) {
      try {
        const cy = top + (headerH - logoCompSlot) / 2;
        doc.addImage(
          logos.compania!,
          fmtFirmaParaJsPdf(logos.compania!),
          compSquareX,
          cy,
          logoCompSlot,
          logoCompSlot,
        );
      } catch {
        /* ignore */
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const showTitle = titleLines.slice(0, 2);
    let ty = top + 12;
    doc.text(showTitle, titleX, ty);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    ty += showTitle.length * lineHT - 1;
    doc.text(subLines, titleX, ty);
    doc.setTextColor(20, 20, 20);

    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.35);
    doc.line(pad + 3, top + headerH + 0.4, pageW - pad - 3, top + headerH + 0.4);
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.1);

    return top + headerH + 7;
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
      doc.setFont('helvetica', 'italic');
      doc.text(`SIDEP · documento institucional · generado ${generado}`, 14, pageH - 7);
      doc.setFont('helvetica', 'normal');
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

    const yHead = await this.drawHeaderMarca(doc, `Registro ${input.nomenclatura}`, 'SIDEP · Mantención e inspección');
    doc.setFontSize(10);
    doc.text(`Unidad: ${input.nomenclatura}`, margin, yHead);
    doc.text(`Nombre: ${input.nombreUnidad?.trim() || '—'}`, margin, yHead + 6);
    doc.text(`Patente: ${input.patente || '—'}`, margin, yHead + 12);

    autoTable(doc, {
      startY: yHead + 18,
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

    const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yHead + 18;
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
    /** Firma digital trazada por el inspector (PNG/JPEG data URL). */
    firmaInspector?: string;
    firmaOficial: string;
    fechaRegistro?: string;
    observaciones: string;
    totalItems: number;
    itemsOk: number;
    materiales: UnidadMaterial[];
  }): Promise<void> {
    const doc = new jsPDF();
    const yHead = await this.drawHeaderMarca(doc, `Checklist Unidad ${input.unidad}`, 'SIDEP · Control operativo de materiales');
    doc.setFontSize(10);
    doc.text(`Inspector: ${input.inspector || '—'}`, 14, yHead);
    doc.text(`Grupo de guardia: ${input.grupoGuardia || '—'}`, 14, yHead + 6);
    doc.text(`Responsable (OBAC): ${input.responsable || '—'}`, 108, yHead);
    const fechaTxt = input.fechaRegistro
      ? fmtFechaHoraPdf(input.fechaRegistro)
      : fmtFechaHoraPdf(new Date().toISOString());
    doc.text(`Fecha de registro: ${fechaTxt}`, 108, yHead + 6);

    autoTable(doc, {
      startY: yHead + 14,
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

    let headerY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yHead + 14;
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

    let firmaTop = obsY + obsLines.length * 5 + 8;
    const firmaInspector = input.firmaInspector?.trim();
    const firma = input.firmaOficial?.trim();
    const pw = doc.internal.pageSize.getWidth();
    const mrg = 14;
    const g = 9;
    const boxW = (pw - 2 * mrg - g) / 2;
    const boxH = 26;
    if (firmaTop > 238) {
      doc.addPage();
      firmaTop = 22;
    }
    doc.setFontSize(10);
    doc.text('Inspector', mrg, firmaTop);
    doc.text(`OBAC (${input.responsable || '—'})`, mrg + boxW + g, firmaTop);
    const bx = firmaTop + 4;
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(mrg, bx, boxW, boxH, 1.2, 1.2);
    doc.roundedRect(mrg + boxW + g, bx, boxW, boxH, 1.2, 1.2);
    const iW = boxW - 4;
    const iH = boxH - 4;
    doc.setDrawColor(20, 20, 20);
    if (firmaInspector?.startsWith('data:image')) {
      try {
        doc.addImage(firmaInspector, fmtFirmaParaJsPdf(firmaInspector), mrg + 2, bx + 2, iW, iH);
      } catch {
        doc.setFontSize(8);
        doc.setTextColor(82, 82, 91);
        doc.text('(Firma inspector no incrustada.)', mrg + 3, bx + boxH / 2);
        doc.setTextColor(20, 20, 20);
      }
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text('Sin firma inspector.', mrg + 3, bx + boxH / 2);
      doc.setTextColor(20, 20, 20);
    }
    if (firma?.startsWith('data:image')) {
      try {
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), mrg + boxW + g + 2, bx + 2, iW, iH);
      } catch {
        doc.setFontSize(8);
        doc.setTextColor(82, 82, 91);
        doc.text('(Firma OBAC no incrustada.)', mrg + boxW + g + 3, bx + boxH / 2);
        doc.setTextColor(20, 20, 20);
      }
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text('Sin firma OBAC.', mrg + boxW + g + 3, bx + boxH / 2);
      doc.setTextColor(20, 20, 20);
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
    const yHead = await this.drawHeaderMarca(doc, `Historial Checklist ${input.unidad}`, 'SIDEP · Registro individual');
    const r = input.registro;
    doc.setFontSize(10);
    doc.text(`Unidad: ${input.unidad}`, 14, yHead);
    doc.text(`Nombre: ${input.nombreUnidad || r.carro?.nombre || '—'}`, 14, yHead + 6);
    doc.text(`Fecha: ${fmtFechaHoraPdf(r.fecha)}`, 14, yHead + 12);

    autoTable(doc, {
      startY: yHead + 18,
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

    const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yHead + 18;
    doc.setFontSize(10);
    doc.text('Observaciones:', 14, y + 10);
    doc.text((r.observaciones?.trim() || 'Sin observaciones.').slice(0, 500), 14, y + 16);

    const firma = r.firmaOficial?.trim();
    const firmaInsp = r.firmaInspector?.trim();
    const fy = y + 28;
    const pw = doc.internal.pageSize.getWidth();
    const mr = 14;
    const gap = 8;
    const bw = (pw - 2 * mr - gap) / 2;
    const bh = 24;
    doc.setFontSize(9);
    doc.text('Inspector', mr, fy);
    doc.text(`OBAC (${r.cuartelero?.nombre || '—'})`, mr + bw + gap, fy);
    const yb = fy + 4;
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(mr, yb, bw, bh, 1.2, 1.2);
    doc.roundedRect(mr + bw + gap, yb, bw, bh, 1.2, 1.2);
    const iw = bw - 4;
    const ih = bh - 4;
    doc.setDrawColor(20, 20, 20);
    if (firmaInsp?.startsWith('data:image')) {
      try {
        doc.addImage(firmaInsp, fmtFirmaParaJsPdf(firmaInsp), mr + 2, yb + 2, iw, ih);
      } catch {
        /* ignore */
      }
    }
    if (firma?.startsWith('data:image')) {
      try {
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), mr + bw + gap + 2, yb + 2, iw, ih);
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
    const yHead = await this.drawHeaderMarca(doc, `Historial Checklist ${input.unidad}`, input.nombreUnidad || 'Unidad sin nombre');
    doc.setFontSize(10);
    doc.text(`Generado: ${fmtFechaHoraPdf(new Date().toISOString())}`, 14, yHead);
    doc.text(`Registros: ${input.registros.length}`, 150, yHead);

    autoTable(doc, {
      startY: yHead + 8,
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

    let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yHead + 8;
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
    firmaInspector?: string;
    firmaOficial: string;
    observaciones: string;
    equipos: EraEquipo[];
    recambios: EraRecambio[];
  }): Promise<void> {
    const doc = new jsPDF();
    const yHead = await this.drawHeaderMarca(doc, `Check List ERA ${input.unidad}`, 'SIDEP · Equipos ERA');
    const unidadDesc = input.nombreCarro && input.nombreCarro !== '—' ? `${input.unidad} · ${input.nombreCarro}` : input.unidad;
    const firmaInspEra = input.firmaInspector?.trim();
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
      startY: yHead,
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

    const yMeta = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yHead;
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
    const pageW = doc.internal.pageSize.getWidth();
    const mrg = 14;
    const gapE = 9;
    const boxW = (pageW - 2 * mrg - gapE) / 2;
    const boxHE = 26;
    if (yFirma + boxHE + 24 > 278) {
      doc.addPage();
      yFirma = 20;
    }
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Inspector', mrg, yFirma);
    doc.text(`OBAC (${input.responsable || '—'})`, mrg + boxW + gapE, yFirma);
    doc.setFont('helvetica', 'normal');
    const yBox = yFirma + 4;
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(mrg, yBox, boxW, boxHE, 1.2, 1.2);
    doc.roundedRect(mrg + boxW + gapE, yBox, boxW, boxHE, 1.2, 1.2);
    const imW = boxW - 4;
    const imH = boxHE - 4;
    doc.setDrawColor(20, 20, 20);
    if (firmaInspEra?.startsWith('data:image')) {
      try {
        doc.addImage(firmaInspEra, fmtFirmaParaJsPdf(firmaInspEra), mrg + 2, yBox + 2, imW, imH);
      } catch {
        doc.setFontSize(8.5);
        doc.setTextColor(82, 82, 91);
        doc.text('Sin firma inspector (error al incrustar).', mrg + 3, yBox + boxHE / 2);
        doc.setTextColor(20, 20, 20);
      }
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text('Sin firma del inspector.', mrg + 3, yBox + boxHE / 2);
      doc.setTextColor(20, 20, 20);
    }
    if (firma?.startsWith('data:image')) {
      try {
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), mrg + boxW + gapE + 2, yBox + 2, imW, imH);
      } catch {
        doc.setFontSize(8.5);
        doc.setTextColor(82, 82, 91);
        doc.text('Sin firma OBAC (error al incrustar).', mrg + boxW + gapE + 3, yBox + boxHE / 2);
        doc.setTextColor(20, 20, 20);
      }
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text('Sin firma OBAC.', mrg + boxW + gapE + 3, yBox + boxHE / 2);
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
    const yHead = await this.drawHeaderMarca(doc, 'Historial Bolsos de Trauma', 'SIDEP · Exportación de registros');
    doc.setFontSize(10);
    doc.text(`Generado: ${fmtFechaHoraPdf(new Date().toISOString())}`, 14, yHead);
    doc.text(`Registros: ${input.registros.length}`, 200, yHead);

    autoTable(doc, {
      startY: yHead + 8,
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
    const yHead = await this.drawHeaderMarca(doc, `Licencia #${input.id}`, 'SIDEP · Documento de licencia');
    doc.setFontSize(10);
    doc.text(`Solicitante: ${input.solicitante || '—'}`, 14, yHead);
    doc.text(`RUT: ${input.rut || '—'}`, 14, yHead + 6);
    doc.text(`Rol/Cargo: ${input.rol || '—'}`, 14, yHead + 12);

    autoTable(doc, {
      startY: yHead + 20,
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

    const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yHead + 20;
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
