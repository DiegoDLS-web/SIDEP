import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type {
  BolsoTraumaHistorialDto,
  BolsoTraumaRegistroDto,
  BolsoTraumaSelectorUnidadDto,
} from '../../models/bolso-trauma.dto';
import { BolsosTraumaService } from '../../services/bolsos-trauma.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { etiquetaEstadoChecklist } from '../../utils/checklist-estado';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { etiquetaCompletandoOCompletado } from '../../utils/etiqueta-completitud';
import { CatalogoTiposEmergenciaService } from '../../services/catalogo-tipos-emergencia.service';
import { historialCoincideSeleccionTipoEmergencia } from '../../utils/tipo-emergencia-modulo-match';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-bolso-trauma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidEmptyStateComponent, SidDateInputComponent],
  templateUrl: './bolso-trauma.component.html',
})
export class BolsoTraumaComponent implements OnInit {
  private readonly bolsosApi = inject(BolsosTraumaService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly router = inject(Router);
  readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);

  private readonly imagenFallbackCarro =
    'https://images.unsplash.com/photo-1588662880295-13d2b28127c6?w=1080&q=80&fm=jpg';

  private readonly imagenLocalPorNomenclatura: Record<string, string> = {
    'B-1': 'assets/carros/b1.png',
    'BX-1': 'assets/carros/bx1.png',
    'R-1': 'assets/carros/r1.png',
  };

  /** Foto del carro en la cabecera de cada unidad (misma convención que ERA / flota). */
  imagenCabeceraUnidad(nomenclatura: string): string {
    const key = (nomenclatura ?? '').trim();
    return this.imagenLocalPorNomenclatura[key] ?? this.imagenFallbackCarro;
  }

  unidades: BolsoTraumaSelectorUnidadDto[] = [];
  historial: BolsoTraumaHistorialDto[] = [];
  loading = true;
  error: string | null = null;
  historialError: string | null = null;
  loadingHistorial = true;
  /** Nomenclaturas; vacío = todas. */
  filtroUnidadesBolso: string[] = [];
  filtroUnidadesBolsoPanelAbierto = false;
  filtroTiposEmergenciaBolso: string[] = [];
  filtroTipoBolsoPanelAbierto = false;
  filtroDesde = '';
  filtroHasta = '';
  /** Filtro local sobre el resultado cargado (no requiere nueva petición). */
  filtroEstado: 'TODOS' | 'COMPLETADO' | 'PENDIENTE' | 'CON_OBSERVACION' = 'TODOS';
  filtroInspectorObac = '';

  detalleRegistro: BolsoTraumaRegistroDto | null = null;
  loadingDetalle = false;
  descargandoRegistroId: number | null = null;
  paginaHistorial = 1;
  readonly tamanioPaginaHistorial = 10;

  ngOnInit(): void {
    this.bolsosApi.selector().subscribe({
      next: (data) => {
        this.unidades = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el control de bolsos de trauma.';
        this.loading = false;
      },
    });

    this.cargarHistorial();
  }

  fechaHora(iso: string | null | undefined): { fecha: string; hora: string } {
    return splitFechaHoraEsCl(iso);
  }

  promedioCompletitud(unidad: BolsoTraumaSelectorUnidadDto): number {
    if (unidad.bolsos.length === 0) return 0;
    const sum = unidad.bolsos.reduce((acc, b) => acc + b.completitud, 0);
    return Math.round(sum / unidad.bolsos.length);
  }

  etiquetaCompletitudGeneral(unidad: BolsoTraumaSelectorUnidadDto): string {
    return etiquetaCompletandoOCompletado(this.promedioCompletitud(unidad));
  }

  totalItemsFaltantes(unidad: BolsoTraumaSelectorUnidadDto): number {
    return unidad.bolsos.reduce((acc, b) => acc + b.itemsFaltantes, 0);
  }

