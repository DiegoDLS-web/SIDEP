import { Injectable, inject } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ParteEmergenciaDto, ParteMetadataDto } from '../models/parte.dto';
import { ASISTENCIA_CONTEXTO_OPCIONES, ASISTENCIA_ITEM_LABELS } from '../pages/partes/asistencia-roster.constants';
import type { LogosPdfCabecera } from '../models/configuracion.dto';
import { ConfiguracionesService } from './configuraciones.service';
import { CatalogoTiposEmergenciaService } from './catalogo-tipos-emergencia.service';
import { logosActivosPorConfig } from '../utils/reportes-logos.util';
import { lineaPieParteOperativoPdf, lineaSubtituloPartePdf, nombreOrganizacionPdf } from '../utils/pdf-branding-text.util';
import { COMPANIA_LOGO_TRY_PATHS, SIDEP_LOGO_FULL_TRANSPARENT_ABSOLUTE } from '../shared/sidep-branding';
import { prepararLogoParaPdf } from '../utils/pdf-logo-embed.util';

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
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

function fmtKm(km: number): string {
  if (Number.isNaN(km)) {
    return '—';
  }
  return new Intl.NumberFormat('es-CL').format(km);
}

function stampFechaArchivo(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function nombresAsistenciaMarcados(sel: Record<string, boolean> | undefined): string[] {
  if (!sel) return [];
  return Object.entries(sel)
    .filter(([, v]) => Boolean(v))
    .map(([id]) => ASISTENCIA_ITEM_LABELS[id] ?? id);
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
    partes.push(`Apoyo otra compañía (nombre): ${a.otraCompaniaNombre.trim()}`);
  }
  if (a.otraCompaniaNombreCompania?.trim()) {
    partes.push(`Apoyo otra compañía (compañía): ${a.otraCompaniaNombreCompania.trim()}`);
  }
  if (a.otraCompaniaUnidad?.trim()) {
    partes.push(`Apoyo otra compañía (unidad): ${a.otraCompaniaUnidad.trim()}`);
  }
  if (a.encargadoDatos?.trim()) {
    partes.push(`Encargado datos: ${a.encargadoDatos.trim()}`);
  }
  if (a.nombreObac?.trim()) {
    partes.push(`OBAC (parte): ${a.nombreObac.trim()}`);
  }
  if (a.radiosUtilizadas?.trim()) {
    partes.push(`Radios: ${a.radiosUtilizadas.trim()}`);
  }
  if (a.radiosDetalle && Object.keys(a.radiosDetalle).length > 0) {
    const radios = Object.entries(a.radiosDetalle)
      .map(([k, v]) => `${k}: ${(v ?? '').trim() || '—'}`)
      .join('; ');
    if (radios) {
      partes.push(`Detalle radios: ${radios}`);
    }
  }
  if (a.asistenciaPorContexto) {
    for (const ctx of ASISTENCIA_CONTEXTO_OPCIONES) {
      const marcados = nombresAsistenciaMarcados(a.asistenciaPorContexto[ctx.key]);
      if (marcados.length > 0) {
        partes.push(`${ctx.label}: ${marcados.join(', ')}`);
      }
    }
  } else if (a.asistenciaSeleccion) {
    const legacy = nombresAsistenciaMarcados(a.asistenciaSeleccion);
    if (legacy.length > 0) {
      partes.push(`Asistencia: ${legacy.join(', ')}`);
    }
  }
  return partes.join('\n');
}

