import { CommonModule, formatDate } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, startWith, switchMap, tap, type Observable } from 'rxjs';
import type {
  CarroHistorialGeneralFila,
  CarroRegistroHistorialDto,
} from '../../models/carro-registro-historial.dto';
import type { CarroDto } from '../../models/carro.dto';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { CarrosService } from '../../services/carros.service';
import { AuthService } from '../../services/auth.service';
import { UsuariosService } from '../../services/usuarios.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { nombreListaSoloPersona } from '../usuarios/usuario-registro.constants';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SignaturePadComponent } from '../../shared/signature-pad.component';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { crearControlEdicionPendiente } from '../../utils/edicion-pendiente.util';
import { confirmarDescartarCambios } from '../../utils/confirmar-descartar.util';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { CambioEstadoDialogService } from '../../services/cambio-estado-dialog.service';
import { solicitarMotivoCambioEstado } from '../../utils/cambio-estado.util';
import type { ComponenteConEdicionPendiente } from '../../guards/edicion-pendiente.guard';
import { registrarEdicionPendienteGlobal } from '../../utils/registrar-edicion-pendiente-global.util';
import { SidEdicionPendienteBannerComponent } from '../../shared/sid-edicion-pendiente-banner.component';
import { exportarExcelSidep } from '../../utils/excel-export.util';
import { mensajeApiError } from '../../utils/api-error.util';
import { SIDEP_ACTION_ICON } from '../../shared/sidep-action-icons';
import { BorradorLocalService } from '../../services/borrador-local.service';
import { formatearFechaBorradorLocal, manejarErrorGuardadoConBorradorLocal } from '../../utils/borrador-local.util';

type CarrosView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'list'; carros: CarroDto[] }
  | { status: 'detail'; carro: CarroDto };

@Component({
  selector: 'app-carros-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SidepIconsModule,
    SignaturePadComponent,
    SidScrollRevealDirective,
    SidEmptyStateComponent,
    SidDateInputComponent,
    SidEdicionPendienteBannerComponent,
  ],
  templateUrl: './carros-page.component.html',
})
export class CarrosPageComponent implements ComponenteConEdicionPendiente {
  readonly nombreListaSoloPersona = nombreListaSoloPersona;
  readonly icon = SIDEP_ACTION_ICON;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly carrosApi = inject(CarrosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly toast = inject(ToastService);
  private readonly borradorLocal = inject(BorradorLocalService);
  private readonly cambioEstadoDialog = inject(CambioEstadoDialogService);
  estadoOperativoUi = 1;
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    const destroyRef = inject(DestroyRef);
    registrarEdicionPendienteGlobal(destroyRef, () => this.tieneEdicionPendiente());
  }

  private readonly imagenPorNomenclatura: Record<string, string> = {
    'B-1': this.assetUrl('assets/carros/b1.png'),
    'BX-1': this.assetUrl('assets/carros/bx1.png'),
    'R-1': this.assetUrl('assets/carros/r1.png'),
  };

  readonly imagenFallback =
    'https://images.unsplash.com/photo-1588662880295-13d2b28127c6?w=1080&q=80&fm=jpg';
  readonly splitFh = splitFechaHoraEsCl;

  usuariosConductoresAutorizados: UsuarioListaDto[] = [];

  editando = false;
  mantenimientoEditId: string | null = null;
  guardando = false;
  mensajeEdicion = '';
  errorValidacion: string | null = null;
  historialGeneralFilas: CarroHistorialGeneralFila[] = [];
  historialGeneralLoading = false;
  historialGeneralVistaFila: CarroHistorialGeneralFila | null = null;
  historialEdicionFila: CarroHistorialGeneralFila | null = null;
  
  filtroUnidadHistorial: string | 'TODAS' = 'TODAS';
  filtroHistorialDesde = '';
  filtroHistorialHasta = '';
  filtroInspectorHistorial = '';
  paginaHistorialGeneral = 1;
  readonly tamanioPaginaHistorialGeneral = 10;

  readonly editForm: {
    ultimoConductor: string;
    ultimoMantenimiento: string;
    proximoMantenimiento: string;
    proximaRevisionTecnica: string;
    ultimaRevisionBombaAgua: string;
    descripcionUltimoMantenimiento: string;
    ultimoInspector: string;
    firmaUltimoInspector: string;
    fechaUltimaInspeccion: string;
  } = {
    ultimoConductor: '',
    ultimoMantenimiento: '',
    proximoMantenimiento: '',
    proximaRevisionTecnica: '',
    ultimaRevisionBombaAgua: '',
    descripcionUltimoMantenimiento: '',
    ultimoInspector: '',
    firmaUltimoInspector: '',
    fechaUltimaInspeccion: '',
  };

  private readonly controlEdicionMantenimiento = crearControlEdicionPendiente(() => ({ ...this.editForm }));

  private carroEnDetalle: CarroDto | null = null;

