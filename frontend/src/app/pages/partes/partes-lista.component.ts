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
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { mensajeApiError } from '../../utils/api-error.util';
import { CatalogoTiposEmergenciaService } from '../../services/catalogo-tipos-emergencia.service';
import { CarrosService } from '../../services/carros.service';
import type { CarroDto } from '../../models/carro.dto';
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
    SidEmptyStateComponent,
    SidDateInputComponent,
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
  readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);
  private readonly carrosApi = inject(CarrosService);

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
  /** Códigos de catálogo seleccionados; vacío = todos los tipos. */
  filtroTipos: string[] = [];
  /** Reemplazo del select nativo: lista siempre debajo del control y scrollbar oscura. */
  filtroTipoPanelAbierto = false;
  /** IDs de carro; vacío = todas las unidades. */
  filtroCarroIds: number[] = [];
  filtroCarrosPanelAbierto = false;
  /** Lista para el panel de filtros (orden estable). */
  carrosLista: CarroDto[] = [];
  filtroFecha = '';
  filtroPeriodo: PartesPeriodoFilter = 'todos';
  fechaFiltroError: string | null = null;
  /** Rango explícito (YYYY-MM-DD); si hay valor, tiene prioridad sobre fecha rápida + período. */
  filtroRangoDesde = '';
  filtroRangoHasta = '';
  /** Vacío = todos los estados. */
  filtroEstadoParte: '' | 'BORRADOR' | 'PENDIENTE' | 'COMPLETADO' = '';
  filtroPersonaObac = '';

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
  private filtrosReloadTimer: ReturnType<typeof setTimeout> | null = null;
  /** Acumula clics rápidos en período/tipo/unidades antes de URL + API (menos tirones). */
  private readonly filtrosReloadMs = 520;
  /** Evita parpadeo del estado "actualizando" si la API responde en milisegundos. */
  private readonly actualizandoTablaDelayMs = 140;
  private actualizandoTablaDelayTimer: ReturnType<typeof setTimeout> | null = null;
  /** Descarta respuestas HTTP obsoletas si el usuario cambia filtros rápido. */
  private tablaLoadGen = 0;
  private prefetchSiguiente: { clave: string; resp: PartesPaginaResp } | null = null;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.cancelarRecargaFiltrosPendiente();
      this.limpiarTimerOverlayTabla();
    });
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
      carros: this.carrosApi.listar(),
    }).subscribe({
      next: ({ metricas, pagina, carros }) => {
        this.metricas = metricas;
        this.carrosLista = carros
          .slice()
          .sort((a, b) => a.nomenclatura.localeCompare(b.nomenclatura, 'es'));
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
        this.filtroTipoPanelAbierto = false;
        this.filtroCarrosPanelAbierto = false;
        this.filtroDireccionDraft = this.filtroDireccion;
        this.actualizarErroresFecha();
        if (!this.loading) this.recargarTablaInner(true);
      });
  }

  etiquetaClave(clave: string): string {
    return this.catalogoEmergencias.etiqueta(clave);
  }

  textoEtiquetaTipoOpcion(c: { value: string; label?: string | null }): string {
    const s = (c.label ?? '').trim();
    if (s) return s;
    return this.catalogoEmergencias.etiqueta(c.value);
  }

  textoCarroLinea(cr: CarroDto): string {
    const n = (cr.nomenclatura ?? '').trim();
    if (n) return n;
    const nombre = (cr.nombre ?? '').trim();
    if (nombre) return nombre;
    return `Unidad ${cr.id}`;
  }

  etiquetaFiltroTipoActual(): string {
    const n = this.filtroTipos.length;
    if (n === 0) {
      return 'Todos los tipos';
    }
    if (n === 1) {
      return this.etiquetaClave(this.filtroTipos[0]!);
    }
    return `${n} tipos seleccionados`;
  }

  etiquetaFiltroCarrosActual(): string {
    const n = this.filtroCarroIds.length;
    if (n === 0) {
      return 'Todas las unidades';
    }
    if (n === 1) {
      const id = this.filtroCarroIds[0]!;
      const c = this.carrosLista.find((x) => x.id === id);
      return c?.nomenclatura ?? `Unidad ${id}`;
    }
    return `${n} unidades seleccionadas`;
  }

  toggleFiltroTipoPanel(ev: MouseEvent): void {
    ev.stopPropagation();
    this.filtroTipoPanelAbierto = !this.filtroTipoPanelAbierto;
    if (this.filtroTipoPanelAbierto) {
      this.filtroCarrosPanelAbierto = false;
    }
  }

  toggleFiltroCarrosPanel(ev: MouseEvent): void {
    ev.stopPropagation();
    this.filtroCarrosPanelAbierto = !this.filtroCarrosPanelAbierto;
    if (this.filtroCarrosPanelAbierto) {
      this.filtroTipoPanelAbierto = false;
    }
  }

  tipoFiltroSeleccionado(valor: string): boolean {
    return this.filtroTipos.includes(valor);
  }

  toggleSeleccionTipo(valor: string, ev?: MouseEvent): void {
    ev?.stopPropagation();
    if (valor === 'todos') {
      if (this.filtroTipos.length === 0) return;
      this.filtroTipos = [];
    } else {
      const i = this.filtroTipos.indexOf(valor);
      if (i >= 0) {
        this.filtroTipos = this.filtroTipos.filter((_, j) => j !== i);
      } else {
        this.filtroTipos = [...this.filtroTipos, valor];
      }
    }
    this.programarRecargaFiltros();
  }

  carroFiltroSeleccionado(id: number): boolean {
    return this.filtroCarroIds.includes(id);
  }

  toggleSeleccionCarro(id: number, ev?: MouseEvent): void {
    ev?.stopPropagation();
    const i = this.filtroCarroIds.indexOf(id);
    if (i >= 0) {
      this.filtroCarroIds = this.filtroCarroIds.filter((_, j) => j !== i);
    } else {
      this.filtroCarroIds = [...this.filtroCarroIds, id];
    }
    this.programarRecargaFiltros();
  }

  limpiarSeleccionTipos(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.filtroTipos.length === 0) return;
    this.filtroTipos = [];
    this.programarRecargaFiltros();
  }

  limpiarSeleccionCarros(ev: MouseEvent): void {
    ev.stopPropagation();
    if (this.filtroCarroIds.length === 0) return;
    this.filtroCarroIds = [];
    this.programarRecargaFiltros();
  }

  @HostListener('document:click', ['$event'])
  cerrarFiltroTipoPanelSiClickFuera(ev: MouseEvent): void {
    const t = ev.target;
    if (!(t instanceof Node)) return;
    const wrapTipo = document.getElementById('partes-filtro-tipo-wrap');
    const wrapCarros = document.getElementById('partes-filtro-carros-wrap');
    if (this.filtroTipoPanelAbierto && !wrapTipo?.contains(t)) {
      this.filtroTipoPanelAbierto = false;
    }
    if (this.filtroCarrosPanelAbierto && !wrapCarros?.contains(t)) {
      this.filtroCarrosPanelAbierto = false;
    }
  }

  /** Firma estable para ignorar emits redundantes del router. */
  private firmaQueriesDesdeEstado(): string {
    return JSON.stringify({
      tipos: [...this.filtroTipos].sort().join(','),
      carros: [...this.filtroCarroIds].sort((a, b) => a - b).join(','),
      q: this.filtroDireccion.trim(),
      fd: this.filtroRangoDesde.trim(),
      fh: this.filtroRangoHasta.trim(),
      f: this.filtroFecha.trim(),
      p: this.filtroPeriodo,
      est: this.filtroEstadoParte,
      pers: this.filtroPersonaObac.trim(),
      n: this.paginaPartes,
    });
  }

  private firmaQueriesDesdeParamMap(pm: ParamMap): string {
    const pg = pm.get('page');
    const pi = pg != null ? parseInt(pg, 10) : 1;
    const pn = Number.isFinite(pi) && pi >= 1 ? pi : 1;
    return JSON.stringify({
      tipos: this.normalizarTiposCsvDesdeParamMap(pm),
      carros: this.normalizarCarrosCsvDesdeParamMap(pm),
      q: (pm.get('q') ?? '').trim(),
      fd: (pm.get('fd') ?? '').trim(),
      fh: (pm.get('fh') ?? '').trim(),
      f: (pm.get('fecha') ?? '').trim(),
      p: parsePeriodoQuery(pm.get('periodo')),
      est: pm.get('estado') ?? '',
      pers: (pm.get('persona') ?? '').trim(),
      n: pn,
    });
  }

  /** Coincide con `filtroTipos` serializado. */
  private normalizarTiposCsvDesdeParamMap(pm: ParamMap): string {
    const csv = pm.get('tipos')?.trim();
    if (csv) {
      return [...new Set(csv.split(',').map((s) => s.trim()).filter(Boolean))].sort().join(',');
    }
    const legacy = pm.get('tipo');
    if (legacy && legacy !== 'todos') return legacy;
    return '';
  }

  private normalizarCarrosCsvDesdeParamMap(pm: ParamMap): string {
    const csv = pm.get('carros')?.trim();
    if (!csv) return '';
    const nums = csv
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    return [...new Set(nums)].sort((a, b) => a - b).join(',');
  }

  private hidratarDesdeParams(pm: ParamMap): void {
    const tiposCsv = pm.get('tipos')?.trim();
    if (tiposCsv) {
      this.filtroTipos = [...new Set(tiposCsv.split(',').map((s) => s.trim()).filter(Boolean))].sort();
    } else {
      const legacy = pm.get('tipo');
      this.filtroTipos = legacy && legacy !== 'todos' ? [legacy] : [];
    }
    const carCsv = pm.get('carros')?.trim();
    if (carCsv) {
      const nums = carCsv
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      this.filtroCarroIds = [...new Set(nums)].sort((a, b) => a - b);
    } else {
      this.filtroCarroIds = [];
    }
    this.filtroDireccion = (pm.get('q') ?? '').trim();
    this.filtroRangoDesde = (pm.get('fd') ?? '').trim();
    this.filtroRangoHasta = (pm.get('fh') ?? '').trim();
    this.filtroFecha = pm.get('fecha') ?? '';
    this.filtroPeriodo = parsePeriodoQuery(pm.get('periodo'));
    const est = pm.get('estado');
    this.filtroEstadoParte =
      est === 'BORRADOR' || est === 'PENDIENTE' || est === 'COMPLETADO' ? est : '';
    this.filtroPersonaObac = (pm.get('persona') ?? '').trim();
    const pg = pm.get('page');
    const pi = pg != null ? parseInt(pg, 10) : 1;
    this.paginaPartes = Number.isFinite(pi) && pi >= 1 ? pi : 1;
  }

  private construirParamsQueryParaRouter(): Record<string, string | number> {
    const qp: Record<string, string | number> = {};
    if (this.filtroTipos.length > 0) {
      qp['tipos'] = [...this.filtroTipos].sort().join(',');
    }
    if (this.filtroCarroIds.length > 0) {
      qp['carros'] = [...this.filtroCarroIds].sort((a, b) => a - b).join(',');
    }
    const q = this.filtroDireccion.trim();
    if (q) qp['q'] = q;
    const frd = this.filtroRangoDesde.trim();
    const frh = this.filtroRangoHasta.trim();
    if (frd) qp['fd'] = frd;
    if (frh) qp['fh'] = frh;
    const fd = this.filtroFecha.trim();
    if (fd) qp['fecha'] = fd;
    if (this.filtroPeriodo !== 'todos') qp['periodo'] = this.filtroPeriodo;
    if (this.filtroEstadoParte) qp['estado'] = this.filtroEstadoParte;
    const pers = this.filtroPersonaObac.trim();
    if (pers) qp['persona'] = pers;
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

  private rangoFechasParaApi(): { desde?: string; hasta?: string } {
    const a = this.filtroRangoDesde.trim();
    const b = this.filtroRangoHasta.trim();
    if (a || b) {
      const o: { desde?: string; hasta?: string } = {};
      if (a) {
        const d = new Date(`${a}T00:00:00`);
        if (!Number.isNaN(d.getTime())) o.desde = d.toISOString();
      }
      if (b) {
        const d = new Date(`${b}T23:59:59.999`);
        if (!Number.isNaN(d.getTime())) o.hasta = d.toISOString();
      }
      return o;
    }
    return rangoIsoListadoPartes({
      filtroFechaTrim: this.filtroFecha.trim(),
      filtroPeriodo: this.filtroPeriodo,
    });
  }

  private filtrosApi(): {
    tipos?: string;
    carros?: string;
    q?: string;
    desde?: string;
    hasta?: string;
    estado?: string;
    persona?: string;
  } {
    const o: {
      tipos?: string;
      carros?: string;
      q?: string;
      desde?: string;
      hasta?: string;
      estado?: string;
      persona?: string;
    } = {};
    if (this.filtroTipos.length > 0) {
      o.tipos = [...this.filtroTipos].sort().join(',');
    }
    if (this.filtroCarroIds.length > 0) {
      o.carros = [...this.filtroCarroIds].sort((a, b) => a - b).join(',');
    }
    const qApi = this.filtroDireccion.trim();
    if (qApi) {
      o.q = qApi;
    }
    const r = this.rangoFechasParaApi();
    if (r.desde) o.desde = r.desde;
    if (r.hasta) o.hasta = r.hasta;
    if (this.filtroEstadoParte) o.estado = this.filtroEstadoParte;
    const pers = this.filtroPersonaObac.trim();
    if (pers) o.persona = pers;
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
  private limpiarTimerOverlayTabla(): void {
    if (this.actualizandoTablaDelayTimer) {
      clearTimeout(this.actualizandoTablaDelayTimer);
      this.actualizandoTablaDelayTimer = null;
    }
  }

  private recargarTablaInner(showOverlay: boolean): void {
    const gen = ++this.tablaLoadGen;
    this.prefetchSiguiente = null;
    this.limpiarTimerOverlayTabla();
    this.actualizandoTabla = false;
    if (showOverlay && !this.loading) {
      this.actualizandoTablaDelayTimer = setTimeout(() => {
        this.actualizandoTablaDelayTimer = null;
        if (gen !== this.tablaLoadGen) return;
        this.actualizandoTabla = true;
      }, this.actualizandoTablaDelayMs);
    }
    this.partesApi
      .listarPagina({
        page: this.paginaPartes,
        pageSize: this.tamanioPaginaPartes,
        ...this.filtrosApi(),
      })
      .subscribe({
        next: (pagina) => {
          if (gen !== this.tablaLoadGen) {
            return;
          }
          this.limpiarTimerOverlayTabla();
          this.actualizandoTabla = false;
          this.aplicarRespuestaPagina(pagina);
          this.error = null;
          this.tryPrefetchPaginaSiguiente();
        },
        error: (err) => {
          if (gen !== this.tablaLoadGen) {
            return;
          }
          this.limpiarTimerOverlayTabla();
          this.actualizandoTabla = false;
          this.error = mensajeApiError(err, 'No se pudo actualizar el listado.');
        },
      });
  }

  /** Debounce corto para tipo, unidades, fecha y período rápido (evita tirones y peticiones obsoletas). */
  private programarRecargaFiltros(): void {
    this.actualizarErroresFecha();
    this.paginaPartes = 1;
    if (this.filtrosReloadTimer) clearTimeout(this.filtrosReloadTimer);
    this.filtrosReloadTimer = setTimeout(() => {
      this.filtrosReloadTimer = null;
      this.persistirFiltrosEnUrl();
      this.recargarTablaInner(!this.loading);
    }, this.filtrosReloadMs);
  }

  private cancelarRecargaFiltrosPendiente(): void {
    if (this.filtrosReloadTimer) {
      clearTimeout(this.filtrosReloadTimer);
      this.filtrosReloadTimer = null;
    }
  }

  onFechaFiltroInput(): void {
    this.programarRecargaFiltros();
  }

  setPeriodo(p: PartesPeriodoFilter): void {
    this.filtroPeriodo = p;
    this.programarRecargaFiltros();
  }

  onRangoFiltroChange(): void {
    this.programarRecargaFiltros();
  }

  onEstadoParteChange(): void {
    this.programarRecargaFiltros();
  }

  onPersonaObacInput(): void {
    this.programarRecargaFiltros();
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
    this.cancelarRecargaFiltrosPendiente();
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
    this.cancelarRecargaFiltrosPendiente();
    this.filtroTipoPanelAbierto = false;
    this.filtroCarrosPanelAbierto = false;
    this.filtroTipos = [];
    this.filtroCarroIds = [];
    this.filtroDireccion = '';
    this.filtroDireccionDraft = '';
    this.filtroFecha = '';
    this.filtroPeriodo = 'todos';
    this.filtroRangoDesde = '';
    this.filtroRangoHasta = '';
    this.filtroEstadoParte = '';
    this.filtroPersonaObac = '';
    this.fechaFiltroError = null;
    this.paginaPartes = 1;
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  hayFiltrosActivos(): boolean {
    return (
      this.filtroTipos.length > 0 ||
      this.filtroCarroIds.length > 0 ||
      this.filtroDireccion.trim().length > 0 ||
      this.filtroFecha.trim().length > 0 ||
      this.filtroRangoDesde.trim().length > 0 ||
      this.filtroRangoHasta.trim().length > 0 ||
      this.filtroEstadoParte !== '' ||
      this.filtroPersonaObac.trim().length > 0 ||
      this.filtroPeriodo !== 'todos' ||
      this.paginaPartes > 1
    );
  }

  aplicarFiltrosPartes(): void {
    this.cancelarRecargaFiltrosPendiente();
    this.paginaPartes = 1;
    this.actualizarErroresFecha();
    this.persistirFiltrosEnUrl();
    this.recargarTablaInner(!this.loading);
  }

  actualizarListadoPartes(): void {
    this.recargarTablaInner(!this.loading);
  }

  totalPaginasPartes(): number {
    return this.totalPagesPartes;
  }

  filtradosPaginados(): ParteEmergenciaDto[] {
    return this.partes;
  }

  cambiarPaginaPartes(delta: number): void {
    if (this.actualizandoTabla) return;
    this.cancelarRecargaFiltrosPendiente();
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

  exportarPdf(): void {
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
              `Se exportan ${pagina.items.length} de ${this.totalFiltrado} registros (máx. ${cap} por archivo PDF).`,
            );
          }
          this.exportador.exportarPdfListado(pagina.items);
        },
        error: (err) => {
          this.toast.error(mensajeApiError(err, 'No se pudo preparar el PDF.'));
        },
      });
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
    if (this.filtroTipoPanelAbierto) {
      this.filtroTipoPanelAbierto = false;
      return;
    }
    if (this.filtroCarrosPanelAbierto) {
      this.filtroCarrosPanelAbierto = false;
      return;
    }
    if (this.vistaModalAbierta) {
      this.cerrarVistaModal();
    }
  }
}