@Injectable({ providedIn: 'root' })
export class PartesExportService {
  private readonly configApi = inject(ConfiguracionesService);
  private readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);

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
      this.cargarLogoComoDataUrl(SIDEP_LOGO_FULL_TRANSPARENT_ABSOLUTE),
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

  private dibujarPieProfesional(doc: jsPDF, nombreOrganizacion: string): void {
    const total = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const generado = fmtFechaHora(new Date().toISOString());
    for (let page = 1; page <= total; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...C_BORDER);
      doc.line(M, pageH - 11.5, pageW - M, pageH - 11.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C_TEXT_MUTED);
      doc.text(lineaPieParteOperativoPdf(nombreOrganizacion, generado), M, pageH - 7);
      doc.text(`Página ${page} de ${total}`, pageW - M, pageH - 7, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0);
  }

  exportarPdf(parte: ParteEmergenciaDto): void {
    void this.exportarPdfAsync(parte);
  }

  private async exportarPdfAsync(parte: ParteEmergenciaDto): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const m = parte.metadata;
    const [logos, modoPdf, brandingPub] = await Promise.all([
      this.getLogos(),
      this.modoLogosPdf(),
      firstValueFrom(this.configApi.brandingPublic().pipe(catchError(() => of({ nombreCompania: '' })))),
    ]);
    const nombreOrg = nombreOrganizacionPdf(brandingPub?.nombreCompania);
    const activos = logosActivosPorConfig(modoPdf);

    const maxSidepW = 30;
    const maxSidepH = 10;
    const maxCompMm = 20;
    const [sidepPrep, compPrep] = await Promise.all([
      activos.sidep && logos.sidep ? prepararLogoParaPdf(logos.sidep, maxSidepW, maxSidepH) : Promise.resolve(null),
      activos.compania && logos.compania
        ? prepararLogoParaPdf(logos.compania, maxCompMm, maxCompMm)
        : Promise.resolve(null),
    ]);

    const headerH = 34;
    // ——— Cabecera principal (fondo, logos nítidos, textos sin solapar marcas) ———
    doc.setFillColor(...C_ACCENT);
    doc.roundedRect(M, M, CONTENT_W, headerH, 2, 2, 'F');

    const idTxt = `N° ${parte.correlativo}`;
    const leftPad = M + 2.5;
    let textX = M + 5;
    if (sidepPrep) {
      try {
        const ly = M + (headerH - sidepPrep.heightMm) / 2;
        doc.addImage(sidepPrep.dataUrl, sidepPrep.format, leftPad, ly, sidepPrep.widthMm, sidepPrep.heightMm);
        textX = leftPad + sidepPrep.widthMm + 4;
      } catch {
        /* ignore */
      }
    } else if (activos.sidep && logos.sidep?.startsWith('data:image')) {
      const rw = 24;
      const rh = 8;
      try {
        const ly = M + (headerH - rh) / 2;
        doc.addImage(logos.sidep, fmtFirmaJsPdf(logos.sidep), leftPad, ly, rw, rh);
        textX = leftPad + rw + 4;
      } catch {
        /* ignore */
      }
    }

    let compReserve = 0;
    if (compPrep) {
      try {
        const cx = M + CONTENT_W - compPrep.widthMm - 3;
        const cy = M + (headerH - compPrep.heightMm) / 2;
        doc.addImage(compPrep.dataUrl, compPrep.format, cx, cy, compPrep.widthMm, compPrep.heightMm);
        compReserve = compPrep.widthMm;
      } catch {
        /* ignore */
      }
    } else if (activos.compania && logos.compania?.startsWith('data:image')) {
      const s = 17;
      try {
        const cx = M + CONTENT_W - s - 3;
        const cy = M + (headerH - s) / 2;
        doc.addImage(logos.compania, fmtFirmaJsPdf(logos.compania), cx, cy, s, s);
        compReserve = s;
      } catch {
        /* ignore */
      }
    }

    const textRight = M + CONTENT_W - 4;
    const subFull = lineaSubtituloPartePdf(nombreOrg);
    const subMaxW = textRight - textX - (compReserve > 0 ? compReserve + 5 : 2);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const subLines = doc.splitTextToSize(subFull, Math.max(24, subMaxW));
    let lineY = M + 9;
    for (const line of subLines.slice(0, 2)) {
      doc.text(line, textX, lineY);
      lineY += 3.6;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Registro operativo', textX, M + 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(idTxt, textRight, M + 30, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    let y = M + headerH + 6;

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
    const pacientes = parte.pacientes ?? [];
    if (pacientes.length > 0) {
      y = sectionHeading(doc, y, 'Pacientes');
      autoTable(doc, {
        startY: y,
        head: [['Nombre', 'Edad', 'RUT', 'Triage']],
        body: pacientes.map((p) => [
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
      y = sectionHeading(doc, y, 'OBAC y asistencia');
      doc.setFontSize(9);
      doc.setTextColor(24, 24, 27);
      y = addWrapped(doc, txtAsist, M, y, CONTENT_W, 4) + 6;
    }

    y = ensureSpace(doc, y, 200);

    // ——— Firmas del cierre ———
    y = sectionHeading(doc, y, 'Firmas del cierre de asistencia');
    const firmaEncargado = m?.asistencia?.firmaEncargadoDatos?.trim() || '';
    const etiquetaEncargado = m?.asistencia?.encargadoDatos?.trim() || 'Encargado de tomar datos';
    const firmaObac =
      m?.asistencia?.firmaObac?.trim() ||
      parte.obac.firmaImagen?.trim() ||
      '';
    y += 1;
    const colGap = 8;
    const colW = (CONTENT_W - colGap) / 2;
    const leftX = M;
    const rightX = M + colW + colGap;
    const boxH = 24;
    if (y + boxH + 8 > 275) {
      doc.addPage();
      y = M + 4;
    }

    const dibujarBloqueFirma = (titulo: string, firma: string, x: number): void => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C_TEXT_MUTED);
      doc.text(titulo, x, y + 4);
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(...C_BORDER);
      doc.roundedRect(x, y + 6, colW, boxH, 1.2, 1.2);
      if (firma.startsWith('data:image')) {
        try {
          doc.addImage(firma, fmtFirmaJsPdf(firma), x + 2, y + 8, colW - 4, boxH - 4);
          return;
        } catch {
          // fallback text below
        }
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C_TEXT_MUTED);
      doc.text('Sin firma digital adjunta.', x + 3, y + 20);
      doc.setTextColor(0, 0, 0);
    };

    dibujarBloqueFirma(`Encargado de datos: ${etiquetaEncargado}`, firmaEncargado, leftX);
    dibujarBloqueFirma(`OBAC: ${m?.asistencia?.nombreObac?.trim() || parte.obac.nombre}`, firmaObac, rightX);
    y += boxH + 12;
    doc.setTextColor(0, 0, 0);

    this.dibujarPieProfesional(doc, nombreOrg);
    doc.save(`SIDEP-parte-${parte.correlativo}-${stampFechaArchivo()}.pdf`);
  }

  exportarPdfListado(partes: ParteEmergenciaDto[]): void {
    if (partes.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text('SIDEP · Partes de emergencia', M, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 91);
    const gen = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    doc.text(`Generado: ${gen} · Registros: ${partes.length}`, M, 20);
    doc.setTextColor(0, 0, 0);
    const body = partes.map((p) => [
      p.correlativo,
      fmtFechaHora(p.fecha),
      this.catalogoEmergencias.etiqueta(p.claveEmergencia),
      (p.direccion ?? '').slice(0, 80),
      p.obac?.nombre ?? '—',
      p.estado ?? '—',
      p.unidades.map((u) => u.carro.nomenclatura).join(', '),
    ]);
    autoTable(doc, {
      startY: 24,
      head: [['Correlativo', 'Fecha', 'Tipo', 'Dirección', 'OBAC', 'Estado', 'Unidades']],
      body,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [185, 28, 28], textColor: 255 },
      margin: { left: M, right: M },
    });
    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`SIDEP-partes-${stamp}.pdf`);
  }

  exportarExcelListado(partes: ParteEmergenciaDto[]): void {
    const generado = new Date();
    const encabezado: (string | number)[][] = [
      ['SIDEP · Partes de emergencia'],
      [`Generado: ${generado.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}`],
      [`Registros: ${partes.length}`],
      [],
    ];
    const columnas = [
      'Correlativo',
      'Fecha',
      'Hora',
      'Tipo de emergencia',
      'Dirección',
      'OBAC',
      'Estado',
      'Unidades',
      'Nº pacientes',
    ];
    const filas: (string | number)[][] = partes.map((p) => [
      p.correlativo,
      new Date(p.fecha).toLocaleDateString('es-CL'),
      new Date(p.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      this.catalogoEmergencias.etiqueta(p.claveEmergencia),
      p.direccion,
      p.obac.nombre,
      p.estado,
      p.unidades.map((u) => u.carro.nomenclatura).join(', '),
      (p.pacientes ?? []).length,
    ]);
    const aoa = [...encabezado, columnas, ...filas];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 9 },
      { wch: 42 },
      { wch: 36 },
      { wch: 28 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Partes');
    const stamp = generado.toISOString().slice(0, 10);
    XLSX.writeFile(wb, `SIDEP-partes-${stamp}.xlsx`);
  }
}
