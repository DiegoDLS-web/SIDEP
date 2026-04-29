import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { catchError, forkJoin, of } from 'rxjs';
import type { DashboardResumenDto } from '../../models/dashboard.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { DashboardService } from '../../services/dashboard.service';
import { ReportesService } from '../../services/reportes.service';
import type { AnaliticaOperacionalDto } from '../../models/reportes.dto';
import { CLAVES_EMERGENCIA } from '../partes/partes.constants';

@Component({
  selector: 'app-analitica-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './analitica-page.component.html',
})
export class AnaliticaPageComponent implements OnInit {
  private readonly reportesApi = inject(ReportesService);
  private readonly dashboardApi = inject(DashboardService);
  private readonly nf = new Intl.NumberFormat('es-CL');
  @ViewChild('reporteAnalitica') reporteAnalitica?: ElementRef<HTMLElement>;

  loading = false;
  exportandoPdf = false;
  exportandoPng: string | null = null;
  error: string | null = null;
  datos: AnaliticaOperacionalDto | null = null;
  dashboardDatos: DashboardResumenDto | null = null;
  readonly clavesTipo = CLAVES_EMERGENCIA;

  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  mesAsistenciaSeleccionado = new Date().getMonth() + 1;
  readonly aniosDisponibles: number[] = [];
  readonly meses = [
    { id: 1, nombre: 'Enero' },
    { id: 2, nombre: 'Febrero' },
    { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' },
    { id: 5, nombre: 'Mayo' },
    { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' },
    { id: 8, nombre: 'Agosto' },
    { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' },
    { id: 11, nombre: 'Noviembre' },
    { id: 12, nombre: 'Diciembre' },
  ];

  ngOnInit(): void {
    const y = new Date().getFullYear();
    for (let a = y - 2; a <= y + 1; a++) this.aniosDisponibles.push(a);
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;
    forkJoin({
      analitica: this.reportesApi.analiticaOperacional(this.anio, this.mes),
      dashboard: this.dashboardApi.resumen(this.anio, 'todos', 'todas').pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ analitica, dashboard }) => {
        this.datos = this.normalizarAnalitica(analitica);
        this.dashboardDatos = dashboard;
        const mesesConDetalle =
          this.datos.asistenciaVoluntariosDetallePorMes
            ?.filter((x) => (x.voluntarios?.length ?? 0) > 0)
            .map((x) => x.mes) ?? [];
        if (!mesesConDetalle.includes(this.mesAsistenciaSeleccionado)) {
          this.mesAsistenciaSeleccionado = mesesConDetalle.includes(this.mes)
            ? this.mes
            : (mesesConDetalle[0] ?? this.mes);
        }
        this.loading = false;
      },
      error: (e) => {
        this.error = e?.error?.error ?? 'No se pudo cargar la analítica operacional.';
        this.loading = false;
      },
    });
  }

  maxSalidas(): number {
    const rows = this.datos?.usoUnidades ?? [];
    return Math.max(...rows.map((r) => r.salidas), 1);
  }

  maxCumplimiento(): number {
    const rows = this.datos?.cumplimientoChecklist ?? [];
    return Math.max(...rows.map((r) => r.cumplimientoPct), 1);
  }

  maxAsistenciaVoluntarios(): number {
    const rows = this.datos?.asistenciaVoluntariosPorMes ?? [];
    return Math.max(...rows.map((r) => r.voluntariosConAsistencia), 1);
  }

  maxAsistenciaVoluntarioMes(): number {
    const rows = this.detalleAsistenciaMesSeleccionado()?.voluntarios ?? [];
    return Math.max(...rows.map((r) => r.asistenciasRegistradas), 1);
  }

  detalleAsistenciaMesSeleccionado() {
    return this.datos?.asistenciaVoluntariosDetallePorMes?.find((x) => x.mes === this.mesAsistenciaSeleccionado) ?? null;
  }

  nombreMes(mesId: number | null | undefined): string {
    if (!mesId) return 'Mes no definido';
    return this.meses.find((m) => m.id === mesId)?.nombre ?? `Mes ${mesId}`;
  }

  numero(value: number | null | undefined): string {
    return this.nf.format(value ?? 0);
  }

  nivelSla(): 'alto' | 'medio' | 'bajo' {
    const pct = this.datos?.cumplimientoRespuesta8MinPct ?? 0;
    if (pct >= 80) return 'alto';
    if (pct >= 60) return 'medio';
    return 'bajo';
  }

  claseNivelSla(): string {
    const nivel = this.nivelSla();
    if (nivel === 'alto') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (nivel === 'medio') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-red-500/20 text-red-300 border-red-500/40';
  }

  textoNivelSla(): string {
    const nivel = this.nivelSla();
    if (nivel === 'alto') return 'SLA saludable';
    if (nivel === 'medio') return 'SLA en observación';
    return 'SLA crítico';
  }

  maxSalidasSemana(): number {
    const rows = this.datos?.salidasPorSemana ?? [];
    return Math.max(...rows.map((r) => r.salidas), 1);
  }

  /** Ancho visible de la barra (mín. 2% si hay al menos 1 salida) */
  anchoBarraSemana(salidas: number): number {
    const max = this.maxSalidasSemana();
    if (max <= 0) return 0;
    const pct = (salidas / max) * 100;
    if (salidas > 0 && pct < 3) return 3;
    return pct;
  }

  claseVariacion(value: number): string {
    if (value > 0) return 'text-emerald-300';
    if (value < 0) return 'text-red-300';
    return 'text-gray-300';
  }

  textoVariacion(value: number): string {
    if (value > 0) return `+${value}%`;
    return `${value}%`;
  }

  get statsDashboard(): Array<{ label: string; value: string; icon: string; grad: string }> {
    const d = this.dashboardDatos;
    if (!d) {
      return [
        { label: `Emergencias totales ${this.anio}`, value: '—', icon: 'flame', grad: 'from-red-500 to-red-600' },
        { label: 'Tiempo promedio respuesta', value: '—', icon: 'clock', grad: 'from-yellow-500 to-yellow-600' },
        { label: 'Emergencias resueltas', value: '—', icon: 'circle-check', grad: 'from-green-500 to-green-600' },
        { label: 'Emergencias (mes de referencia)', value: '—', icon: 'users', grad: 'from-blue-500 to-blue-600' },
      ];
    }
    return [
      {
        label: `Emergencias totales ${d.anio}`,
        value: this.numero(d.totalEmergencias),
        icon: 'flame',
        grad: 'from-red-500 to-red-600',
      },
      {
        label: 'Tiempo promedio respuesta',
        value: `${d.tiempoPromedioRespuestaMin} min`,
        icon: 'clock',
        grad: 'from-yellow-500 to-yellow-600',
      },
      {
        label: 'Emergencias resueltas',
        value: `${d.porcentajeResueltas}%`,
        icon: 'circle-check',
        grad: 'from-green-500 to-green-600',
      },
      {
        label: 'Emergencias (mes de referencia)',
        value: this.numero(d.emergenciasEsteMes),
        icon: 'users',
        grad: 'from-blue-500 to-blue-600',
      },
    ];
  }

  get mesesChartDashboard(): { mes: string; cantidadActual: number; cantidadPrev: number }[] {
    const actual = this.dashboardDatos;
    if (!actual) return [];
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const anio = actual.anio;
    const anioPrev = anio - 1;
    return labels.map((mes, idx) => {
      const periodo = `${anio}-${`${idx + 1}`.padStart(2, '0')}`;
      const periodoPrev = `${anioPrev}-${`${idx + 1}`.padStart(2, '0')}`;
      const cantidadActual = actual.porMes.find((p) => p.periodo === periodo)?.cantidad ?? 0;
      const cantidadPrev = 0;
      const refPrev = actual.porMes.find((p) => p.periodo === periodoPrev)?.cantidad;
      return { mes, cantidadActual, cantidadPrev: refPrev ?? cantidadPrev };
    });
  }

  maxMesDashboard(): number {
    const rows = this.mesesChartDashboard;
    return Math.max(...rows.map((m) => Math.max(m.cantidadActual, m.cantidadPrev)), 1);
  }

  maxPorTipoDashboard(): number {
    const t = this.dashboardDatos?.porTipo ?? [];
    return Math.max(...t.map((x) => x.cantidad), 1);
  }

  maxHeatDashboard(): number {
    const h = this.dashboardDatos?.heatmapSemanas ?? [];
    let m = 0;
    for (const row of h) {
      for (const v of row) {
        if (v > m) m = v;
      }
    }
    return m || 1;
  }

  heatClassDashboard(val: number): string {
    if (val === 0) return 'bg-gray-800';
    const ratio = val / this.maxHeatDashboard();
    if (ratio < 0.25) return 'bg-red-900';
    if (ratio < 0.5) return 'bg-red-700';
    if (ratio < 0.75) return 'bg-red-600';
    return 'bg-red-500';
  }

  etiquetaClaveDashboard(clave: string): string {
    const f = this.clavesTipo.find((c) => c.value === clave);
    return f?.label ?? clave;
  }

  estadoParteClassDashboard(estado: string): string {
    const e = estado.toUpperCase();
    if (e === 'COMPLETADO') return 'bg-green-600/20 text-green-400';
    if (e === 'PENDIENTE') return 'bg-amber-600/20 text-amber-300';
    return 'bg-gray-600/20 text-gray-300';
  }

  private async capturarElemento(element: HTMLElement): Promise<string> {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#0a0a0a',
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        const hidden = doc.querySelectorAll<HTMLElement>('[data-export-hide="true"]');
        for (const node of hidden) node.style.display = 'none';
        const nodes = doc.querySelectorAll<HTMLElement>('*');
        for (const node of nodes) {
          // Evita halos/blancos generados por ring/box-shadow de Tailwind en html2canvas.
          node.style.boxShadow = 'none';
          node.style.outline = 'none';
          node.style.backdropFilter = 'none';
        }
      },
    });
    return canvas.toDataURL('image/png');
  }

  async exportarReportePdf(): Promise<void> {
    const host = this.reporteAnalitica?.nativeElement;
    if (!host || this.exportandoPdf) return;
    this.exportandoPdf = true;
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const margin = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxImageWidth = pageWidth - margin * 2;
      const fechaGeneracion = new Date();

      const dibujarPie = (): void => {
        const total = doc.getNumberOfPages();
        const actual = doc.getCurrentPageInfo().pageNumber;
        doc.setDrawColor(225, 228, 232);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(90, 96, 104);
        doc.text(
          `SIDEP · Analitica operacional · ${fechaGeneracion.toLocaleDateString('es-CL')} ${fechaGeneracion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
          margin,
          pageHeight - 7.2,
        );
        doc.text(`Pagina ${actual} de ${total}`, pageWidth - margin, pageHeight - 7.2, { align: 'right' });
      };

      doc.setFillColor(185, 28, 28);
      doc.roundedRect(margin, 12, pageWidth - margin * 2, 24, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Reporte de analitica operacional', margin + 5, 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(`Periodo: ${this.meses[this.mes - 1]?.nombre ?? this.mes} ${this.anio}`, margin + 5, 28);
      doc.text('Compania de Bomberos · SIDEP', margin + 5, 33);

      doc.setTextColor(28, 31, 35);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        'Este documento consolida indicadores, comparativos y asistencia del periodo seleccionado.',
        margin,
        45,
      );

      let y = 50;

      const sections = Array.from(host.querySelectorAll<HTMLElement>(':scope > [data-exportable="true"]'));
      for (const section of sections) {
        const seccionId = section.getAttribute('data-export-id') ?? 'seccion';
        const tituloSeccion = this.tituloSeccionPdf(seccionId);
        const imgData = await this.capturarElemento(section);
        const img = new Image();
        img.src = imgData;
        await img.decode();

        const altoDisponible = pageHeight - y - 14;
        let imgHeight = (img.height * maxImageWidth) / img.width;
        if (imgHeight > altoDisponible) {
          imgHeight = altoDisponible;
        }

        if (y + imgHeight > pageHeight - 14) {
          doc.addPage();
          y = 16;
        }

        doc.setFillColor(244, 245, 247);
        doc.roundedRect(margin, y, maxImageWidth, 6.5, 1.2, 1.2, 'F');
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(tituloSeccion, margin + 3, y + 4.4);
        y += 7.5;

        doc.addImage(imgData, 'PNG', margin, y, maxImageWidth, imgHeight);
        y += imgHeight + 4;
      }

      const totalPaginas = doc.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        dibujarPie();
      }

      doc.save(`SIDEP-analitica-operacional-${this.anio}-${String(this.mes).padStart(2, '0')}.pdf`);
    } catch {
      this.error = 'No se pudo exportar el reporte PDF.';
    } finally {
      this.exportandoPdf = false;
    }
  }

  async exportarSeccionPng(sectionId: string): Promise<void> {
    if (this.exportandoPng) return;
    const host = this.reporteAnalitica?.nativeElement;
    const section = host?.querySelector<HTMLElement>(`[data-export-id="${sectionId}"]`);
    if (!section) return;
    this.exportandoPng = sectionId;
    try {
      const dataUrl = await this.capturarElemento(section);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `analitica-${sectionId}-${this.anio}-${String(this.mes).padStart(2, '0')}.png`;
      link.click();
    } catch {
      this.error = 'No se pudo exportar la imagen PNG.';
    } finally {
      this.exportandoPng = null;
    }
  }

  /** Garantiza comparativo, semanas y asistencia aunque el backend esté desactualizado. */
  private normalizarAnalitica(raw: AnaliticaOperacionalDto): AnaliticaOperacionalDto {
    const toNumber = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const anio = toNumber(raw.anio) || this.anio;
    const mes = toNumber(raw.mes) || this.mes;
    const diasMes = new Date(anio, mes, 0).getDate();
    const semanasMes = Math.ceil(diasMes / 7);

    let salidasPorSemana = raw.salidasPorSemana;
    if (!salidasPorSemana?.length) {
      salidasPorSemana = Array.from({ length: semanasMes }, (_, i) => ({
        semana: i + 1,
        salidas: 0,
      }));
    }

    const comparativoMensualRaw =
      raw.comparativoMensual ?? {
        salidasMesAnterior: 0,
        kilometrosMesAnterior: 0,
        variacionSalidasPct: 0,
        variacionKilometrosPct: 0,
      };
    const comparativoMensual = {
      salidasMesAnterior: toNumber(comparativoMensualRaw.salidasMesAnterior),
      kilometrosMesAnterior: toNumber(comparativoMensualRaw.kilometrosMesAnterior),
      variacionSalidasPct: toNumber(comparativoMensualRaw.variacionSalidasPct),
      variacionKilometrosPct: toNumber(comparativoMensualRaw.variacionKilometrosPct),
    };

    const asistenciaVoluntariosPorMes = (raw.asistenciaVoluntariosPorMes ?? []).map((a) => ({
      ...a,
      mes: toNumber(a.mes),
      voluntariosConAsistencia: toNumber(a.voluntariosConAsistencia),
      asistenciasRegistradas: toNumber(a.asistenciasRegistradas),
    }));
    const asistenciaVoluntariosTotalAnual =
      raw.asistenciaVoluntariosTotalAnual ??
      asistenciaVoluntariosPorMes.reduce((a, r) => a + r.asistenciasRegistradas, 0);
    const asistenciaVoluntariosDetallePorMes = (raw.asistenciaVoluntariosDetallePorMes ?? []).map((m) => ({
      ...m,
      mes: toNumber(m.mes),
      voluntarios: (m.voluntarios ?? []).map((v) => ({
        ...v,
        asistenciasRegistradas: toNumber(v.asistenciasRegistradas),
        partesConAsistencia: toNumber(v.partesConAsistencia),
      })),
    }));

    return {
      ...raw,
      anio,
      mes,
      tiempoDespachoPromedioMin: toNumber(raw.tiempoDespachoPromedioMin),
      tiempoRespuestaPromedioMin: toNumber(raw.tiempoRespuestaPromedioMin),
      duracionPromedioEmergenciaMin: toNumber(raw.duracionPromedioEmergenciaMin),
      cumplimientoRespuesta8MinPct: toNumber(raw.cumplimientoRespuesta8MinPct),
      salidasTotalesMes: toNumber(raw.salidasTotalesMes),
      kilometrosTotalesMes: toNumber(raw.kilometrosTotalesMes),
      salidasPorSemana: (salidasPorSemana ?? []).map((s) => ({
        semana: toNumber(s.semana),
        salidas: toNumber(s.salidas),
      })),
      sectoresCriticos: (raw.sectoresCriticos ?? []).map((s) => ({
        ...s,
        promedioRespuestaMin: toNumber(s.promedioRespuestaMin),
        casos: toNumber(s.casos),
      })),
      usoUnidades: (raw.usoUnidades ?? []).map((u) => ({
        ...u,
        salidas: toNumber(u.salidas),
        km: toNumber(u.km),
        kilometrosPromedioPorSalida: toNumber(u.kilometrosPromedioPorSalida),
      })),
      cumplimientoChecklist: (raw.cumplimientoChecklist ?? []).map((c) => ({
        ...c,
        diasConChecklist: toNumber(c.diasConChecklist),
        diasMes: toNumber(c.diasMes),
        cumplimientoPct: toNumber(c.cumplimientoPct),
      })),
      comparativoMensual,
      asistenciaVoluntariosPorMes,
      asistenciaVoluntariosTotalAnual: toNumber(asistenciaVoluntariosTotalAnual),
      asistenciaVoluntariosDetallePorMes,
    };
  }

  private tituloSeccionPdf(sectionId: string): string {
    const mapa: Record<string, string> = {
      kpis: 'Indicadores clave',
      'comparativo-claro': 'Comparativos mensuales',
      'actividad-semanas': 'Actividad y distribucion semanal',
      'sectores-uso': 'Sectores criticos y uso de unidades',
      'checklist-asistencia': 'Checklist y asistencia de voluntarios',
      'asistencia-voluntario': 'Detalle asistencia por voluntario',
    };
    return mapa[sectionId] ?? 'Seccion de analitica';
  }
}