  readonly vm$ = this.route.paramMap.pipe(
    switchMap((pm) => {
      const id = pm.get('id');
      if (!id) {
        return this.carrosApi.listar().pipe(
          switchMap((carros) => this.hidratarListadoDesdeHistorialSiFalta(carros)),
          map((carros): CarrosView => ({ status: 'list', carros })),
          tap((v) => {
            if (v.status === 'list') {
              this.carroEnDetalle = null;
              this.cargarHistorialGeneral();
            }
          }),
          catchError(
            (): Observable<CarrosView> =>
              of({
                status: 'error',
                message: 'No se pudo cargar la lista de carros. ¿Está el backend en ejecución?',
              }),
          ),
          startWith({ status: 'loading' } satisfies CarrosView),
        );
      }
      return this.carrosApi.obtener(id).pipe(
        switchMap((carro) => this.hidratarDetalleDesdeHistorial(carro)),
        switchMap((carro) =>
          this.usuariosApi.listar().pipe(
            catchError(() => of([] as UsuarioListaDto[])),
            map((usuarios) => {
              this.usuariosConductoresAutorizados = usuarios
                .filter((u) => u.activo && u.autorizadoConducir === true)
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
              return carro;
            }),
          ),
        ),
        map((carro): CarrosView => ({ status: 'detail', carro })),
        tap((view) => {
          this.carroEnDetalle = view.status === 'detail' ? view.carro : null;
          this.historialGeneralFilas = [];
          this.historialGeneralLoading = false;
          if (view.status === 'detail') {
            this.estadoOperativoUi = view.carro.estadoOperativo;
            const row = history.state?.editMantenimiento as CarroHistorialGeneralFila | undefined;
            if (row && String(row.carroId) === String(view.carro.id)) {
              this.abrirEdicionHistorial(view.carro, row);
              history.replaceState({ ...history.state, editMantenimiento: undefined }, '');
            }
          }
        }),
        catchError(
          (): Observable<CarrosView> =>
            of({
              status: 'error',
              message: 'No se pudo cargar el carro o no existe.',
            }),
        ),
        startWith({ status: 'loading' } satisfies CarrosView),
      );
    }),
  );

  cargarHistorialGeneral(): void {
    this.historialGeneralLoading = true;
    const f: { carroId?: string; desde?: string; hasta?: string } = {};
    if (this.filtroUnidadHistorial !== 'TODAS') {
      f.carroId = this.filtroUnidadHistorial;
    }
    if (this.filtroHistorialDesde.trim()) {
      f.desde = this.filtroHistorialDesde.trim();
    }
    if (this.filtroHistorialHasta.trim()) {
      f.hasta = this.filtroHistorialHasta.trim();
    }
    const payload = Object.keys(f).length > 0 ? f : undefined;
    this.carrosApi.historialGeneral(payload).subscribe({
      next: (rows) => {
        this.historialGeneralFilas = rows;
        this.paginaHistorialGeneral = 1;
        this.historialGeneralLoading = false;
      },
      error: () => {
        this.historialGeneralFilas = [];
        this.historialGeneralLoading = false;
      },
    });
  }

  aplicarFiltrosHistorialGeneral(): void {
    this.cargarHistorialGeneral();
  }

  limpiarFiltrosHistorialGeneral(): void {
    this.filtroUnidadHistorial = 'TODAS';
    this.filtroHistorialDesde = '';
    this.filtroHistorialHasta = '';
    this.filtroInspectorHistorial = '';
    this.cargarHistorialGeneral();
  }

  historialGeneralFiltrado(): CarroHistorialGeneralFila[] {
    let rows = this.historialGeneralFilas;
    const t = this.filtroInspectorHistorial.trim().toLowerCase();
    if (t) {
      rows = rows.filter((r) => (r.ultimoInspector ?? '').toLowerCase().includes(t));
    }
    const desde = this.parseFiltroFechaLocal(this.filtroHistorialDesde, false);
    const hasta = this.parseFiltroFechaLocal(this.filtroHistorialHasta, true);
    if (desde || hasta) {
      rows = rows.filter((r) => {
        const ref = new Date(r.creadoEn);
        if (Number.isNaN(ref.getTime())) return false;
        if (desde && ref < desde) return false;
        if (hasta && ref > hasta) return false;
        return true;
      });
    }
    return rows;
  }

  private parseFiltroFechaLocal(val: string, finDeDia: boolean): Date | null {
    const t = (val ?? '').trim();
    if (!t) return null;
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      const d = new Date(t);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (finDeDia) return new Date(y, mo, day, 23, 59, 59, 999);
    return new Date(y, mo, day, 0, 0, 0, 0);
  }

  totalPaginasHistorialGeneral(): number {
    return Math.max(1, Math.ceil(this.historialGeneralFiltrado().length / this.tamanioPaginaHistorialGeneral));
  }

