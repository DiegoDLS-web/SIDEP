import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import type { ChecklistRegistroDto, ChecklistResumenUnidadDto, EstadoChecklist } from '../../models/checklist.dto';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { calcularEstadoChecklist, etiquetaEstadoChecklist } from '../../utils/checklist-estado';

@Component({
  selector: 'app-checklist-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './checklist-selector.component.html',
})
export class ChecklistSelectorComponent implements OnInit {
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly router = inject(Router);

  unidades: ChecklistResumenUnidadDto[] = [];
  loading = true;
  error: string | null = null;
  historialLoading = false;
  /** Índice alineado con `unidades` (evita colisiones de clave en Object). */
  historialesPorUnidad: ChecklistRegistroDto[][] = [];
  filtroUnidadHistorial = 'TODAS';
  filtroEstadoHistorial = 'TODOS';
  filtroTextoHistorial = '';
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
        this.filtroUnidadHistorial === 'TODAS' || registro.unidad === this.filtroUnidadHistorial;
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
      return coincideUnidad && coincideEstado && coincideTexto;
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

  exportarHistorialPdf(): void {
    const historial = this.historialFiltrado();
    if (historial.length === 0) {
      return;
    }
    this.pdfExport.exportarHistorialChecklistUnidad({
      unidad: this.filtroUnidadHistorial === 'TODAS' ? 'GENERAL' : this.filtroUnidadHistorial,
      nombreUnidad:
        this.filtroUnidadHistorial === 'TODAS'
          ? 'Historial general de unidades'
          : this.unidades.find((u) => u.unidad === this.filtroUnidadHistorial)?.nombre ?? 'Unidad',
      registros: historial,
    });
  }

  actualizarHistorial(): void {
    this.cargarHistorialGeneral();
    this.paginaHistorial = 1;
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
