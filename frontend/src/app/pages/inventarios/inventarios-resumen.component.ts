import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, forkJoin, Subject } from 'rxjs';
import type {
  AlertaInventarioDto,
  BodegaDto,
  EppAsignadoUsuarioDto,
  FilaMatrizEppDto,
  InventarioItemDto,
  InventarioMetricasDto,
  InventarioMovimientoItemDto,
  TipoMovimientoInventario,
} from '../../models/inventarios.dto';
import {
  CATEGORIAS_INVENTARIO,
  ESTADOS_FISICOS_INVENTARIO,
  TALLAS_BOTA,
  TALLAS_ROPA,
  TIPOS_INVENTARIO_PLANILLA,
} from '../../models/inventarios.dto';
import { InventariosService } from '../../services/inventarios.service';
import { IaService } from '../../services/ia.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import { descargarDesdeApi, queryString } from '../../utils/server-download.util';
import { filtrarUsuariosOperativos } from '../../utils/usuario-operativo.util';
import type { UsuarioSelectorDto } from '../../models/usuario.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidPaginationFooterComponent } from '../../shared/sid-pagination-footer.component';

@Component({
  selector: 'app-inventarios-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SidEmptyStateComponent, SidPaginationFooterComponent],
  templateUrl: './inventarios-resumen.component.html',
})
export class InventariosResumenComponent implements OnInit {
  private readonly api = inject(InventariosService);
  private readonly iaApi = inject(IaService);
  private readonly usuarios = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly buscar$ = new Subject<void>();

  iaTexto = '';
  iaCargando = false;
  iaResultado = '';

  loading = true;
  exportandoDescarga: string | null = null;
  guardandoMovimiento = false;
  error: string | null = null;

  items: InventarioItemDto[] = [];
  movimientos: InventarioMovimientoItemDto[] = [];
  metricas: InventarioMetricasDto | null = null;
  bodegasCatalogo: BodegaDto[] = [];
  total = 0;
  page = 1;
  pageSize = 50;
  totalPaginas = 1;

  busqueda = '';
  filtroVoluntario = '';
  bodegaActiva = 'TODAS';
  categoriaActiva = 'TODAS';
  vistaModo: 'lista' | 'matriz' = 'lista';

  alertas: AlertaInventarioDto[] = [];
  alertasExpandidas = false;
  panelExportAbierto = false;
  panelImportAbierto = false;
  importandoExcel = false;
  archivoImportSeleccionado: File | null = null;
  permitirImportDuplicados = false;
  estadoImport: { total: number; importado: boolean } | null = null;
  mostrarRegistrarMaterial = false;
  guardandoMaterial = false;
  pasoRegistrarMaterial = 1;
  formMaterial = this.formMaterialVacio();
  matrizEpp: FilaMatrizEppDto[] = [];
  eppVoluntario: EppAsignadoUsuarioDto[] = [];
  cargandoMatriz = false;

  readonly categorias = ['TODAS', ...CATEGORIAS_INVENTARIO];
  readonly tiposInventario = [...TIPOS_INVENTARIO_PLANILLA];
  readonly estadosFisicos = [...ESTADOS_FISICOS_INVENTARIO];
  readonly tallasBota = TALLAS_BOTA;
  readonly tallasRopa = TALLAS_ROPA;

  voluntarios: UsuarioSelectorDto[] = [];
  asignandoItemId: number | null = null;
  rutAsignacion = '';

  movItemId = 0;
  movTipo: TipoMovimientoInventario = 'ENTRADA';
  movCantidad = 1;
  movMotivo = '';
  /** Ítems de la bodega para el formulario de movimiento (independiente de paginación/matríz). */
  itemsParaMovimiento: InventarioItemDto[] = [];
  cargandoItemsMovimiento = false;

  get bodegasSelector(): Array<{ codigo: string; nombre: string }> {
    return [
      { codigo: 'TODAS', nombre: 'Todas las bodegas' },
      ...this.bodegasCatalogo.map((b) => ({ codigo: b.codigo, nombre: b.nombre })),
    ];
  }

  get bodegaNombreActiva(): string {
    return this.bodegasSelector.find((b) => b.codigo === this.bodegaActiva)?.nombre ?? 'Bodega';
  }