  stats() {
    const totalBolsos = this.unidades.reduce((acc, u) => acc + u.cantidadBolsos, 0);
    const completos = this.unidades.reduce(
      (acc, u) =>
        acc +
        u.bolsos.filter((b) => (b.estadoChecklist ? b.estadoChecklist === 'COMPLETADO' : b.status === 'complete'))
          .length,
      0,
    );
    return {
      totalBolsos,
      completos,
      incompletos: Math.max(totalBolsos - completos, 0),
    };
  }

  cargarHistorial(): void {
    this.loadingHistorial = true;
    this.historialError = null;
    this.bolsosApi
      .historial({
        unidades: this.filtroUnidadesBolso.length ? [...this.filtroUnidadesBolso].sort().join(',') : undefined,
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
      })
      .subscribe({
        next: (data) => {
          this.historial = data;
          this.paginaHistorial = 1;
          this.loadingHistorial = false;
        },
        error: () => {
          this.historialError = 'No se pudo cargar historial de registros.';
          this.loadingHistorial = false;
        },
      });
  }

  abrirDetalle(h: BolsoTraumaHistorialDto): void {
    this.detalleRegistro = null;
    this.loadingDetalle = true;
    this.bolsosApi.obtenerHistorialPorId(h.id).subscribe({
      next: (row) => {
        this.detalleRegistro = row;
        this.loadingDetalle = false;
      },
      error: () => {
        this.loadingDetalle = false;
        this.detalleRegistro = null;
      },
    });
  }

  editarRegistro(h: BolsoTraumaHistorialDto): void {
    void this.router.navigate(['/bolso-trauma', h.unidad], {
      queryParams: h.bolsoNumero ? { bolso: h.bolsoNumero } : {},
    });
  }

