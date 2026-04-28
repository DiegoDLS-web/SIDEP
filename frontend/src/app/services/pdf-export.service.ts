import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CarroRegistroHistorialDto } from '../models/carro-registro-historial.dto';
import type { ChecklistRegistroDto } from '../models/checklist.dto';

type UnidadMaterial = {
  ubicacion: string;
  material: string;
  requerida: number;
  actual: number;
  estado: string;
};

type EraEquipo = {
  numero: number;
  marca: string;
  tipo: string;
  ubicacion: string;
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

function keyUbicacionNombre(v: string): string {
  return (v || '').trim().toLowerCase();
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
    doc.save(`SIDEP-${safeNom}-historial-${r.id}.pdf`);
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
      head: [['Total ítems', 'Ítems OK', 'Faltantes']],
      body: [[String(input.totalItems), String(input.itemsOk), String(Math.max(input.totalItems - input.itemsOk, 0))]],
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

    doc.save(`checklist-${input.unidad}.pdf`);
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
    doc.save(`SIDEP-${safeNom}-historial-registro-${r.id}.pdf`);
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
        const t = Number(registro.totalItems) || 0;
        const ok = Number(registro.itemsOk) || 0;
        const estado = t > 0 && ok >= t ? 'Completo' : 'Observado';
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
    doc.save(`SIDEP-${safeNom}-historial-checklists.pdf`);
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
    doc.setFontSize(10);
    doc.text(`Unidad: ${input.nombreCarro && input.nombreCarro !== '—' ? input.nombreCarro : input.unidad}`, 14, 42);
    doc.text(`Fecha inspección: ${input.fechaInspeccion || '—'}`, 14, 48);
    doc.text(`Inspector: ${input.inspector || '—'}`, 14, 54);
    doc.text(`Grupo de guardia: ${input.grupoGuardia || '—'}`, 14, 60);
    doc.text(`OBAC / responsable: ${input.responsable || '—'}`, 14, 66);

    let headerY = 72;
    const firma = input.firmaOficial?.trim();
    if (firma?.startsWith('data:image')) {
      doc.text('Firma oficial a cargo (OBAC):', 14, headerY);
      headerY += 5;
      try {
        const imgW = 70;
        const imgH = 22;
        doc.addImage(firma, fmtFirmaParaJsPdf(firma), 14, headerY, imgW, imgH);
        headerY += imgH + 6;
      } catch {
        doc.setFontSize(9);
        doc.text('(No se pudo incrustar la imagen de la firma.)', 14, headerY);
        headerY += 8;
      }
    } else if (firma) {
      doc.text(`Firma / texto: ${firma}`, 14, headerY);
      headerY += 6;
    } else {
      doc.text('Firma oficial a cargo (OBAC): —', 14, headerY);
      headerY += 6;
    }

    autoTable(doc, {
      startY: headerY + 2,
      head: [
        [
          '#',
          'Marca',
          'Tipo',
          'Ubic.',
          'Máscara',
          'Cilindro',
          'Arnés',
          'Estado',
        ],
      ],
      body: input.equipos.map((e) => [
        String(e.numero),
        e.marca,
        e.tipo,
        e.ubicacion,
        [e.mascaraLimpia, e.mascaraCondicion].filter(Boolean).join(' · ') || '—',
        [e.presion, e.cilindroCondicion, e.codigoCilindro].filter(Boolean).join(' · ') || '—',
        [e.arnesLimpio, e.arnesCondicion].filter(Boolean).join(' · ') || '—',
        e.estado || e.arnesCondicion || '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 30, 30] },
    });

    const y1 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 50;
    autoTable(doc, {
      startY: y1 + 8,
      head: [['#', 'Tipo', 'Presión aire', '>2000', 'Cond. gral.', 'Código', 'Estado']],
      body: input.recambios.map((r) => [
        String(r.numero),
        r.tipo,
        r.presionAire || '—',
        r.presionMayor2000 ?? '—',
        r.condicionGeneral ?? '—',
        r.codigoCilindro?.trim() || '—',
        r.estado,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 80, 160] },
    });

    const y2 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y1 + 8;
    doc.text('Observaciones:', 14, y2 + 10);
    doc.text(input.observaciones || 'Sin observaciones.', 14, y2 + 16);

    doc.save(`checklist-era-${input.unidad}.pdf`);
  }

  /** Tabla de historial de bolsos de trauma (mismo criterio visual que la pantalla). */
  async exportarHistorialBolsoTrauma(input: {
    registros: Array<{
      fecha: string;
      unidad: string;
      bolsoNumero?: number | null;
      borrador?: boolean;
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
        return [
          fmtFechaHoraPdf(r.fecha),
          r.unidad,
          r.bolsoNumero != null ? String(r.bolsoNumero) : '—',
          r.borrador === true ? 'Borrador' : 'Cerrado',
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

    doc.save('SIDEP-historial-bolsos-trauma.pdf');
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

    doc.save(`Licencia${input.id}.pdf`);
  }
}
