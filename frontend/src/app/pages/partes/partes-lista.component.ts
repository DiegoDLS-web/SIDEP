import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { forkJoin, skip, take } from 'rxjs';
import type { ParteEmergenciaDto } from '../../models/parte.dto';
import { PartesExportService } from '../../services/partes-export.service';
import type { PartesMetricasResp, PartesPaginaResp } from '../../services/partes.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { SidCardComponent } from '../../shared/sid-card.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { mensajeApiError } from '../../utils/api-error.util';
import { CLAVES_COMPANIA_SERVICIOS, CLAVES_OPERATIVAS, etiquetaClave } from './partes.constants';
import { mensajeErrorFechaParteSiHay, rangoIsoListadoPartes, type PartesPeriodoFilter } from './partes-filtros-fecha.util';
import { ParteVistaSoloLecturaComponent } from './parte-vista-solo-lectura.component';

function parsePeriodoQuery(v: string | null): PartesPeriodoFilter {
  if (v === 'hoy' || v === 'semana' || v === 'mes' || v === 'todos') {
    return v;
  }
  return 'todos';
}

@Component({
  selector: 'app-partes-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SidepIconsModule,
    ParteVistaSoloLecturaComponent,
    SidScrollRevealDirective,
    SidCardComponent,
    SidEmptyStateComponent,
  ],
  templateUrl: './partes-lista.component.html',
})
export class PartesListaComponent implements OnInit {
  private readonly partesApi = inject(PartesService);
  private readonly exportador = inject(PartesExportService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly clavesOperativasFiltro = CLAVES_OPERATIVAS;
  readonly clavesCompaniaFiltro = CLAVES_COMPANIA_SERVICIOS;

  partes: ParteEmergenciaDto[] = [];
  metricas: PartesMetricasResp | null = null;
  totalFiltrado = 0;
  totalPagesPartes = 1;
  loading = true;
  error: string | null = null;

  /** Borrador visible en el campo dirección (el API usa `filtroDireccion` tras debounce o blur). */
  filtroDireccionDraft = '';
  /** Valor aplicado contra el backend / URL `q`. */
  filtroDireccion = '';
  filtroTipo = 'todos';
  filtroFecha = '';
  filtroPeriodo: PartesPeriodoFilter = 'todos';
  fechaFiltroError: string | null = null;

  /** Listado refrescándose tras el primer pintado completo de la página. */
  actualizandoTabla = false;

  paginaPartes = 1;
  readonly tamanioPaginaPartes = 10;

  vistaModalAbierta = false;
  vistaModalCargando = false;
  vistaModalError: string | null = null;
  vistaModalParte: ParteEmergenciaDto | null = null;

  private lastQuerySig = '';
  private direccionCommitTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly direccionCommitMs = 350;
  private prefetchSiguiente: { clave: string; resp: PartesPaginaResp } | null = null;

  ngOnInit(): void {
    this.hidratarDesdeParams(this.route.snapshot.queryParamMap);
    this.filtroDireccionDraft = this.filtroDireccion;
    this.actualizarErroresFecha();
    this.lastQuerySig = this.firmaQueriesDesdeEstado();

    forkJoin({
      metricas: this.partesApi.metricas(),
      pagina: this.partesApi.listarPagina({
        page: this.paginaPartes,
        pageSize: this.tamanioPaginaPartes,
        ...this.filtrosApi(),
      }),
    }).subscribe({
      next: ({ metricas, pagina }) => {
        this.metricas = metricas;
        this.aplicarRespuestaPagina(pagina);
        this.loading = false;
        this.error = null;
        this.tryPrefetchPaginaSiguiente();
      },
      error: (err) => {
        this.loading = false;
        this.error = mensajeApiError(err, 'No se pudieron cargar los partes. Verifica la conexión o el backend.');
      },
    });

    this.route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((pm) => {
        const entrante = this.firmaQueriesDesdeParamMap(pm);
        if (entrante === this.lastQuerySig) return;
        this.lastQuerySig = entrante;
        this.hidratarDesdeParams(pm);
        this.filtroDireccionDraft = this.filtroDireccion;
        this.actualizarErroresFecha();
        if (!this.loading) this.recargarTablaInner(true);
      });
  }

  etiquetaClave = etiquetaClave;

  /** Firma estable para ignorar emits redundantes del router. */
  private firmaQueriesDesdeEstado(): string {
    return JSON.stringify({
      t: this.filtroTipo,
      q: this.filtroDireccion.trim(),
      f: this.filtroFecha.trim(),
      p: this.filtroPeriodo,
      n: this.paginaPartes,
    });
  }

  private firmaQueriesDesdeParamMap(pm: ParamMap): string {
    const pg = pm.get('page');
    const pi = pg != null ? parseInt(pg, 10) : 1;
    const pn = Number.isFinite(pi) && pi >= 1 ? pi : 1;
    return JSON.stringify({
      t: pm.get('tipo') ?? 'todos',
      q: (pm.get('q') ?? '').trim(),
      f: pm.get('fecha') ?? '',
      p: pm.get('periodo') ?? 'todos',
      n: pn,
    });
  }

  private hidratarDesdeParams(pm: ParamMap): void {
    this.filtroTipo = pm.get('tipo') ?? 'todos';
    this.filtroDireccion = (pm.get('q') ?? '').trim();
    this.filtroFecha = pm.get('fecha') ?? '';
    this.filtroPeriodo = parsePeriodoQuery(pm.get('periodo'));
    const pg = pm.get('page');
    const pi = pg != null ? parseInt(pg, 10) : 1;
    this.paginaPartes = Number.isFinite(pi) && pi >= 1 ? pi : 1;
  }

  private construirParamsQueryParaRouter(): Record<string, string | number> {
    const qp: Record<string, string | number> = {};
    if (this.filtroTipo !== 'todos') qp['tipo'] = this.filtroTipo;
    const q = this.filtroDireccion.trim();
    if (q) qp['q'] = q;
    const fd = this.filtroFecha.trim();
    if (fd) qp['fecha'] = fd;
    if (this.filtroPeriodo !== 'todos') qp['periodo'] = this.filtroPeriodo;
    if (this.paginaPartes > 1) qp['page'] = this.paginaPartes;
    return qp;
  }

  private persistirFiltrosEnUrl(): void {
    const nextSig = this.firmaQueriesDesdeEstado();
    if (nextSig === this.lastQuerySig) return;
    this.lastQuerySig = nextSig;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.construirParamsQueryParaRouter(),
      replaceUrl: true,
    });
  }

  private filtrosApi(): { tipo?: string; q?: string; desde?: string; hasta?: string } {
    const o: { tipo?: string; q?: string; desde?: string; hasta?: string } = {};
    if (this.filtroTipo !== 'todos') {
      o.tipo = this.filtroTipo;
    }
    const qApi = this.filtroDireccion.trim();
    if (qApi) {
      o.q = qApi;
    }
    const r = rangoIsoListadoPartes({
      filtroFechaTrim: this.filtroFecha.trim(),
      filtroPeriodo: this.filtroPeriodo,
    });
    if (r.desde) {
      o.desde = r.desde;
    }
    if (r.hasta) {
      o.hasta = r.hasta;
    }
    return o;
  }

  actualizarErroresFecha(): void {
    this.fechaFiltroError = mensajeErrorFechaParteSiHay(this.filtroFecha);
  }

  private aplicarRespuestaPagina(p: PartesPaginaResp): void {
    this.partes = p.items;
    this.totalFiltrado = p.total;
    this.totalPagesPartes = p.totalPages;
    this.paginaPartes = p.page;
  }

  private prefetchKeyParaPagina(page: number): string {
    return JSON.stringify({
      page,
      ps: this.tamanioPaginaPartes,
      ...this.filtrosApi(),
    });
  }

  /** Precarga página siguiente cuando el navegador está idle. */
  private tryPrefetchPaginaSiguiente(): void {
    if (this.loading) return;
    const siguiente = this.paginaPartes + 1;
    if (siguiente > this.totalPaginasPartes()) return;
    const clave = this.prefetchKeyParaPagina(siguiente);
    const ejecutar = () => {
      this.partesApi
        .listarPagina({
          page: siguiente,
          pageSize: this.tamanioPaginaPartes,
          ...this.filtrosApi(),
        })
        .pipe(take(1))
        .subscribe({
          next: (pagina) => {
            if (this.paginaPartes + 1 !== siguiente) return;
            if (clave !== this.prefetchKeyParaPagina(siguiente)) return;
            this.prefetchSiguiente = { clave, resp: pagina };
          },
        });
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(ejecutar, { timeout: 1200 });
    } else {
      window.setTimeout(ejecutar, 280);
    }
  }

  /** Cambio desde debounce aplicado sobre dirección. */
  private recargarTablaInner(showOverlay: boolean): void {
    this.prefetchSiguiente = null;
    if (showOverlay && !this.loading) {
      this.actualizandoTabla = true;
    }
    this.partesApi
      .listarPagina({
        page: this.paginaPartes,
        pageSize: this.tamanioPaginaPartes,
        ...this.filtrosApi(),
      })
      .subscribe({
        next: (pagina) => {
          this.actualizandoTabla = false;
          this.aplicarRespuestaPagina(pagina);
          this.error = null;
          this.tryPrefetchPaginaSiguiente();
        },
        error: (err) => {
          this.actualizandoTabla = false;
          this.error = mensajeApiError(err, 'No se pudo actualizar el listado.');
        },
      });
  }

  /** Tipo de emergencia, fecha o período rápido. */
  alCambiarFiltroPartes(): void {
    this.actualizarErroresFecha();
    this.paginaPartes = 1;
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  onFechaFiltroInput(): void {
    this.actualizarErroresFecha();
    this.paginaPartes = 1;
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  setPeriodo(p: PartesPeriodoFilter): void {
    this.filtroPeriodo = p;
    this.alCambiarFiltroPartes();
  }

  onDireccionDraftChanged(): void {
    if (this.direccionCommitTimer) clearTimeout(this.direccionCommitTimer);
    this.direccionCommitTimer = setTimeout(() => {
      this.direccionCommitTimer = null;
      this.confirmarDireccionDesdeDraft(false);
    }, this.direccionCommitMs);
  }

  flushDireccionDraft(): void {
    if (this.direccionCommitTimer) {
      clearTimeout(this.direccionCommitTimer);
      this.direccionCommitTimer = null;
    }
    this.confirmarDireccionDesdeDraft(true);
  }

  /** @param desdeBlurOrEnter fuerza escritura si aún cambió el texto con espacios. */
  private confirmarDireccionDesdeDraft(_desdeInteraction: boolean): void {
    const next = this.filtroDireccionDraft.trim();
    if (next === this.filtroDireccion) return;
    this.filtroDireccion = next;
    this.paginaPartes = 1;
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  limpiarFiltros(): void {
    if (this.direccionCommitTimer) {
      clearTimeout(this.direccionCommitTimer);
      this.direccionCommitTimer = null;
    }
    this.filtroTipo = 'todos';
    this.filtroDireccion = '';
    this.filtroDireccionDraft = '';
    this.filtroFecha = '';
    this.filtroPeriodo = 'todos';
    this.fechaFiltroError = null;
    this.paginaPartes = 1;
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  hayFiltrosActivos(): boolean {
    return (
      this.filtroTipo !== 'todos' ||
      this.filtroDireccion.trim().length > 0 ||
      this.filtroFecha.trim().length > 0 ||
      this.filtroPeriodo !== 'todos' ||
      this.paginaPartes > 1
    );
  }

  totalPaginasPartes(): number {
    return this.totalPagesPartes;
  }

  filtradosPaginados(): ParteEmergenciaDto[] {
    return this.partes;
  }

  cambiarPaginaPartes(delta: number): void {
    if (this.actualizandoTabla) return;
    const total = this.totalPaginasPartes();
    const destino = Math.min(Math.max(this.paginaPartes + delta, 1), total);

    if (delta === 1) {
      const claveEsperada = this.prefetchKeyParaPagina(destino);
      if (this.prefetchSiguiente?.clave === claveEsperada) {
        const d = this.prefetchSiguiente.resp;
        this.prefetchSiguiente = null;
        this.aplicarRespuestaPagina(d);
        this.persistirFiltrosEnUrl();
        this.tryPrefetchPaginaSiguiente();
        return;
      }
    }

    this.prefetchSiguiente = null;
    this.paginaPartes = destino;
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  splitFechaHora(fechaIso: string): { fecha: string; hora: string } {
    return splitFechaHoraEsCl(fechaIso);
  }

  estadoClase(estado: string): string {
    const e = estado.toUpperCase();
    if (e === 'COMPLETADO') {
      return 'bg-green-600/20 text-green-400';
    }
    if (e === 'PENDIENTE') {
      return 'bg-yellow-600/20 text-yellow-400';
    }
    if (e === 'BORRADOR') {
      return 'bg-slate-600/30 text-slate-300';
    }
    return 'bg-gray-600/20 text-gray-300';
  }

  statsAnio(): number {
    return this.metricas?.enAnioActual ?? 0;
  }

  statsMes(): number {
    return this.metricas?.enMesActual ?? 0;
  }

  totalSistema(): number {
    return this.metricas?.totalSistema ?? 0;
  }

  exportarExcel(): void {
    const cap = 2000;
    const pageSize = Math.min(cap, Math.max(this.totalFiltrado, this.tamanioPaginaPartes));
    this.partesApi
      .listarPagina({
        page: 1,
        pageSize,
        ...this.filtrosApi(),
      })
      .subscribe({
        next: (pagina) => {
          if (this.totalFiltrado > pagina.items.length) {
            this.toast.info(
              `Se exportan ${pagina.items.length} de ${this.totalFiltrado} registros (máx. ${cap} por archivo).`,
            );
          }
          this.exportador.exportarExcelListado(pagina.items);
        },
        error: (err) => {
          this.toast.error(mensajeApiError(err, 'No se pudo preparar la exportación.'));
        },
      });
  }

  exportarPdfParte(parte: ParteEmergenciaDto): void {
    this.exportador.exportarPdf(parte);
  }

  abrirVistaSoloLectura(parte: ParteEmergenciaDto): void {
    this.vistaModalAbierta = true;
    this.vistaModalCargando = true;
    this.vistaModalError = null;
    this.vistaModalParte = null;
    this.partesApi.obtener(parte.id).subscribe({
      next: (p) => {
        this.vistaModalCargando = false;
        this.vistaModalParte = p;
      },
      error: (err) => {
        this.vistaModalCargando = false;
        this.vistaModalError = mensajeApiError(err, 'No se pudo cargar el parte completo.');
        this.toast.error('No se pudo cargar el parte.');
      },
    });
  }

  cerrarVistaModal(): void {
    this.vistaModalAbierta = false;
    this.vistaModalCargando = false;
    this.vistaModalError = null;
    this.vistaModalParte = null;
  }

  @HostListener('document:keydown.escape')
  onEscapeCerrarVistaModal(): void {
    if (this.vistaModalAbierta) {
      this.cerrarVistaModal();
    }
  }
}
