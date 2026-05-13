import { CommonModule, formatDate } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import type { ChecklistRegistroDto, ChecklistResumenUnidadDto, EstadoChecklist } from '../../models/checklist.dto';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { calcularEstadoChecklist, etiquetaEstadoChecklist } from '../../utils/checklist-estado';
import { etiquetaCompletandoOCompletado } from '../../utils/etiqueta-completitud';
import { CatalogoTiposEmergenciaService } from '../../services/catalogo-tipos-emergencia.service';
import { historialCoincideSeleccionTipoEmergencia } from '../../utils/tipo-emergencia-modulo-match';

@Component({
  selector: 'app-checklist-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SidepIconsModule,
    SidScrollRevealDirective,
    SidEmptyStateComponent,
    SidDateInputComponent,
  ],
  templateUrl: './checklist-selector.component.html',
})
export class ChecklistSelectorComponent implements OnInit {
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly router = inject(Router);
  readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);

  unidades: ChecklistResumenUnidadDto[] = [];
  loading = true;
  error: string | null = null;
  historialLoading = false;
  /** Índice alineado con `unidades` (evita colisiones de clave en Object). */
  historialesPorUnidad: ChecklistRegistroDto[][] = [];
  /** Nomenclaturas seleccionadas; vacío = todas. */
  filtroUnidadesHistorial: string[] = [];
  /** Claves de catálogo (CHECKLIST_UNIDAD y similares aplican a `registro.tipo`). */
  filtroTiposEmergenciaHistorial: string[] = [];
  filtroUnidadesPanelAbierto = false;
  filtroTipoEmergenciaPanelAbierto = false;
  filtroEstadoHistorial = 'TODOS';
  filtroTextoHistorial = '';
  filtroHistorialDesde = '';
  filtroHistorialHasta = '';
  historialDetalle: (ChecklistRegistroDto & { unidad: string; nombreUnidad: string }) | null = null;
  paginaHistorial = 1;
  readonly tamanioPaginaHistorial = 10;

  ngOnInit(): void {
    this.checklistsApi.resumenUnidades().subscribe({
      next: (data) => {
        this.unidades = data;
        this.loading = false;
        this.cargarHistorialGeneral();
      },
      error: () => {
        this.error = 'No se pudo cargar el resumen de checklist.';
        this.loading = false;
      },
    });
  }

  completitud(u: ChecklistResumenUnidadDto): number {
    const total = Number(u.itemsTotal) || 0;
    const ok = Number(u.itemsOk) || 0;
    if (total <= 0) return 0;
    return Math.round((ok / total) * 100);
  }

  etiquetaBarraCompletitud(u: ChecklistResumenUnidadDto): string {
    return etiquetaCompletandoOCompletado(this.completitud(u));
  }

  /** Texto ítems verificados (evita NaN/undefined en pantalla). */
  itemsVerificadosTexto(u: ChecklistResumenUnidadDto): string {
    const total = Number(u.itemsTotal) || 0;
    const ok = Number(u.itemsOk) || 0;
    return `${ok}/${total}`;
  }

  /** Estado del checklist de unidad para la tarjeta. */
  estadoItemsEtiqueta(u: ChecklistResumenUnidadDto): EstadoChecklist {
    if (u.ultimaRevision?.estadoChecklist) return u.ultimaRevision.estadoChecklist;
    return calcularEstadoChecklist(u.itemsTotal, u.itemsOk, null);
  }

  fechaHora(iso: string | null | undefined): { fecha: string; hora: string } {
    if (!iso) return { fecha: '—', hora: '—' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { fecha: '—', hora: '—' };
    return {
      fecha: formatDate(d, 'dd/MM/yyyy', 'es-CL'),
      hora: formatDate(d, 'HH:mm', 'es-CL'),
    };
  }

  stats() {
    const total = this.unidades.length;
    const completas = this.unidades.filter((u) => {
      const t = Number(u.itemsTotal) || 0;
      const ok = Number(u.itemsOk) || 0;
      return t > 0 && ok >= t;
    }).length;
    const incompletas = this.unidades.filter((u) => {
      const t = Number(u.itemsTotal) || 0;
      const ok = Number(u.itemsOk) || 0;
      return t === 0 || ok < t;
    }).length;
    const faltantes = this.unidades.reduce((acc, u) => {
      const t = Number(u.itemsTotal) || 0;
      const ok = Number(u.itemsOk) || 0;
      return acc + Math.max(t - ok, 0);
    }, 0);
    return { total, completas, incompletas, faltantes };
  }

  private cargarHistorialGeneral(): void {
    if (this.unidades.length === 0) {
      return;
    }
    this.historialLoading = true;
    forkJoin(
      this.unidades.map((unidad) =>
        this.checklistsApi.historialUnidad(unidad.unidad).pipe(catchError(() => of([]))),
      ),
    ).subscribe({
      next: (responses) => {
        this.historialesPorUnidad = responses.map((r) => r ?? []);
        this.historialLoading = false;
      },
      error: () => {
        this.historialesPorUnidad = [];
        this.historialLoading = false;
      },
    });
  }

  historialGeneral(): Array<ChecklistRegistroDto & { unidad: string; nombreUnidad: string }> {
    return this.unidades
      .flatMap((unidad, index) =>
        (this.historialesPorUnidad[index] ?? []).map((registro) => ({
          ...registro,
          unidad: unidad.unidad,
          nombreUnidad: unidad.nombre ?? `Unidad ${unidad.unidad}`,
        })),
      )
      .sort((a, b) => {
        const tb = new Date(b.fecha).getTime();
        const ta = new Date(a.fecha).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      });
  }

  estadoHistorialFila(registro: ChecklistRegistroDto & { unidad: string; nombreUnidad: string }): EstadoChecklist {
    if (registro.estadoChecklist) return registro.estadoChecklist;
    return calcularEstadoChecklist(registro.totalItems, registro.itemsOk, registro.observaciones);
  }

  historialFiltrado(): Array<ChecklistRegistroDto & { unidad: string; nombreUnidad: string }> {
    const texto = this.filtroTextoHistorial.trim().toLowerCase();
    return this.historialGeneral().filter((registro) => {
      const coincideUnidad =
        this.filtroUnidadesHistorial.length === 0 ||
        this.filtroUnidadesHistorial.includes(registro.unidad);
      const coincideTipoEmergencia = historialCoincideSeleccionTipoEmergencia(
        registro.tipo,
        this.filtroTiposEmergenciaHistorial,
      );
      const estado = this.estadoHistorialFila(registro);
      const coincideEstado =
        this.filtroEstadoHistorial === 'TODOS' ||
        (this.filtroEstadoHistorial === 'COMPLETADOS' && estado === 'COMPLETADO') ||
        (this.filtroEstadoHistorial === 'PENDIENTES' && estado === 'PENDIENTE') ||
        (this.filtroEstadoHistorial === 'CON_OBSERVACION' && estado === 'CON_OBSERVACION');
      const coincideTexto =
        !texto ||
        (registro.unidad ?? '').toLowerCase().includes(texto) ||
        (registro.nombreUnidad ?? '').toLowerCase().includes(texto) ||
        (registro.inspector ?? '').toLowerCase().includes(texto) ||
        (registro.cuartelero?.nombre ?? '').toLowerCase().includes(texto) ||
        (registro.observaciones ?? '').toLowerCase().includes(texto);
      const fechaReg = new Date(registro.fecha).getTime();
      const tDesde = this.filtroHistorialDesde.trim();
      const tHasta = this.filtroHistorialHasta.trim();
      let coincideFecha = true;
      if (tDesde) {
        const d0 = new Date(`${tDesde}T00:00:00`).getTime();
        if (!Number.isNaN(d0)) coincideFecha = coincideFecha && fechaReg >= d0;
      }
      if (tHasta) {
        const d1 = new Date(`${tHasta}T23:59:59.999`).getTime();
        if (!Number.isNaN(d1)) coincideFecha = coincideFecha && fechaReg <= d1;
      }
      return coincideUnidad && coincideTipoEmergencia && coincideEstado && coincideTexto && coincideFecha;
    });
  }

  totalPaginasHistorial(): number {
    return Math.max(1, Math.ceil(this.historialFiltrado().length / this.tamanioPaginaHistorial));
  }

  historialPaginado(): Array<ChecklistRegistroDto & { unidad: string; nombreUnidad: string }> {
    const inicio = (this.paginaHistorial - 1) * this.tamanioPaginaHistorial;
    return this.historialFiltrado().slice(inicio, inicio + this.tamanioPaginaHistorial);
  }

  cambiarPaginaHistorial(delta: number): void {
    const next = this.paginaHistorial + delta;
    const total = this.totalPaginasHistorial();
    this.paginaHistorial = Math.min(Math.max(next, 1), total);
  }

  etiquetaFiltroUnidadesHistorial(): string {
    const n = this.filtroUnidadesHistorial.length;
    if (n === 0) return 'Todas las unidades';
    if (n === 1) return this.filtroUnidadesHistorial[0] ?? '1 unidad';
    return `${n} unidades seleccionadas`;
  }

  etiquetaFiltroTipoEmergenciaHistorial(): string {
    const n = this.filtroTiposEmergenciaHistorial.length;
    if (n === 0) return 'Todos los tipos';
    if (n === 1) return this.catalogoEmergencias.etiqueta(this.filtroTiposEmergenciaHistorial[0]!);
    return `${n} tipos seleccionados`;
  }

  textoEtiquetaTipoOpcion(c: { value: string; label?: string | null }): string {
    const s = (c.label ?? '').trim();
    if (s) return s;
    return this.catalogoEmergencias.etiqueta(c.value);
  }

  toggleFiltroUnidadesPanel(ev: MouseEvent): void {
    ev.stopPropagation();
    this.filtroUnidadesPanelAbierto = !this.filtroUnidadesPanelAbierto;
    if (this.filtroUnidadesPanelAbierto) {
      this.filtroTipoEmergenciaPanelAbierto = false;
    }
  }

  toggleFiltroTipoEmergenciaPanel(ev: MouseEvent): void {
    ev.stopPropagation();
    this.filtroTipoEmergenciaPanelAbierto = !this.filtroTipoEmergenciaPanelAbierto;
    if (this.filtroTipoEmergenciaPanelAbierto) {
      this.filtroUnidadesPanelAbierto = false;
    }
  }

  unidadHistorialSeleccionada(nom: string): boolean {
    return this.filtroUnidadesHistorial.includes(nom);
  }

  toggleUnidadHistorial(nom: string, ev?: MouseEvent): void {
    ev?.stopPropagation();
    const i = this.filtroUnidadesHistorial.indexOf(nom);
    if (i >= 0) {
      this.filtroUnidadesHistorial = this.filtroUnidadesHistorial.filter((_, j) => j !== i);
    } else {
      this.filtroUnidadesHistorial = [...this.filtroUnidadesHistorial, nom];
    }
    this.paginaHistorial = 1;
  }

  limpiarUnidadesHistorial(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.filtroUnidadesHistorial.length === 0) return;
    this.filtroUnidadesHistorial = [];
    this.paginaHistorial = 1;
  }

  tipoEmergenciaHistorialSeleccionado(valor: string): boolean {
    return this.filtroTiposEmergenciaHistorial.includes(valor);
  }

  toggleTipoEmergenciaHistorial(valor: string, ev?: MouseEvent): void {
    ev?.stopPropagation();
    const i = this.filtroTiposEmergenciaHistorial.indexOf(valor);
    if (i >= 0) {
      this.filtroTiposEmergenciaHistorial = this.filtroTiposEmergenciaHistorial.filter((_, j) => j !== i);
    } else {
      this.filtroTiposEmergenciaHistorial = [...this.filtroTiposEmergenciaHistorial, valor];
    }
    this.paginaHistorial = 1;
  }

  limpiarTiposEmergenciaHistorial(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.filtroTiposEmergenciaHistorial.length === 0) return;
    this.filtroTiposEmergenciaHistorial = [];
    this.paginaHistorial = 1;
  }

  @HostListener('document:click', ['$event'])
  cerrarPanelesHistorial(ev: MouseEvent): void {
    const t = ev.target;
    if (!(t instanceof Node)) return;
    const wu = document.getElementById('checklist-hist-unidades-wrap');
    const wt = document.getElementById('checklist-hist-tipo-emergencia-wrap');
    if (this.filtroUnidadesPanelAbierto && !wu?.contains(t)) {
      this.filtroUnidadesPanelAbierto = false;
    }
    if (this.filtroTipoEmergenciaPanelAbierto && !wt?.contains(t)) {
      this.filtroTipoEmergenciaPanelAbierto = false;
    }
  }

  tituloUnidad(u: ChecklistResumenUnidadDto): string {
    const t = String(u.unidad ?? '').trim();
    return t || `Unidad #${u.id ?? '?'}`;
  }

  subtituloUnidad(u: ChecklistResumenUnidadDto): string {
    const t = String(u.nombre ?? '').trim();
    return t || 'Sin nombre registrado';
  }

  private readonly imagenPorNomenclatura: Record<string, string> = {
    'B-1': this.assetUrl('assets/carros/b1.png'),
    'BX-1': this.assetUrl('assets/carros/bx1.png'),
    'R-1': this.assetUrl('assets/carros/r1.png'),
  };

  private readonly imagenTarjetaFallback =
    'https://images.unsplash.com/photo-1588662880295-13d2b28127c6?w=1080&q=80&fm=jpg';

  private assetUrl(path: string): string {
    return new URL(path, document.baseURI).toString();
  }

  private normalizarUrlImagenUnidad(raw: string, nomenclatura: string): string {
    const limpio = raw.replace(/\\/g, '/').trim();
    if (limpio.startsWith('http://') || limpio.startsWith('https://') || limpio.startsWith('data:image')) {
      return limpio;
    }
    if (limpio.startsWith('/assets/')) {
      return this.assetUrl(limpio.slice(1));
    }
    const idxAssets = limpio.toLowerCase().indexOf('/assets/');
    if (idxAssets >= 0) {
      return this.assetUrl(limpio.slice(idxAssets + 1));
    }
    if (limpio.startsWith('assets/')) {
      return this.assetUrl(limpio);
    }
    if (limpio.startsWith('/')) {
      return limpio;
    }
    if (limpio.includes('/')) {
      return limpio;
    }
    return this.imagenPorNomenclatura[nomenclatura] ?? this.imagenTarjetaFallback;
  }

  imagenUnidadTarjeta(u: ChecklistResumenUnidadDto): string {
    const raw = (u.imagenUrl ?? '').trim();
    const nom = String(u.unidad ?? '').trim();
    if (!raw) {
      return this.imagenPorNomenclatura[nom] ?? this.imagenTarjetaFallback;
    }
    return this.normalizarUrlImagenUnidad(raw, nom);
  }

  onImagenTarjetaError(event: Event, u: ChecklistResumenUnidadDto): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    const fb = this.imagenPorNomenclatura[String(u.unidad ?? '').trim()];
    if (fb && img.src !== fb) {
      img.src = fb;
      return;
    }
    if (!img.src.includes(this.imagenTarjetaFallback)) {
      img.src = this.imagenTarjetaFallback;
    }
  }

  /** Navegación explícita (más fiable que solo `<a>` en algunos layouts). */
  abrirChecklistUnidad(u: ChecklistResumenUnidadDto, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const codigo = String(u.unidad ?? '').trim();
    if (!codigo) {
      return;
    }
    void this.router.navigate(['/checklist', codigo]);
  }

  trackHistorialFila(
    h: ChecklistRegistroDto & { unidad: string; nombreUnidad: string },
  ): string {
    return `${h.id}-${h.unidad}-${h.fecha}`;
  }

  aplicarFiltrosHistorial(): void {
    this.paginaHistorial = 1;
  }

  limpiarFiltrosHistorial(): void {
    this.filtroUnidadesHistorial = [];
    this.filtroTiposEmergenciaHistorial = [];
    this.filtroEstadoHistorial = 'TODOS';
    this.filtroTextoHistorial = '';
    this.filtroHistorialDesde = '';
    this.filtroHistorialHasta = '';
    this.paginaHistorial = 1;
    this.filtroUnidadesPanelAbierto = false;
    this.filtroTipoEmergenciaPanelAbierto = false;
  }

  exportarHistorialExcel(): void {
    const filas = this.historialFiltrado();
    if (filas.length === 0) return;
    const columnas = ['Fecha', 'Unidad', 'Estado', 'Inspector', 'OBAC', 'Guardia', 'Cumplimiento', 'Obs.'];
    const body: string[][] = filas.map((h) => [
      `${this.fechaHora(h.fecha).fecha} ${this.fechaHora(h.fecha).hora}`,
      h.unidad,
      this.etiquetaEstadoHistorial(h),
      h.inspector ?? '',
      h.cuartelero?.nombre ?? '',
      String(h.grupoGuardia ?? ''),
      `${h.itemsOk ?? 0}/${h.totalItems ?? 0}`,
      (h.observaciones ?? '').slice(0, 500),
    ]);
    const aoa = [['SIDEP · Historial checklist unidades'], [`Registros: ${filas.length}`], [], columnas, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `SIDEP-historial-checklist-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  exportarHistorialPdf(): void {
    const historial = this.historialFiltrado();
    if (historial.length === 0) {
      return;
    }
    const n = this.filtroUnidadesHistorial.length;
    const u0 = n === 1 ? this.filtroUnidadesHistorial[0]! : '';
    this.pdfExport.exportarHistorialChecklistUnidad({
      unidad: n === 1 ? u0 : 'GENERAL',
      nombreUnidad:
        n === 1 ? this.unidades.find((u) => u.unidad === u0)?.nombre ?? 'Unidad' : 'Historial general de unidades',
      registros: historial,
    });
  }

  actualizarHistorial(): void {
    this.cargarHistorialGeneral();
    this.paginaHistorial = 1;
    this.filtroUnidadesPanelAbierto = false;
    this.filtroTipoEmergenciaPanelAbierto = false;
  }

  verRegistroHistorial(h: ChecklistRegistroDto & { unidad: string; nombreUnidad: string }): void {
    this.historialDetalle = h;
  }

  cerrarDetalleHistorial(): void {
    this.historialDetalle = null;
  }

  editarRegistroHistorial(h: ChecklistRegistroDto & { unidad: string; nombreUnidad: string }): void {
    void this.router.navigate(['/checklist', h.unidad]);
  }

  descargarRegistroHistorialPdf(h: ChecklistRegistroDto & { unidad: string; nombreUnidad: string }): void {
    this.pdfExport.exportarRegistroChecklistHistorial({
      unidad: h.unidad,
      nombreUnidad: h.nombreUnidad,
      registro: h,
    });
  }

  etiquetaEstadoHistorial(
    registro: ChecklistRegistroDto & { unidad: string; nombreUnidad: string },
  ): string {
    return etiquetaEstadoChecklist(this.estadoHistorialFila(registro));
  }

  detalleUbicacionesHistorial(registro: ChecklistRegistroDto): Array<{
    nombre: string;
    materiales: Array<{ nombre: string; cantidadRequerida: number; cantidadActual: number }>;
  }> {
    const d = registro.detalle;
    if (!Array.isArray(d)) return [];
    return (d as Array<Record<string, unknown>>).map((u) => ({
      nombre: String(u['nombre'] ?? '—'),
      materiales: Array.isArray(u['materiales'])
        ? (u['materiales'] as Array<Record<string, unknown>>).map((m) => ({
            nombre: String(m['nombre'] ?? '—'),
            cantidadRequerida: Number(m['cantidadRequerida'] ?? 0),
            cantidadActual: Number(m['cantidadActual'] ?? 0),
          }))
        : [],
    }));
  }

  cerrarDetalleBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.cerrarDetalleHistorial();
  }
}
