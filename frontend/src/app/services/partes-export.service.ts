import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type jsPDF from 'jspdf';
import { CatalogoTiposEmergenciaService } from './catalogo-tipos-emergencia.service';
import { PdfExportService } from './pdf-export.service';
import { UsuariosService } from './usuarios.service';
import { nombreArchivoPdfSidep } from '../utils/pdf-nombre-archivo.util';
import { exportarExcelSidep } from '../utils/excel-export.util';
import { ASISTENCIA_CONTEXTO_OPCIONES, resolverEtiquetaAsistenciaId } from '../pages/partes/asistencia-roster.constants';
import { nombreListaSoloPersona } from '../pages/usuarios/usuario-registro.constants';

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL');
}

@Injectable({ providedIn: 'root' })
export class PartesExportService {
  private readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);
  private readonly pdfMarca = inject(PdfExportService);
  private readonly usuariosApi = inject(UsuariosService);
  private pdfLibsPromise: Promise<{ jsPDF: typeof jsPDF; autoTable: (...args: unknown[]) => void }> | null = null;

  private pdfLibs() {
    if (!this.pdfLibsPromise) {
      this.pdfLibsPromise = Promise.all([import('jspdf'), import('jspdf-autotable')]).then(
        ([jspdfMod, autoTableMod]) => ({
          jsPDF: jspdfMod.default,
          autoTable: autoTableMod.default as (...args: unknown[]) => void,
        }),
      );
    }
    return this.pdfLibsPromise;
  }

  private async nombresAsistenciaMap(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    try {
      const usuarios = await firstValueFrom(this.usuariosApi.voluntariosParaSelect());
      for (const u of usuarios) {
        map[u.id] = nombreListaSoloPersona(u);
        if (u.rut) map[u.rut] = nombreListaSoloPersona(u);
      }
    } catch {
      /* sin directorio */
    }
    return map;
  }

  private etiquetaAsistenciaId(id: string, map: Record<string, string>): string {
    return resolverEtiquetaAsistenciaId(id, map);
  }

  private nombresDesdeSeleccion(sel: Record<string, boolean> | undefined, map: Record<string, string>): string[] {
    if (!sel) return [];
    return Object.entries(sel)
      .filter(([, v]) => v)
      .map(([id]) => this.etiquetaAsistenciaId(id, map));
  }

  async exportarPdfListado(partes: any[]): Promise<void> {
    await this.pdfMarca.exportarHistorialTabla({
      titulo: 'Historial de partes',
      subtitulo: 'SIDEP · Partes de emergencia',
      columnas: ['Correlativo', 'Fecha', 'Tipo', 'Dirección', 'OBAC', 'Estado'],
      filas: partes.map((p: any) => [
        p.correlativo ? `P-${p.correlativo}` : String(p.id ?? '—'),
        p.fecha ? new Date(p.fecha).toLocaleString('es-CL') : '—',
        this.catalogoEmergencias.etiqueta(p.claveEmergencia || p.codigoEmergencia || '10-0'),
        p.direccion || '—',
        p.obac?.nombre || '—',
        p.estado || '—',
      ]),
      segmentosNombre: ['Partes', 'Historial'],
      landscape: true,
      resumen: [`Total registros exportados: ${partes.length}`],
    });
  }

  exportarExcelListado(partes: any[]): void {
    const columnas = ['Correlativo', 'Fecha', 'Hora', 'Tipo emergencia', 'Dirección', 'Comuna', 'OBAC', 'Estado'];
    const filas = partes.map((p: any) => {
      const fecha = p.fecha ? new Date(p.fecha) : null;
      return [
        p.correlativo ? `P-${p.correlativo}` : String(p.id ?? '—'),
        fecha ? fecha.toLocaleDateString('es-CL') : '—',
        fecha ? fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—',
        this.catalogoEmergencias.etiqueta(p.claveEmergencia || p.codigoEmergencia || '10-0'),
        p.direccion || '—',
        p.comuna || p.metadata?.comuna || '—',
        p.obac?.nombre || p.metadata?.asistencia?.nombreObac || '—',
        p.estado || '—',
      ];
    });
    exportarExcelSidep({
      titulo: 'SIDEP · Historial de partes de emergencia',
      meta: [`Registros: ${partes.length}`],
      columnas,
      filas,
      nombreHoja: 'Partes',
      nombreArchivo: `SIDEP-historial-partes-${new Date().toISOString().slice(0, 10)}.xlsx`,
      anchosCols: [14, 12, 8, 22, 28, 14, 20, 12],
    });
  }

  async exportarPdf(parte: any): Promise<void> {
    const [{ jsPDF, autoTable }, nombresMap] = await Promise.all([
      this.pdfLibs(),
      this.nombresAsistenciaMap(),
    ]);
    const doc = new jsPDF();
    const margin = 14;
    const meta = parte.metadata ?? {};
    const correlativo = parte.correlativo ? `P-${parte.correlativo}` : String(parte.id ?? '—');
    const tipo = this.catalogoEmergencias.etiqueta(parte.claveEmergencia || parte.codigoEmergencia || '10-0');

    const yHead = await this.pdfMarca.encabezadoMarca(doc, `Parte ${correlativo}`, 'SIDEP · Parte de emergencia');
    doc.setFontSize(10);
    let y = yHead;
    const linea = (etiq: string, val: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${etiq}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, margin + 42, y);
      y += 6;
    };

    linea('Tipo emergencia', tipo);
    linea('Fecha', fmtFecha(parte.fecha));
    linea('Estado', String(parte.estado || '—'));
    linea('Dirección', String(parte.direccion || meta.direccion || '—'));
    if (parte.comuna || meta.comuna) linea('Comuna', String(parte.comuna || meta.comuna));
    linea('OBAC', String(parte.obac?.nombre || meta.asistencia?.nombreObac || '—'));

    const datosBasicos: string[][] = [];
    if (meta.descripcionEmergencia) datosBasicos.push(['Descripción emergencia', String(meta.descripcionEmergencia)]);
    if (meta.horaDelLlamado || meta.horaLlamadoCodigo) {
      datosBasicos.push(['Hora del llamado', String(meta.horaDelLlamado || meta.horaLlamadoCodigo)]);
    }
    if (meta.trabajoRealizado) datosBasicos.push(['Trabajo realizado', String(meta.trabajoRealizado)]);
    if (meta.materialUtilizado) datosBasicos.push(['Material utilizado', String(meta.materialUtilizado)]);
    if (meta.observaciones) datosBasicos.push(['Observaciones', String(meta.observaciones)]);

    if (datosBasicos.length > 0) {
      autoTable(doc, {
        startY: y + 2,
        head: [['Campo', 'Detalle']],
        body: datosBasicos,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: this.pdfMarca.estilosEncabezadoTabla,
        columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold' } },
        margin: { left: margin, right: margin },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 2;
    }

    const unidades = parte.unidades ?? meta.vehiculos ?? [];
    if (Array.isArray(unidades) && unidades.length > 0) {
      y += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Unidades despachadas', margin, y);
      doc.setFont('helvetica', 'normal');
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Unidad', 'Conductor', 'Tripulación']],
        body: unidades.map((u: any) => [
          u.nomenclatura || u.carro?.nomenclatura || u.carroId || '—',
          u.conductor || '—',
          Array.isArray(u.tripulacion) ? u.tripulacion.join(', ') : u.tripulacion || '—',
        ]),
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: this.pdfMarca.estilosEncabezadoTabla,
        margin: { left: margin, right: margin },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    }

    const asist = meta.asistencia;
    if (asist) {
      y += 10;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Asistencia', margin, y);
      doc.setFont('helvetica', 'normal');
      y += 6;

      const filasAsist: string[][] = [];
      if (asist.asistenciaTotal) filasAsist.push(['Total voluntarios', String(asist.asistenciaTotal)]);
      if (asist.nombreObac) filasAsist.push(['OBAC', String(asist.nombreObac)]);
      if (asist.oficial128) filasAsist.push(['Oficial 12-8', String(asist.oficial128)]);

      const apc = asist.asistenciaPorContexto;
      if (apc && typeof apc === 'object') {
        for (const ctx of ASISTENCIA_CONTEXTO_OPCIONES) {
          const nombres = this.nombresDesdeSeleccion(apc[ctx.key], nombresMap);
          if (nombres.length > 0) filasAsist.push([ctx.label, nombres.join(', ')]);
        }
      } else {
        const marcados = this.nombresDesdeSeleccion(asist.asistenciaSeleccion, nombresMap);
        if (marcados.length > 0) filasAsist.push(['Voluntarios presentes', marcados.join(', ')]);
      }

      if (filasAsist.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Concepto', 'Detalle']],
          body: filasAsist,
          theme: 'grid',
          styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
          headStyles: this.pdfMarca.estilosEncabezadoTabla,
          margin: { left: margin, right: margin },
        });
        y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
      }
    }

    const apoyo = meta.apoyoExterno ?? parte.apoyoExterno;
    if (Array.isArray(apoyo) && apoyo.length > 0) {
      y += 10;
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      autoTable(doc, {
        startY: y,
        head: [['Apoyo externo', 'Detalle']],
        body: apoyo.map((a: any) => [a.institucion || a.tipo || '—', a.detalle || a.observacion || '—']),
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2 },
        headStyles: this.pdfMarca.estilosEncabezadoTabla,
        margin: { left: margin, right: margin },
      });
    }

    this.pdfMarca.pieMarca(doc);
    doc.save(
      nombreArchivoPdfSidep(
        ['Parte', parte.correlativo ? `P-${parte.correlativo}` : String(parte.id ?? correlativo)],
        parte.fecha ?? new Date(),
      ),
    );
  }
}