  descargarRegistroPdf(h: BolsoTraumaHistorialDto): void {
    this.descargandoRegistroId = h.id;
    this.bolsosApi.obtenerHistorialPorId(h.id).subscribe({
      next: (reg) => {
        const materiales = this.filasDetalleMateriales(reg).map((row) => ({
          ubicacion: row.ubicacion,
          material: row.nombre,
          requerida: row.opt,
          actual: row.act,
          estado: row.act >= row.min ? 'OK' : 'Falta',
        }));
        const unidad = reg.carro.nomenclatura || h.unidad;
        this.pdfExport.exportarChecklistUnidad({
          unidad,
          inspector: reg.inspector ?? '',
          grupoGuardia: reg.grupoGuardia ?? '',
          responsable: reg.cuartelero.nombre ?? h.responsable,
          firmaInspector: reg.firmaInspector ?? '',
          firmaOficial: reg.firmaOficial ?? '',
          fechaRegistro: reg.fecha,
          observaciones: reg.observaciones ?? '',
          totalItems: reg.totalItems ?? materiales.length,
          itemsOk: reg.itemsOk ?? materiales.filter((m) => m.estado === 'OK').length,
          materiales,
        });
        this.descargandoRegistroId = null;
      },
      error: () => {
        this.descargandoRegistroId = null;
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleRegistro = null;
  }

  etiquetaEstado(h: BolsoTraumaHistorialDto): string {
    if (h.estadoChecklist) return etiquetaEstadoChecklist(h.estadoChecklist);
    return h.borrador === true ? 'Borrador' : 'Cerrado';
  }

  claseEstado(h: BolsoTraumaHistorialDto): string {
    if (h.estadoChecklist === 'COMPLETADO') return 'sid-status-chip-ok';
    if (h.estadoChecklist === 'CON_OBSERVACION') return 'sid-status-chip-warn';
    return 'sid-status-chip-neutral';
  }

  exportarHistorialPdf(): void {
    const filas = this.historialFiltrado();
    if (filas.length === 0) {
      return;
    }
    this.pdfExport.exportarHistorialBolsoTrauma({ registros: filas });
  }

  historialFiltrado(): BolsoTraumaHistorialDto[] {
    const txt = this.filtroInspectorObac.trim().toLowerCase();
    return this.historial.filter((h) => {
      const estado = h.estadoChecklist ?? 'PENDIENTE';
      if (this.filtroEstado !== 'TODOS' && estado !== this.filtroEstado) return false;
      if (
        !historialCoincideSeleccionTipoEmergencia(h.tipo ?? 'TRAUMA', this.filtroTiposEmergenciaBolso)
      ) {
        return false;
      }
      if (!txt) {
        return true;
      }
      return (
        (h.inspector ?? '').toLowerCase().includes(txt) ||
        (h.responsable ?? '').toLowerCase().includes(txt)
      );
    });
  }

  etiquetaFiltroUnidadesBolso(): string {
    const n = this.filtroUnidadesBolso.length;
    if (n === 0) return 'Todas las unidades';
    if (n === 1) return this.filtroUnidadesBolso[0] ?? '1 unidad';
    return `${n} unidades seleccionadas`;
  }

  etiquetaFiltroTipoBolso(): string {
    const n = this.filtroTiposEmergenciaBolso.length;
    if (n === 0) return 'Todos los tipos';
    if (n === 1) return this.catalogoEmergencias.etiqueta(this.filtroTiposEmergenciaBolso[0]!);
    return `${n} tipos seleccionados`;
  }

  textoEtiquetaTipoOpcion(c: { value: string; label?: string | null }): string {
    const s = (c.label ?? '').trim();
    if (s) return s;
    return this.catalogoEmergencias.etiqueta(c.value);
  }

  toggleFiltroUnidadesBolsoPanel(ev: MouseEvent): void {
    ev.stopPropagation();
    this.filtroUnidadesBolsoPanelAbierto = !this.filtroUnidadesBolsoPanelAbierto;
    if (this.filtroUnidadesBolsoPanelAbierto) this.filtroTipoBolsoPanelAbierto = false;
  }

  toggleFiltroTipoBolsoPanel(ev: MouseEvent): void {
    ev.stopPropagation();
    this.filtroTipoBolsoPanelAbierto = !this.filtroTipoBolsoPanelAbierto;
    if (this.filtroTipoBolsoPanelAbierto) this.filtroUnidadesBolsoPanelAbierto = false;
  }

  unidadBolsoSeleccionada(nom: string): boolean {
    return this.filtroUnidadesBolso.includes(nom);
  }

  toggleUnidadBolso(nom: string, ev?: MouseEvent): void {
    ev?.stopPropagation();
    const i = this.filtroUnidadesBolso.indexOf(nom);
    if (i >= 0) {
      this.filtroUnidadesBolso = this.filtroUnidadesBolso.filter((_, j) => j !== i);
    } else {
      this.filtroUnidadesBolso = [...this.filtroUnidadesBolso, nom];
    }
    this.paginaHistorial = 1;
  }

  limpiarUnidadesBolso(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.filtroUnidadesBolso.length === 0) return;
    this.filtroUnidadesBolso = [];
    this.paginaHistorial = 1;
  }

  tipoBolsoSeleccionado(valor: string): boolean {
    return this.filtroTiposEmergenciaBolso.includes(valor);
  }

  toggleTipoBolso(valor: string, ev?: MouseEvent): void {
    ev?.stopPropagation();
    const i = this.filtroTiposEmergenciaBolso.indexOf(valor);
    if (i >= 0) {
      this.filtroTiposEmergenciaBolso = this.filtroTiposEmergenciaBolso.filter((_, j) => j !== i);
    } else {
      this.filtroTiposEmergenciaBolso = [...this.filtroTiposEmergenciaBolso, valor];
    }
    this.paginaHistorial = 1;
  }

  limpiarTiposBolso(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.filtroTiposEmergenciaBolso.length === 0) return;
    this.filtroTiposEmergenciaBolso = [];
    this.paginaHistorial = 1;
  }

  @HostListener('document:click', ['$event'])
  cerrarPanelesBolso(ev: MouseEvent): void {
    const t = ev.target;
    if (!(t instanceof Node)) return;
    const wu = document.getElementById('bolso-hist-unidades-wrap');
    const wt = document.getElementById('bolso-hist-tipo-wrap');
    if (this.filtroUnidadesBolsoPanelAbierto && !wu?.contains(t)) {
      this.filtroUnidadesBolsoPanelAbierto = false;
    }
    if (this.filtroTipoBolsoPanelAbierto && !wt?.contains(t)) {
      this.filtroTipoBolsoPanelAbierto = false;
    }
  }

  aplicarFiltrosLocalesHistorial(): void {
    this.paginaHistorial = 1;
  }

  /** Recarga desde API con rango de fechas y unidades; filtros locales se aplican después. */
  aplicarFiltrosBolsoHistorial(): void {
    this.cargarHistorial();
  }

  limpiarFiltrosBolsoHistorial(): void {
    this.filtroUnidadesBolso = [];
    this.filtroTiposEmergenciaBolso = [];
    this.filtroDesde = '';
    this.filtroHasta = '';
    this.filtroEstado = 'TODOS';
    this.filtroInspectorObac = '';
    this.filtroUnidadesBolsoPanelAbierto = false;
    this.filtroTipoBolsoPanelAbierto = false;
    this.paginaHistorial = 1;
    this.cargarHistorial();
  }

  exportarHistorialExcelBolso(): void {
    const filas = this.historialFiltrado();
    if (filas.length === 0) return;
    const columnas = ['Fecha', 'Unidad', 'Bolso', 'Estado', 'Inspector', 'OBAC', 'Guardia', 'Cumplimiento'];
    const body = filas.map((h) => [
      `${this.fechaHora(h.fecha).fecha} ${this.fechaHora(h.fecha).hora}`,
      h.unidad,
      String(h.bolsoNumero ?? '—'),
      this.etiquetaEstado(h),
      h.inspector ?? '',
      h.responsable ?? '',
      String(h.grupoGuardia ?? ''),
      h.porcentaje != null ? `${h.itemsOk ?? 0}/${h.totalItems ?? 0}` : '—',
    ]);
    const aoa = [['SIDEP · Historial bolsos de trauma'], [`Registros: ${filas.length}`], [], columnas, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `SIDEP-historial-bolso-trauma-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  totalPaginasHistorial(): number {
    return Math.max(1, Math.ceil(this.historialFiltrado().length / this.tamanioPaginaHistorial));
  }

  historialPaginado(): BolsoTraumaHistorialDto[] {
    const filas = this.historialFiltrado();
    const inicio = (this.paginaHistorial - 1) * this.tamanioPaginaHistorial;
    return filas.slice(inicio, inicio + this.tamanioPaginaHistorial);
  }

  cambiarPaginaHistorial(delta: number): void {
    const next = this.paginaHistorial + delta;
    const total = this.totalPaginasHistorial();
    this.paginaHistorial = Math.min(Math.max(next, 1), total);
  }

  filasDetalleMateriales(reg: BolsoTraumaRegistroDto): { bolso: number; ubicacion: string; nombre: string; min: number; opt: number; act: number }[] {
    const det = reg.detalle as {
      bolsos?: Array<{
        numero?: number;
        ubicaciones?: Array<{ nombre: string; materiales?: Array<{ nombre?: string; cantidadMinima?: number; cantidadOptima?: number; cantidadActual?: number }> }>;
      }>;
    } | null;
    const bolsos = det?.bolsos ?? [];
    const out: { bolso: number; ubicacion: string; nombre: string; min: number; opt: number; act: number }[] = [];
    for (let bi = 0; bi < bolsos.length; bi++) {
      const b = bolsos[bi];
      const n = b.numero ?? bi + 1;
      for (const u of b.ubicaciones ?? []) {
        for (const m of u.materiales ?? []) {
          out.push({
            bolso: n,
            ubicacion: u.nombre,
            nombre: m.nombre ?? '—',
            min: m.cantidadMinima ?? 0,
            opt: m.cantidadOptima ?? 0,
            act: m.cantidadActual ?? 0,
          });
        }
      }
    }
    return out;
  }
}