  get itemsBodegaActual(): InventarioItemDto[] {
    return this.itemsParaMovimiento.length ? this.itemsParaMovimiento : this.items;
  }

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.trim().toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  get esBodegaEpp(): boolean {
    return this.bodegaActiva === 'UNIFORMES' || this.categoriaActiva === 'Uniformes';
  }

  get mostrarMatriz(): boolean {
    return this.vistaModo === 'matriz' && this.esBodegaEpp;
  }

  get mostrarColumnaBodega(): boolean {
    return this.bodegaActiva === 'TODAS';
  }

  get tallasMatrizCabecera(): string[] {
    return this.matrizEpp[0]?.tallas ?? [];
  }

  get resumenAlertas(): { criticos: number; bajos: number; total: number } {
    const criticos = this.alertas.filter((a) => a.severidad === 'critico').length;
    const bajos = this.alertas.filter((a) => a.severidad === 'advertencia').length;
    return { criticos, bajos, total: this.alertas.length };
  }

  get alertasVisibles(): AlertaInventarioDto[] {
    return this.alertasExpandidas ? this.alertas : this.alertas.slice(0, 6);
  }

  irAlerta(a: AlertaInventarioDto): void {
    if (a.bodega) {
      const b = this.bodegasCatalogo.find((x) => x.nombre === a.bodega || x.codigo === a.bodega);
      if (b) this.setBodega(b.codigo);
    }
    this.busqueda = a.titulo.replace(/\s*\([^)]+\)\s*$/, '').trim();
    this.onBuscarChange();
  }

  togglePanelExport(): void {
    this.panelExportAbierto = !this.panelExportAbierto;
  }

  togglePanelImport(): void {
    this.panelImportAbierto = !this.panelImportAbierto;
    if (this.panelImportAbierto && !this.estadoImport) {
      this.cargarEstadoImport();
    }
  }

  cargarEstadoImport(): void {
    this.api.estadoImportacion().subscribe({
      next: (d) => (this.estadoImport = d),
      error: () => {},
    });
  }

  onArchivoImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoImportSeleccionado = input.files?.[0] ?? null;
  }

  ejecutarImportacion(): void {
    if (!this.archivoImportSeleccionado) {
      this.toast.error('Selecciona un archivo .xlsx');
      return;
    }
    this.importandoExcel = true;
    this.api.importarExcel(this.archivoImportSeleccionado, this.permitirImportDuplicados).subscribe({
      next: (r) => {
        this.importandoExcel = false;
        const msg = `Importados ${r.insertados} ítems${r.errores.length ? ` · ${r.errores.length} errores` : ''}.`;
        if (r.errores.length) this.toast.info(msg);
        else this.toast.exito(msg);
        this.archivoImportSeleccionado = null;
        this.panelImportAbierto = false;
        this.cargar(1);
        this.cargarEstadoImport();
      },
      error: (err) => {
        this.importandoExcel = false;
        this.toast.error(mensajeApiError(err, 'No se pudo importar la planilla.'));
      },
    });
  }

  etiquetaEstado(estado: string): string {
    if (estado === 'CRITICO') return 'Crítico';
    if (estado === 'BAJO') return 'Bajo';
    return 'Normal';
  }

  etiquetaAlerta(a: AlertaInventarioDto): string {
    const base = a.titulo;
    if (a.cantidadAgrupada && a.cantidadAgrupada > 1) {
      return `${base} (×${a.cantidadAgrupada})`;
    }
    return base;
  }

  ngOnInit(): void {
    if (this.puedeGestionar) {
      this.cargarEstadoImport();
    }
    this.usuarios.voluntariosParaSelect().subscribe((v) => (this.voluntarios = filtrarUsuariosOperativos(v)));
    this.api.listarBodegas().subscribe({
      next: (bodegas) => {
        this.bodegasCatalogo = bodegas;
        if (this.bodegaActiva === 'UNIFORMES') {
          this.vistaModo = 'matriz';
        }
        this.cargar(1);
      },
      error: () => this.cargar(1),
    });
    this.buscar$.pipe(debounceTime(300)).subscribe(() => this.cargar(1));
  }

  cargar(page = this.page): void {
    this.loading = true;
    this.error = null;
    this.page = page;

    if (this.mostrarMatriz) {
      this.cargandoMatriz = true;
      forkJoin({
        matriz: this.api.listarMatrizEpp({
          q: this.busqueda,
          bodega: this.bodegaActiva,
          categoria: this.categoriaActiva,
          voluntario: this.filtroVoluntario,
        }),
        movimientos: this.api.listarMovimientosInventario({ bodega: this.bodegaActiva, limit: 25 }),
        alertas: this.api.listarAlertas(this.bodegaActiva),
      }).subscribe({
        next: ({ matriz, movimientos, alertas }) => {
          this.matrizEpp = matriz;
          this.movimientos = movimientos;
          this.alertas = alertas;
          this.items = [];
          this.total = matriz.length;
          this.totalPaginas = 1;
          this.loading = false;
          this.cargandoMatriz = false;
          this.cargarEppVoluntario();
          this.cargarItemsParaMovimiento();
        },
        error: (err) => {
          this.loading = false;
          this.cargandoMatriz = false;
          this.error = mensajeApiError(err, 'No se pudo cargar la matriz EPP.');
        },
      });
      return;
    }

    forkJoin({
      listado: this.api.listarItems({
        q: this.busqueda,
        bodega: this.bodegaActiva,
        categoria: this.categoriaActiva,
        voluntario: this.filtroVoluntario,
        page: this.page,
        pageSize: this.pageSize,
      }),
      movimientos: this.api.listarMovimientosInventario({
        bodega: this.bodegaActiva,
        limit: 25,
      }),
      alertas: this.api.listarAlertas(this.bodegaActiva),
    }).subscribe({
      next: ({ listado, movimientos, alertas }) => {
        this.items = listado.items;
        this.metricas = listado.metricas;
        this.total = listado.total;
        this.totalPaginas = Math.max(1, Math.ceil(listado.total / listado.pageSize));
        this.movimientos = movimientos;
        this.alertas = alertas;
        if (!this.movItemId && listado.items.length) {
          this.movItemId = listado.items[0]!.id;
        } else if (this.movItemId && !listado.items.some((i) => i.id === this.movItemId)) {
          this.movItemId = listado.items[0]?.id ?? 0;
        }
        this.loading = false;
        this.cargarEppVoluntario();
        this.cargarItemsParaMovimiento();
      },
      error: (err) => {
        this.loading = false;
        this.error = mensajeApiError(err, 'No se pudo cargar el inventario.');
      },
    });
  }

  onBuscarChange(): void {
    this.buscar$.next();
  }

  setBodega(codigo: string): void {
    this.bodegaActiva = codigo;
    this.movItemId = 0;
    if (codigo === 'UNIFORMES') {
      this.vistaModo = 'matriz';
    } else if (this.vistaModo === 'matriz' && codigo !== 'UNIFORMES') {
      this.vistaModo = 'lista';
    }
    this.cargar(1);
  }

  setCategoria(cat: string): void {
    this.categoriaActiva = cat;
    if (cat === 'Uniformes') {
      this.vistaModo = 'matriz';
    }
    this.cargar(1);
  }

  setVistaModo(modo: 'lista' | 'matriz'): void {
    this.vistaModo = modo;
    this.cargar(1);
  }

  private cargarItemsParaMovimiento(): void {
    if (this.bodegaActiva === 'TODAS') {
      this.itemsParaMovimiento = [];
      return;
    }
    this.cargandoItemsMovimiento = true;
    this.api
      .listarItems({
        bodega: this.bodegaActiva,
        categoria: this.categoriaActiva !== 'TODAS' ? this.categoriaActiva : undefined,
        page: 1,
        pageSize: 5000,
      })
      .subscribe({
        next: (listado) => {
          this.itemsParaMovimiento = listado.items;
          if (!this.movItemId && listado.items.length) {
            this.movItemId = listado.items[0]!.id;
          } else if (this.movItemId && !listado.items.some((i) => i.id === this.movItemId)) {
            this.movItemId = listado.items[0]?.id ?? 0;
          }
          this.cargandoItemsMovimiento = false;
        },
        error: () => {
          this.itemsParaMovimiento = [];
          this.cargandoItemsMovimiento = false;
        },
      });
  }

  private cargarEppVoluntario(): void {
    const texto = this.filtroVoluntario.trim().toLowerCase();
    if (texto.length < 2) {
      this.eppVoluntario = [];
      return;
    }
    const match = this.voluntarios.find(
      (v) =>
        v.nombre.toLowerCase().includes(texto) ||
        v.rut.toLowerCase().includes(texto),
    );
    if (!match) {
      this.eppVoluntario = [];
      return;
    }
    this.api.listarEppUsuario(match.rut).subscribe({
      next: (epp) => (this.eppVoluntario = epp),
      error: () => (this.eppVoluntario = []),
    });
  }

  ajustar(item: InventarioItemDto, delta: number): void {
    if (!this.puedeGestionar) return;
    this.api.ajustarCantidadItem(item.id, delta).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.recargarMetricasYMovimientos();
        this.toast.exito(delta > 0 ? 'Stock aumentado.' : 'Stock reducido.');
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo ajustar el stock.')),
    });
  }

  guardarTalla(item: InventarioItemDto, talla: string): void {
    if (!this.puedeGestionar) return;
    this.api.actualizarMetaItem(item.id, { talla: talla || null }).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.toast.exito(`Talla ${actualizado.talla ?? '—'} guardada.`);
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo guardar la talla.')),
    });
  }

  registrarMovimiento(): void {
    if (!this.puedeGestionar) return;
    if (!this.movItemId || this.movCantidad <= 0) {
      this.toast.error('Selecciona un ítem e indica una cantidad válida.');
      return;
    }
    this.guardandoMovimiento = true;
    this.api
      .registrarMovimientoItem(this.movItemId, {
        tipo: this.movTipo,
        cantidad: this.movCantidad,
        motivo: this.movMotivo.trim() || undefined,
      })
      .subscribe({
        next: (actualizado) => {
          const idx = this.items.findIndex((i) => i.id === actualizado.id);
          if (idx >= 0) this.items[idx] = actualizado;
          const idxMov = this.itemsParaMovimiento.findIndex((i) => i.id === actualizado.id);
          if (idxMov >= 0) this.itemsParaMovimiento[idxMov] = actualizado;
          this.movMotivo = '';
          this.movCantidad = 1;
          this.guardandoMovimiento = false;
          this.recargarMetricasYMovimientos();
          if (this.mostrarMatriz) this.cargar(this.page);
          else this.cargarItemsParaMovimiento();
          this.toast.exito('Movimiento registrado.');
        },
        error: (err) => {
          this.guardandoMovimiento = false;
          this.toast.error(mensajeApiError(err, 'No se pudo registrar el movimiento.'));
        },
      });
  }

  private recargarMetricasYMovimientos(): void {
    this.api.listarItems({ bodega: this.bodegaActiva, page: 1, pageSize: 1 }).subscribe({
      next: (d) => (this.metricas = d.metricas),
    });
    this.api.listarMovimientosInventario({ bodega: this.bodegaActiva, limit: 25 }).subscribe({
      next: (m) => (this.movimientos = m),
    });
  }

  abrirAsignacion(item: InventarioItemDto): void {
    if (!this.puedeGestionar || !item.esEppAsignable) return;
    if (item.cantidadDisponible < 1) {
      this.toast.error(
        `No se puede asignar: no hay unidades disponibles (total ${item.cantidad}, asignadas ${item.cantidadAsignada}).`,
      );
      return;
    }
    if (item.sistemaTalla && !item.talla) {
      this.toast.error('Indica la talla del ítem antes de asignar (botas 35–46; ropa/gorras XS–XXL).');
      return;
    }
    this.asignandoItemId = item.id;
    this.rutAsignacion = '';
  }

  cancelarAsignacion(): void {
    this.asignandoItemId = null;
    this.rutAsignacion = '';
  }

  confirmarAsignacion(item: InventarioItemDto): void {
    if (!this.rutAsignacion.trim()) {
      this.toast.error('Selecciona un voluntario.');
      return;
    }
    this.api.asignarEpp(item.id, this.rutAsignacion.trim()).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.cancelarAsignacion();
        this.toast.exito('EPP asignado al voluntario.');
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo asignar.')),
    });
  }

  quitarAsignacion(item: InventarioItemDto, asignacionId: string): void {
    if (!this.puedeGestionar) return;
    this.api.quitarAsignacionEpp(asignacionId).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.toast.exito('Asignación eliminada. La unidad vuelve a disponibles en bodega.');
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo quitar la asignación.')),
    });
  }

  exportarExcelBodega(codigo: string, _nombre: string): void {
    void this.descargarExportServer('excel', { bodega: codigo }, `inventario_${codigo}_${this.fechaHoy()}.xlsx`, `excel:${codigo}`);
  }

  exportarExcelCompleto(): void {
    void this.descargarExportServer('excel', {}, `inventario_completo_${this.fechaHoy()}.xlsx`, 'excel:completo');
  }

  exportarPdfBodega(codigo: string, _nombre: string): void {
    void this.descargarExportServer('pdf', { bodega: codigo }, undefined, `pdf:${codigo}`);
  }

  exportarPdfCompleto(): void {
    void this.descargarExportServer('pdf', {}, undefined, 'pdf:completo');
  }

  private async descargarExportServer(
    tipo: 'excel' | 'pdf',
    filtros: Record<string, string | undefined>,
    nombreArchivo?: string,
    id?: string,
  ): Promise<void> {
    if (this.exportandoDescarga) return;
    this.exportandoDescarga = id ?? tipo;
    try {
      const qs = queryString(filtros);
      await descargarDesdeApi(`/api/logistica/inventarios/items/export/${tipo}${qs}`, nombreArchivo);
      this.toast.exito('Archivo generado en el servidor.');
    } catch (e) {
      this.toast.error(e instanceof Error ? e.message : 'No se pudo exportar.');
    } finally {
      this.exportandoDescarga = null;
    }
  }

  estaExportando(id: string): boolean {
    return this.exportandoDescarga === id;
  }

  exportandoAlgunaDescarga(): boolean {
    return this.exportandoDescarga !== null;
  }

  private fechaHoy(): string {
    return new Date().toISOString().slice(0, 10);
  }

  tallasPara(item: InventarioItemDto): string[] {
    if (item.sistemaTalla === 'BOTA') return this.tallasBota;
    if (item.sistemaTalla === 'ROPA') return [...this.tallasRopa];
    return [];
  }

  puedeAsignarMas(item: InventarioItemDto): boolean {
    return item.esEppAsignable && item.cantidadDisponible > 0;
  }

  clasesEstado(estado: string): string {
    if (estado === 'CRITICO') return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
    if (estado === 'BAJO') return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30';
    return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
  }

  clasesAlerta(severidad: string): string {
    if (severidad === 'critico') return 'border-red-700/50 bg-red-950/25 text-red-200';
    if (severidad === 'advertencia') return 'border-amber-700/50 bg-amber-950/25 text-amber-200';
    return 'border-sky-700/50 bg-sky-950/25 text-sky-200';
  }

  clasesCeldaMatriz(estado: string | undefined): string {
    if (estado === 'CRITICO') return 'bg-red-950/40 ring-1 ring-red-500/35';
    if (estado === 'BAJO') return 'bg-amber-950/30 ring-1 ring-amber-500/30';
    if (estado === 'NORMAL') return 'bg-emerald-950/20';
    return 'bg-slate-900/30';
  }

  etiquetaAsignacionesCelda(celda: { asignaciones: Array<{ usuarioNombre: string }> } | null | undefined): string {
    if (!celda?.asignaciones?.length) return '';
    return celda.asignaciones.map((a) => a.usuarioNombre.split(' ')[0] ?? a.usuarioNombre).join(', ');
  }

  clasesMovimiento(tipo: string): string {
    if (tipo === 'ENTRADA') return 'text-emerald-300';
    if (tipo === 'SALIDA') return 'text-red-300';
    return 'text-amber-300';
  }

  formatoFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.cargar(p);
  }

  cambiarPaginaInventario(delta: number): void {
    this.irPagina(this.page + delta);
  }

  ayudaCantidadMovimiento(): string {
    if (this.movTipo === 'AJUSTE') return 'Nuevo stock total del ítem';
    return 'Unidades a ' + (this.movTipo === 'ENTRADA' ? 'ingresar' : 'retirar');
  }

  private formMaterialVacio() {
    return {
      nombre: '',
      cantidad: 1,
      tipoInventario: 'EPP' as string,
      bodegaCodigo: '',
      marca: '',
      modelo: '',
      estadoFisico: 'BUENO',
      valor: null as number | null,
      observaciones: '',
      talla: '',
      categoria: '',
    };
  }

  abrirRegistrarMaterial(): void {
    if (!this.puedeGestionar) return;
    this.formMaterial = this.formMaterialVacio();
    this.pasoRegistrarMaterial = 1;
    this.sugerirBodegaMaterial();
    this.mostrarRegistrarMaterial = true;
    document.body.classList.add('confirm-open');
  }

  cerrarRegistrarMaterial(): void {
    this.mostrarRegistrarMaterial = false;
    document.body.classList.remove('confirm-open');
  }

  cerrarRegistrarMaterialSiBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.cerrarRegistrarMaterial();
  }

  pasoSiguienteMaterial(): void {
    if (!this.puedeAvanzarPasoMaterial()) return;
    if (this.pasoRegistrarMaterial === 1) this.sugerirBodegaMaterial();
    this.pasoRegistrarMaterial = Math.min(3, this.pasoRegistrarMaterial + 1);
  }

  pasoAnteriorMaterial(): void {
    this.pasoRegistrarMaterial = Math.max(1, this.pasoRegistrarMaterial - 1);
  }

  puedeAvanzarPasoMaterial(): boolean {
    if (this.pasoRegistrarMaterial === 1) {
      return !!this.formMaterial.nombre.trim() && Number(this.formMaterial.cantidad) >= 1;
    }
    return true;
  }

  get requiereTallaMaterial(): boolean {
    const n = this.formMaterial.nombre.toUpperCase();
    return (
      this.formMaterial.tipoInventario === 'EPP' ||
      /UNIFORM|CHAQUET|PANTALON|BOTA|COTONA|JARDINERA|CHAQUETON|GORRA|CASCO/i.test(n)
    );
  }

  get sistemaTallaMaterial(): 'BOTA' | 'ROPA' | null {
    const n = this.formMaterial.nombre.toUpperCase();
    if (/BOTA|CALZADO|BOTIN/i.test(n)) return 'BOTA';
    if (/UNIFORM|CHAQUET|PANTALON|COTONA|GORRA|JARDINERA|CHAQUETON/i.test(n)) return 'ROPA';
    if (this.formMaterial.tipoInventario === 'EPP') return 'ROPA';
    return null;
  }

  sugerirBodegaMaterial(): void {
    const nombre = this.formMaterial.nombre.toUpperCase();
    const tipo = this.formMaterial.tipoInventario;
    let categoria = this.formMaterial.categoria;
    if (!categoria) {
      if (/UNIFORM|CHAQUET|PANTALON|BOTA|COTONA|JARDINERA|CHAQUETON|GORRA/i.test(nombre)) categoria = 'Uniformes';
      else if (nombre.includes('MANGUERA')) categoria = 'Mangueras';
      else if (nombre.includes('EXTINTOR')) categoria = 'Extintores';
      else categoria = 'Equipamiento';
    }
    if (categoria === 'Uniformes') this.formMaterial.bodegaCodigo = 'UNIFORMES';
    else if (tipo === 'RESCATE') this.formMaterial.bodegaCodigo = 'RESCATE';
    else if (tipo.includes('INCENDIO') || categoria === 'Mangueras' || categoria === 'Extintores') {
      this.formMaterial.bodegaCodigo = 'AGUA';
    } else if (tipo === 'FORESTAL') this.formMaterial.bodegaCodigo = 'RESCATE';
    else this.formMaterial.bodegaCodigo = 'RESCATE';

    if (!this.bodegasCatalogo.some((b) => b.codigo === this.formMaterial.bodegaCodigo) && this.bodegasCatalogo.length) {
      this.formMaterial.bodegaCodigo = this.bodegasCatalogo[0]!.codigo;
    }
  }

  guardarMaterial(): void {
    if (!this.puedeGestionar || this.guardandoMaterial || !this.formMaterial.bodegaCodigo) return;
    this.guardandoMaterial = true;
    this.api
      .crearItem({
        nombre: this.formMaterial.nombre.trim(),
        cantidad: Math.trunc(Number(this.formMaterial.cantidad)),
        tipoInventario: this.formMaterial.tipoInventario,
        bodegaCodigo: this.formMaterial.bodegaCodigo,
        marca: this.formMaterial.marca.trim() || null,
        modelo: this.formMaterial.modelo.trim() || null,
        estadoFisico: this.formMaterial.estadoFisico.trim() || null,
        valor: this.formMaterial.valor != null && this.formMaterial.valor > 0 ? this.formMaterial.valor : null,
        observaciones: this.formMaterial.observaciones.trim() || null,
        talla: this.formMaterial.talla.trim() || null,
        categoria: this.formMaterial.categoria.trim() || null,
      })
      .subscribe({
        next: (item) => {
          this.guardandoMaterial = false;
          this.cerrarRegistrarMaterial();
          this.toast.exito(`Material registrado: ${item.codigo} · ${item.nombre}`);
          if (this.bodegaActiva !== 'TODAS' && item.bodegaCodigo !== this.bodegaActiva) {
            this.setBodega(item.bodegaCodigo);
          } else {
            this.cargar(this.page);
          }
        },
        error: (err) => {
          this.guardandoMaterial = false;
          this.toast.error(mensajeApiError(err, 'No se pudo registrar el material.'));
        },
      });
  }

  iaSugerirMovimiento(): void {
    const t = this.iaTexto.trim();
    if (t.length < 3) return;
    this.iaCargando = true;
    this.iaApi.sugerirMovimiento(t).subscribe({
      next: (r) => {
        this.iaCargando = false;
        this.iaResultado = `Tipo: ${r.tipo} · ${r.motivo || ''} (cant. ${r.cantidadSugerida ?? 1}) [${r.fuente}]`;
      },
      error: (err) => {
        this.iaCargando = false;
        this.toast.error(mensajeApiError(err, 'IA movimiento falló.'));
      },
    });
  }

  iaClasificarEstado(): void {
    const t = this.iaTexto.trim();
    if (t.length < 3) return;
    this.iaCargando = true;
    this.iaApi.clasificarEstado(t).subscribe({
      next: (r) => {
        this.iaCargando = false;
        this.iaResultado = `Estado: ${r.estado} · ${r.motivo || ''} (conf. ${r.confianza ?? '—'})`;
      },
      error: (err) => {
        this.iaCargando = false;
        this.toast.error(mensajeApiError(err, 'IA estado falló.'));
      },
    });
  }

  iaAlertas(): void {
    this.iaCargando = true;
    this.iaApi.alertasInventario().subscribe({
      next: (r) => {
        this.iaCargando = false;
        this.iaResultado = `${r.resumen || ''}\n` + (r.alertas || []).slice(0, 5).map((a: any) => `· ${a.titulo}: ${a.consejo}`).join('\n');
      },
      error: (err) => {
        this.iaCargando = false;
        this.toast.error(mensajeApiError(err, 'IA alertas falló.'));
      },
    });
  }

  iaTalla(): void {
    const t = this.iaTexto.trim() || 'Chaqueta';
    const parts = t.split(/\s+/);
    const talla = parts.find((p) => /^(XS|S|M|L|XL|XXL|\d{2})$/i.test(p));
    this.iaCargando = true;
    this.iaApi.matchingTalla(t, talla).subscribe({
      next: (r) => {
        this.iaCargando = false;
        this.iaResultado = `${r.mensaje} ${r.sugerencia || ''} [${r.tipoEpp || 's/tipo'}]`;
      },
      error: (err) => {
        this.iaCargando = false;
        this.toast.error(mensajeApiError(err, 'IA talla falló.'));
      },
    });
  }
}