  historialGeneralPaginado(): CarroHistorialGeneralFila[] {
    const filas = this.historialGeneralFiltrado();
    const i = (this.paginaHistorialGeneral - 1) * this.tamanioPaginaHistorialGeneral;
    return filas.slice(i, i + this.tamanioPaginaHistorialGeneral);
  }

  exportarHistorialGeneralExcel(): void {
    const filas = this.historialGeneralFiltrado();
    if (filas.length === 0) return;
    const columnas = [
      'Guardado',
      'Unidad',
      'Nombre unidad',
      'Inspector',
      'Último mantenimiento',
      'Próximo mantenimiento',
      'Inspección',
      'Conductor',
    ];
    const body = filas.map((row) => {
      const g = this.splitFh(row.creadoEn);
      return [
        `${g.fecha} ${g.hora}`,
        row.carro.nomenclatura,
        row.carro.nombre ?? '',
        row.ultimoInspector ?? '',
        this.fechaCorta(row.ultimoMantenimiento),
        this.fechaCorta(row.proximoMantenimiento),
        this.fechaCorta(row.fechaUltimaInspeccion),
        row.ultimoConductor ?? '',
      ];
    });
    exportarExcelSidep({
      titulo: 'SIDEP · Historial general de mantención',
      meta: [`Registros: ${filas.length}`],
      columnas,
      filas: body,
      nombreHoja: 'Mantención',
      nombreArchivo: `SIDEP-historial-mantencion-${new Date().toISOString().slice(0, 10)}.xlsx`,
      anchosCols: [18, 10, 22, 20, 16, 16, 14, 18],
    });
  }

  exportarHistorialGeneralPdf(): void {
    const filas = this.historialGeneralFiltrado();
    if (filas.length === 0) return;
    void this.pdfExport.exportarHistorialTabla({
      titulo: 'Historial general de mantención',
      subtitulo: 'SIDEP · Mantención e inspección de unidades',
      columnas: ['Guardado', 'Unidad', 'Inspector', 'Mantención', 'Inspección'],
      filas: filas.map((row) => {
        const g = this.splitFh(row.creadoEn);
        return [
          `${g.fecha} ${g.hora}`,
          row.carro.nomenclatura,
          row.ultimoInspector ?? '—',
          this.fechaCorta(row.ultimoMantenimiento),
          this.fechaCorta(row.fechaUltimaInspeccion),
        ];
      }),
      segmentosNombre: ['Carro', 'Historial mantención'],
      landscape: true,
      resumen: [`Total registros: ${filas.length}`],
    });
  }

  cambiarPaginaHistorialGeneral(delta: number): void {
    const next = this.paginaHistorialGeneral + delta;
    const total = this.totalPaginasHistorialGeneral();
    this.paginaHistorialGeneral = Math.min(Math.max(next, 1), total);
  }

  irADetalleCarro(carroId: string | number): void {
    void this.router.navigate(['/carros', String(carroId)]);
  }

  abrirVistaHistorialGeneral(row: CarroHistorialGeneralFila): void {
    this.historialGeneralVistaFila = row;
  }

  cerrarVistaHistorialGeneral(): void {
    this.historialGeneralVistaFila = null;
  }

  cerrarVistaHistorialBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) this.cerrarVistaHistorialGeneral();
  }

  pdfHistorialGeneral(row: CarroHistorialGeneralFila): void {
    this.pdfExport.exportarRegistroHistorialCarro({
      nomenclatura: row.carro.nomenclatura,
      patente: row.carro.patente ?? '',
      nombreUnidad: row.carro.nombre,
      registro: row,
    });
  }

  volverLista(): void {
    void this.router.navigate(['/carros']);
  }

  verDetalle(carro: CarroDto): void {
    void this.router.navigate(['/carros', carro.id]);
  }

  tituloMostrar(c: CarroDto): string {
    return c.nombre?.trim() || `Unidad ${c.nomenclatura}`;
  }

  private cargarConductoresSiFalta(): void {
    if (this.usuariosConductoresAutorizados.length > 0) return;
    this.usuariosApi.listar().subscribe({
      next: (usuarios) => {
        this.usuariosConductoresAutorizados = usuarios
          .filter((u) => u.activo && u.autorizadoConducir === true)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      },
    });
  }

  ultimoConductorLegadoNoEnLista(): boolean {
    const cur = this.editForm.ultimoConductor?.trim();
    if (!cur) return false;
    return !this.usuariosConductoresAutorizados.some((u) => u.nombre.trim() === cur);
  }

  imagenCarro(c: CarroDto): string {
    const raw = c.imagenUrl?.trim() ?? '';
    if (!raw) {
      return this.imagenPorNomenclatura[c.nomenclatura] ?? this.imagenFallback;
    }
    return this.normalizarUrlImagen(raw, c.nomenclatura);
  }

  onImageError(event: Event, c: CarroDto): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    const fallbackUnidad = this.imagenPorNomenclatura[c.nomenclatura];
    if (fallbackUnidad && !img.src.includes(fallbackUnidad)) {
      img.src = fallbackUnidad;
      return;
    }
    if (!img.src.includes(this.imagenFallback)) {
      img.src = this.imagenFallback;
    }
  }

  private normalizarUrlImagen(raw: string, nomenclatura: string): string {
    const limpio = raw.replace(/\\/g, '/').trim();
    if (limpio.startsWith('http://') || limpio.startsWith('https://') || limpio.startsWith('data:image')) {
      return limpio;
    }
    if (limpio.startsWith('/assets/')) return this.assetUrl(limpio.slice(1));
    const idxAssets = limpio.toLowerCase().indexOf('/assets/');
    if (idxAssets >= 0) return this.assetUrl(limpio.slice(idxAssets + 1));
    if (limpio.startsWith('assets/')) return this.assetUrl(limpio);
    if (limpio.startsWith('/')) return limpio;
    if (limpio.includes('/')) return limpio;
    return this.imagenPorNomenclatura[nomenclatura] ?? this.imagenFallback;
  }

  private assetUrl(path: string): string {
    return new URL(path, document.baseURI).toString();
  }

  private camposMantenimientoHistorial(): Array<keyof CarroHistorialGeneralFila> {
    return [
      'ultimoMantenimiento',
      'proximoMantenimiento',
      'proximaRevisionTecnica',
      'ultimaRevisionBombaAgua',
      'descripcionUltimoMantenimiento',
      'ultimoInspector',
      'firmaUltimoInspector',
      'fechaUltimaInspeccion',
      'ultimoConductor',
    ];
  }

  private fusionarCarroConHistorial(carro: CarroDto, snap?: CarroHistorialGeneralFila | null): CarroDto {
    if (!snap) return carro;
    return this.fusionarDesdeHistorialCompleto(carro, [snap]);
  }

  /** Rellena cada campo de mantención con el valor más reciente no vacío del historial. */
  private fusionarDesdeHistorialCompleto(carro: CarroDto, rows: CarroHistorialGeneralFila[]): CarroDto {
    const out: CarroDto = { ...carro };
    const ordenadas = [...rows].sort(
      (a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime(),
    );
    for (const campo of this.camposMantenimientoHistorial()) {
      for (const row of ordenadas) {
        const valor = row[campo];
        if (valor == null || String(valor).trim() === '') continue;
        (out as unknown as Record<string, unknown>)[campo as string] = valor;
        break;
      }
    }
    return out;
  }

  private carroNecesitaHistorial(carro: CarroDto): boolean {
    const t = (v: string | null | undefined) => (v ?? '').trim();
    return this.camposMantenimientoHistorial().some((campo) => {
      const val = carro[campo as keyof CarroDto];
      return !t(val == null ? '' : String(val));
    });
  }

  private hidratarListadoDesdeHistorialSiFalta(carros: CarroDto[]): Observable<CarroDto[]> {
    const pendientes = carros.filter((c) => this.carroNecesitaHistorial(c));
    if (pendientes.length === 0) return of(carros);
    return forkJoin(
      pendientes.map((c) =>
        this.carrosApi.historialGeneral({ carroId: c.id }).pipe(
          map((rows) => ({ id: c.id, rows: rows ?? [] })),
          catchError(() => of({ id: c.id, rows: [] as CarroHistorialGeneralFila[] })),
        ),
      ),
    ).pipe(
      map((snaps) => {
        const porId = new Map(snaps.map((s) => [String(s.id), s.rows]));
        return carros.map((c) => this.fusionarDesdeHistorialCompleto(c, porId.get(String(c.id)) ?? []));
      }),
    );
  }

  private hidratarDetalleDesdeHistorial(carro: CarroDto): Observable<CarroDto> {
    return this.carrosApi.historialGeneral({ carroId: carro.id }).pipe(
      map((rows) => this.fusionarDesdeHistorialCompleto(carro, rows)),
      catchError(() => of(carro)),
    );
  }

  private refrescarCarroEnVista(carro: CarroDto): void {
    const target =
      this.carroEnDetalle && String(this.carroEnDetalle.id) === String(carro.id)
        ? this.carroEnDetalle
        : carro;
    forkJoin({
      refresco: this.carrosApi.obtener(carro.id),
      historial: this.carrosApi.historialGeneral({ carroId: carro.id }),
    }).subscribe({
      next: ({ refresco, historial }) => {
        Object.assign(target, this.fusionarDesdeHistorialCompleto(refresco, historial));
        this.cdr.markForCheck();
      },
    });
  }

  esFirmaImagen(val: string | null | undefined): boolean {
    return !!val?.trim().startsWith('data:image');
  }

  descargarPdfHistorial(carro: CarroDto, registro: CarroRegistroHistorialDto): void {
    this.pdfExport.exportarRegistroHistorialCarro({
      nomenclatura: carro.nomenclatura,
      patente: carro.patente,
      nombreUnidad: carro.nombre,
      registro,
    });
  }

  descargarPdfRegistroActual(carro: CarroDto): void {
    const registro: CarroRegistroHistorialDto = {
      id: '0',
      carroId: carro.id,
      creadoEn: new Date().toISOString(),
      ultimoMantenimiento: carro.ultimoMantenimiento ?? null,
      proximoMantenimiento: carro.proximoMantenimiento ?? null,
      proximaRevisionTecnica: carro.proximaRevisionTecnica ?? null,
      ultimaRevisionBombaAgua: carro.ultimaRevisionBombaAgua ?? null,
      descripcionUltimoMantenimiento: carro.descripcionUltimoMantenimiento ?? null,
      ultimoInspector: carro.ultimoInspector ?? null,
      firmaUltimoInspector: carro.firmaUltimoInspector ?? null,
      fechaUltimaInspeccion: carro.fechaUltimaInspeccion ?? null,
      ultimoConductor: carro.ultimoConductor ?? carro.conductorAsignado ?? null,
    };
    this.descargarPdfHistorial(carro, registro);
  }

  get puedeEditarEstado(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase() ?? '';
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  etiquetaEstadoOperativo(valor: number): string {
    if (valor === 0) return 'Fuera de servicio';
    if (valor === 2) return 'En mantención';
    return 'Operativa';
  }

  mantenimientoVencido(c: CarroDto): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    for (const iso of [c.proximoMantenimiento, c.proximaRevisionTecnica]) {
      if (!iso) continue;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      if (d < hoy) return true;
    }
    return false;
  }

  estadoEtiqueta(c: CarroDto): string {
    if (c.estadoOperativo === 0) return 'Fuera de servicio';
    if (c.estadoOperativo === 2) return 'En mantención';
    if (this.mantenimientoVencido(c)) return 'En mantención';
    return 'Operativa';
  }

  estadoClaseTexto(c: CarroDto): string {
    if (c.estadoOperativo === 0) return 'text-red-400';
    if (c.estadoOperativo === 2 || this.mantenimientoVencido(c)) return 'text-amber-400';
    return 'text-green-500';
  }

  kmTexto(km: number | null): string {
    if (km == null) return '—';
    return `${new Intl.NumberFormat('es-CL').format(km)} km`;
  }

  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return formatDate(d, 'dd/MM/yyyy', 'es-CL');
  }

  fechaMantenimiento(iso: string | null | undefined, sinDato = 'Sin registrar'): string {
    if (iso == null || String(iso).trim() === '') return sinDato;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return sinDato;
    return formatDate(d, 'dd/MM/yyyy', 'es-CL');
  }

  textoOmitida(val: string | null | undefined, sinDato = 'Sin registrar'): string {
    const t = val?.trim();
    return t ? t : sinDato;
  }

  fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return formatDate(d, 'dd/MM/yyyy HH:mm', 'es-CL');
  }

  fechaInput(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  }

  private validarRegistroMantenimiento(): string | null {
    const f = this.editForm;
    if (!f.ultimoConductor.trim()) return 'El último conductor es obligatorio.';
    if (!f.ultimoMantenimiento) return 'La fecha de último mantenimiento es obligatoria.';
    if (!f.proximoMantenimiento) return 'La fecha de próximo mantenimiento es obligatoria.';
    if (!f.proximaRevisionTecnica) return 'La fecha de próxima revisión técnica es obligatoria.';
    if (!f.ultimaRevisionBombaAgua) return 'La fecha de última revisión de bomba de agua es obligatoria.';
    if (!f.descripcionUltimoMantenimiento.trim()) return 'La descripción de la última mantención es obligatoria.';
    if (!f.ultimoInspector.trim()) return 'El último inspector es obligatorio.';
    if (!this.esFirmaImagen(f.firmaUltimoInspector)) return 'La firma del inspector es obligatoria (dibújala en el recuadro).';
    if (!f.fechaUltimaInspeccion) return 'La fecha de inspección es obligatoria.';
    return null;
  }

  iniciarRegistroMantenimiento(carro: CarroDto): void {
    this.cargarConductoresSiFalta();
    this.historialEdicionFila = null;
    this.mantenimientoEditId = null;
    this.editando = true;
    this.mensajeEdicion = '';
    this.errorValidacion = null;
    this.limpiarEditFormMantenimiento();
    this.controlEdicionMantenimiento.marcarLimpio();
    void this.ofrecerRestaurarBorradorMantenimiento(carro);
  }

  private async ofrecerRestaurarBorradorMantenimiento(carro: CarroDto): Promise<void> {
    type EditFormSnapshot = {
      ultimoConductor: string;
      ultimoMantenimiento: string;
      proximoMantenimiento: string;
      proximaRevisionTecnica: string;
      ultimaRevisionBombaAgua: string;
      descripcionUltimoMantenimiento: string;
      ultimoInspector: string;
      firmaUltimoInspector: string;
      fechaUltimaInspeccion: string;
    };
    const saved = this.borradorLocal.obtener<{
      editForm: EditFormSnapshot;
      mantenimientoEditId: string | null;
    }>('carro-mantenimiento', String(carro.id));
    if (!saved) return;
    const ok = await this.confirmDialog.abrir({
      title: 'Mantención sin conexión',
      message: `Hay un registro de mantención guardado localmente (${formatearFechaBorradorLocal(saved.meta.guardadoEn)}). ¿Restaurarlo?`,
      confirmText: 'Restaurar',
      cancelText: 'Descartar',
    });
    if (!ok) {
      this.borradorLocal.eliminar('carro-mantenimiento', String(carro.id));
      return;
    }
    Object.assign(this.editForm, saved.payload.editForm);
    this.mantenimientoEditId = saved.payload.mantenimientoEditId;
    this.toast.exito('Registro de mantención restaurado desde este dispositivo.');
  }

  editarHistorialMantenimiento(row: CarroHistorialGeneralFila): void {
    this.cargarConductoresSiFalta();
    this.historialEdicionFila = row;
    this.abrirEdicionHistorial(
      {
        id: row.carroId,
        nomenclatura: row.carro.nomenclatura,
        nombre: row.carro.nombre,
        patente: row.carro.patente,
      } as CarroDto,
      row,
    );
  }

  cerrarEdicionHistorialModal(): void {
    this.historialEdicionFila = null;
    void this.cancelarEdicion();
  }

  guardarEdicionHistorialModal(): void {
    if (!this.historialEdicionFila) return;
    const id = this.historialEdicionFila.carroId;
    const carro =
      this.carroEnDetalle && String(this.carroEnDetalle.id) === String(id)
        ? this.carroEnDetalle
        : ({
            id,
            nomenclatura: this.historialEdicionFila.carro.nomenclatura,
          } as CarroDto);
    this.guardarEdicion(carro);
  }

  abrirEdicionHistorial(_carro: CarroDto, row: CarroHistorialGeneralFila): void {
    this.editando = true;
    this.mantenimientoEditId = row.id;
    this.mensajeEdicion = '';
    this.errorValidacion = null;
    this.rellenarEditFormDesdeHistorial(row);
    this.controlEdicionMantenimiento.marcarLimpio();
  }

  private limpiarEditFormMantenimiento(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.editForm.ultimoConductor = '';
    this.editForm.ultimoMantenimiento = hoy;
    this.editForm.proximoMantenimiento = '';
    this.editForm.proximaRevisionTecnica = '';
    this.editForm.ultimaRevisionBombaAgua = '';
    this.editForm.descripcionUltimoMantenimiento = '';
    this.editForm.ultimoInspector = '';
    this.editForm.firmaUltimoInspector = '';
    this.editForm.fechaUltimaInspeccion = hoy;
  }

  private rellenarEditFormDesdeHistorial(row: CarroRegistroHistorialDto): void {
    this.editForm.ultimoConductor = row.ultimoConductor ?? '';
    this.editForm.ultimoMantenimiento = this.fechaInput(row.ultimoMantenimiento);
    this.editForm.proximoMantenimiento = this.fechaInput(row.proximoMantenimiento);
    this.editForm.proximaRevisionTecnica = this.fechaInput(row.proximaRevisionTecnica);
    this.editForm.ultimaRevisionBombaAgua = this.fechaInput(row.ultimaRevisionBombaAgua);
    this.editForm.descripcionUltimoMantenimiento = row.descripcionUltimoMantenimiento ?? '';
    this.editForm.ultimoInspector = row.ultimoInspector ?? '';
    this.editForm.firmaUltimoInspector = row.firmaUltimoInspector ?? '';
    this.editForm.fechaUltimaInspeccion = this.fechaInput(row.fechaUltimaInspeccion);
  }

  tituloGuardarMantenimiento(): string {
    if (this.guardando) return 'Guardando...';
    return this.mantenimientoEditId ? 'Guardar cambios' : 'Registrar mantención';
  }

  tituloFormularioMantenimiento(): string {
    return this.mantenimientoEditId ? 'Editar registro de historial' : 'Nueva mantención e inspección';
  }

  iniciarEdicion(carro: CarroDto): void {
    this.iniciarRegistroMantenimiento(carro);
  }

  mantenimientoTieneCambios(): boolean {
    return this.controlEdicionMantenimiento.tieneCambios();
  }

  tieneEdicionPendiente(): boolean {
    return this.editando;
  }

  private cerrarEdicionMantenimiento(): void {
    this.editando = false;
    this.mantenimientoEditId = null;
    this.guardando = false;
    this.errorValidacion = null;
  }

  async cancelarEdicion(): Promise<void> {
    const ok = await confirmarDescartarCambios(this.confirmDialog, this.tieneEdicionPendiente(), {
      title: 'Cancelar mantención',
      message: 'Tienes un registro de mantención sin guardar. ¿Deseas descartar los cambios?',
    });
    if (!ok) return;
    this.cerrarEdicionMantenimiento();
    this.controlEdicionMantenimiento.marcarLimpio();
  }

  guardarEdicion(carro: CarroDto): void {
    const err = this.validarRegistroMantenimiento();
    if (err) {
      this.errorValidacion = err;
      this.mensajeEdicion = '';
      return;
    }
    this.errorValidacion = null;
    this.guardando = true;
    this.mensajeEdicion = '';
    const payload: Partial<CarroDto> = {
      ultimoConductor: this.editForm.ultimoConductor || null,
      conductorAsignado: this.editForm.ultimoConductor || null,
      ultimoMantenimiento: this.editForm.ultimoMantenimiento
        ? new Date(`${this.editForm.ultimoMantenimiento}T12:00:00.000Z`).toISOString()
        : null,
      proximoMantenimiento: this.editForm.proximoMantenimiento
        ? new Date(`${this.editForm.proximoMantenimiento}T12:00:00.000Z`).toISOString()
        : null,
      proximaRevisionTecnica: this.editForm.proximaRevisionTecnica
        ? new Date(`${this.editForm.proximaRevisionTecnica}T12:00:00.000Z`).toISOString()
        : null,
      ultimaRevisionBombaAgua: this.editForm.ultimaRevisionBombaAgua
        ? new Date(`${this.editForm.ultimaRevisionBombaAgua}T12:00:00.000Z`).toISOString()
        : null,
      descripcionUltimoMantenimiento: this.editForm.descripcionUltimoMantenimiento || null,
      ultimoInspector: this.editForm.ultimoInspector || null,
      firmaUltimoInspector: this.editForm.firmaUltimoInspector || null,
      fechaUltimaInspeccion: this.editForm.fechaUltimaInspeccion
        ? new Date(`${this.editForm.fechaUltimaInspeccion}T12:00:00.000Z`).toISOString()
        : null,
    };

    const esEdicionHistorial = !!this.mantenimientoEditId;

    const onOk = (actualizado: CarroDto) => {
      this.borradorLocal.eliminar('carro-mantenimiento', String(carro.id));
      Object.assign(carro, actualizado);
      this.guardando = false;
      this.cerrarEdicionMantenimiento();
      this.historialEdicionFila = null;
      this.controlEdicionMantenimiento.marcarLimpio();
      this.mensajeEdicion = esEdicionHistorial
        ? 'Registro de historial actualizado.'
        : 'Mantención registrada correctamente.';
      this.cargarHistorialGeneral();
      this.refrescarCarroEnVista(carro);
    };

    const onErr = (err: unknown) => {
      const payloadLocal = {
        editForm: { ...this.editForm },
        mantenimientoEditId: this.mantenimientoEditId,
      };
      if (
        manejarErrorGuardadoConBorradorLocal(
          this.borradorLocal,
          this.toast,
          'carro-mantenimiento',
          String(carro.id),
          payloadLocal,
          err,
          {
            mensajeError: 'No se pudo guardar el registro.',
            syncRequest: this.mantenimientoEditId
              ? {
                  kind: 'carro-mantenimiento-editar',
                  carroId: carro.id,
                  mantenimientoEditId: this.mantenimientoEditId,
                  body: payload as Record<string, unknown>,
                }
              : {
                  kind: 'carro-mantenimiento-crear',
                  carroId: carro.id,
                  body: payload as Record<string, unknown>,
                },
            onGuardadoLocal: () => {
              this.guardando = false;
              this.cerrarEdicionMantenimiento();
              this.controlEdicionMantenimiento.marcarLimpio();
              this.mensajeEdicion = 'Registro guardado en este dispositivo. Se sincronizará al volver internet.';
            },
          },
        )
      ) {
        this.errorValidacion = null;
        return;
      }
      this.guardando = false;
      this.mensajeEdicion = '';
      this.errorValidacion =
        err && typeof err === 'object' && 'error' in err && (err as { error?: { message?: string } }).error?.message
          ? String((err as { error?: { message?: string } }).error?.message)
          : 'No se pudo guardar el registro.';
    };

    if (this.mantenimientoEditId) {
      const editId = this.mantenimientoEditId;
      this.carrosApi.actualizarMantenimientoHistorial(editId, payload).subscribe({
        next: () => {
          this.carrosApi.obtener(carro.id).subscribe({
            next: (actualizado) => onOk(actualizado),
            error: onErr,
          });
        },
        error: onErr,
      });
      return;
    }

    this.carrosApi.actualizar(carro.id, payload).subscribe({
      next: (actualizado) => onOk(actualizado),
      error: onErr,
    });
  }

  diasRestantes(fechaIso: string | null | undefined): number | null {
    if (!fechaIso) return null;
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  textoAlerta(fechaIso: string | null | undefined, etiqueta: string): string | null {
    const dias = this.diasRestantes(fechaIso);
    if (dias == null) return null;
    if (dias < 0) return `${etiqueta} vencido hace ${Math.abs(dias)} día(s).`;
    if (dias === 0) return `${etiqueta} vence hoy.`;
    if (dias <= 30) return `${etiqueta} vence este mes (${dias} día(s) restantes).`;
    if (dias <= 90) return `${etiqueta} próximo (${dias} día(s) restantes).`;
    return null;
  }

  alertaMantenimiento(c: CarroDto): string | null {
    return this.textoAlerta(c.proximoMantenimiento, 'Mantención');
  }

  alertaRevisionTecnica(c: CarroDto): string | null {
    return this.textoAlerta(c.proximaRevisionTecnica, 'Revisión técnica');
  }

  private fechaProximoPermisoCirculacion(c: CarroDto): string | null {
    if (!c.fechaUltimaInspeccion) return null;
    const d = new Date(c.fechaUltimaInspeccion);
    if (Number.isNaN(d.getTime())) return null;
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  }

  alertaPermisoCirculacion(c: CarroDto): string | null {
    return this.textoAlerta(this.fechaProximoPermisoCirculacion(c), 'Permiso de circulación');
  }

  alertaDatosMantenimientoFaltantes(c: CarroDto): string | null {
    const faltan: string[] = [];
    if (!c.proximoMantenimiento) faltan.push('próximo mantenimiento');
    if (!c.proximaRevisionTecnica) faltan.push('revisión técnica');
    if (!c.fechaUltimaInspeccion) faltan.push('inspección');
    if (faltan.length === 0) return null;
    return `Sin fechas registradas (${faltan.join(', ')}). Registre un mantenimiento en la ficha.`;
  }

  hayAlertasCarro(c: CarroDto): boolean {
    return !!(
      this.alertaDatosMantenimientoFaltantes(c) ||
      this.alertaMantenimiento(c) ||
      this.alertaRevisionTecnica(c) ||
      this.alertaPermisoCirculacion(c)
    );
  }

  stats(carros: CarroDto[]): { total: number; operativas: number; mantenimiento: number } {
    const total = carros.length;
    const operativas = carros.filter(
      (c) => c.estadoOperativo === 1 && !this.mantenimientoVencido(c),
    ).length;
    const mantenimiento = total - operativas;
    return { total, operativas, mantenimiento };
  }

  async cambiarEstado(carro: CarroDto, nuevoEstado: number): Promise<void> {
    const anterior = carro.estadoOperativo;
    if (nuevoEstado === anterior) {
      this.estadoOperativoUi = anterior;
      return;
    }

    const confirmacion = await solicitarMotivoCambioEstado(this.cambioEstadoDialog, {
      title: 'Cambiar estado operativo',
      message: `Vas a cambiar el estado de ${carro.nomenclatura}. Esta decisión queda registrada en auditoría.`,
      estadoAnterior: this.etiquetaEstadoOperativo(anterior),
      estadoNuevo: this.etiquetaEstadoOperativo(nuevoEstado),
    });
    if (!confirmacion) {
      this.estadoOperativoUi = anterior;
      this.cdr.markForCheck();
      return;
    }

    this.carrosApi
      .toggleEstado(carro.id, nuevoEstado, {
        motivo: confirmacion.motivo,
        fechaEfectiva: confirmacion.fecha,
      })
      .subscribe({
        next: () => {
          carro.estadoOperativo = nuevoEstado;
          this.estadoOperativoUi = nuevoEstado;
          this.toast.exito(
            `Carro ${carro.nomenclatura} ahora está ${this.etiquetaEstadoOperativo(nuevoEstado).toLowerCase()}.`,
          );
        },
        error: (err) => {
          this.estadoOperativoUi = anterior;
          this.toast.error(
            typeof err?.error?.message === 'string'
              ? err.error.message
              : 'Error al cambiar el estado del carro',
          );
        },
      });
  }

  tarjetasResumenFleet(s: { total: number; operativas: number; mantenimiento: number }): Array<{
    key: string;
    valor: string;
    etiqueta: string;
    border: string;
    icon: string;
    iconColor: string;
  }> {
    return [
      {
        key: 'total',
        valor: String(s.total),
        etiqueta: 'Unidades totales',
        border: 'border-gray-700',
        icon: 'truck',
        iconColor: 'text-red-500',
      },
      {
        key: 'ok',
        valor: String(s.operativas),
        etiqueta: 'Operativas',
        border: 'border-green-600/60',
        icon: 'circle-check',
        iconColor: 'text-green-500',
      },
      {
        key: 'mant',
        valor: String(s.mantenimiento),
        etiqueta: 'No operativas / mantención',
        border: 'border-amber-600/50',
        icon: 'triangle-alert',
        iconColor: 'text-amber-400',
      },
    ];
  }
}