import { CommonModule, formatDate } from '@angular/common';
import { Component, inject } from '@angular/core';
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
import { UsuariosService } from '../../services/usuarios.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { nombreListaSoloPersona } from '../usuarios/usuario-registro.constants';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SignaturePadComponent } from '../../shared/signature-pad.component';
import { nombreArchivoPdfSidep } from '../../utils/pdf-nombre-archivo.util';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  ],
  templateUrl: './carros-page.component.html',
})
export class CarrosPageComponent {
  readonly nombreListaSoloPersona = nombreListaSoloPersona;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly carrosApi = inject(CarrosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly toast = inject(ToastService);

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
  guardando = false;
  mensajeEdicion = '';
  errorValidacion: string | null = null;
  historialGeneralFilas: CarroHistorialGeneralFila[] = [];
  historialGeneralLoading = false;
  historialGeneralVistaFila: CarroHistorialGeneralFila | null = null;
  
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

  readonly vm$ = this.route.paramMap.pipe(
    switchMap((pm) => {
      const id = pm.get('id');
      if (!id) {
        return this.carrosApi.listar().pipe(
          switchMap((carros) => this.hidratarListadoDesdeHistorialSiFalta(carros)),
          map((carros): CarrosView => ({ status: 'list', carros })),
          tap((v) => {
            if (v.status === 'list') {
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
        switchMap((carro) => this.hidratarDetalleDesdeHistorialSiFalta(carro)),
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
        tap(() => {
          this.historialGeneralFilas = [];
          this.historialGeneralLoading = false;
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
    const columnas = ['Guardado', 'Unidad', 'Inspector', 'Inspección'];
    const body = filas.map((row) => {
      const g = this.splitFh(row.creadoEn);
      return [g.fecha + ' ' + g.hora, row.carro.nomenclatura, row.ultimoInspector ?? '', this.fechaCorta(row.fechaUltimaInspeccion)];
    });
    const aoa = [['SIDEP · Historial mantención'], [`Registros: ${filas.length}`], [], columnas, ...body];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `SIDEP-historial-mantencion-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  exportarHistorialGeneralPdf(): void {
    const filas = this.historialGeneralFiltrado();
    if (filas.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(11);
    doc.text('SIDEP · Historial general de mantención', 14, 14);
    const body = filas.map((row) => {
      const g = this.splitFh(row.creadoEn);
      return [g.fecha + ' ' + g.hora, row.carro.nomenclatura, row.ultimoInspector ?? '', this.fechaCorta(row.fechaUltimaInspeccion)];
    });
    autoTable(doc, {
      startY: 20,
      head: [['Guardado', 'Unidad', 'Inspector', 'Inspección']],
      body,
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    doc.save(nombreArchivoPdfSidep(['Carro', 'Historial mantención'], new Date()));
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
    const out: CarroDto = { ...carro };
    for (const campo of this.camposMantenimientoHistorial()) {
      const valorSnap = snap[campo];
      if (valorSnap == null || String(valorSnap).trim() === '') continue;
      const claveDto = campo as keyof CarroDto;
      const actual = out[claveDto];
      if (actual != null && String(actual).trim() !== '') continue;
      (out as unknown as Record<string, unknown>)[claveDto as string] = valorSnap;
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
          map((rows) => ({ id: c.id, snap: rows[0] ?? null })),
          catchError(() => of({ id: c.id, snap: null })),
        ),
      ),
    ).pipe(
      map((snaps) => {
        const porId = new Map(snaps.map((s) => [String(s.id), s.snap]));
        return carros.map((c) => this.fusionarCarroConHistorial(c, porId.get(String(c.id)) ?? null));
      }),
    );
  }

  private hidratarDetalleDesdeHistorialSiFalta(carro: CarroDto): Observable<CarroDto> {
    if (!this.carroNecesitaHistorial(carro)) return of(carro);
    return this.carrosApi.historialGeneral({ carroId: carro.id }).pipe(
      map((rows) => this.fusionarCarroConHistorial(carro, rows[0] ?? null)),
      catchError(() => of(carro)),
    );
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

  estadoEtiqueta(c: CarroDto): string {
    return c.estadoOperativo === 1 ? 'Operativo' : 'En Mantenimiento';
  }

  estadoClaseTexto(c: CarroDto): string {
    return c.estadoOperativo === 1 ? 'text-green-500' : 'text-yellow-500';
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

  iniciarEdicion(carro: CarroDto): void {
    this.editando = true;
    this.mensajeEdicion = '';
    this.errorValidacion = null;
    this.rellenarEditFormDesdeCarro(carro);
    this.carrosApi.historialGeneral({ carroId: carro.id }).subscribe({
      next: (rows) => {
        const fusionado = this.fusionarCarroConHistorial(carro, rows[0] ?? null);
        Object.assign(carro, fusionado);
        this.rellenarEditFormDesdeCarro(fusionado);
      },
    });
  }

  private rellenarEditFormDesdeCarro(carro: CarroDto): void {
    this.editForm.ultimoConductor = carro.ultimoConductor ?? carro.conductorAsignado ?? '';
    this.editForm.ultimoMantenimiento = this.fechaInput(carro.ultimoMantenimiento);
    this.editForm.proximoMantenimiento = this.fechaInput(carro.proximoMantenimiento);
    this.editForm.proximaRevisionTecnica = this.fechaInput(carro.proximaRevisionTecnica);
    this.editForm.ultimaRevisionBombaAgua = this.fechaInput(carro.ultimaRevisionBombaAgua);
    this.editForm.descripcionUltimoMantenimiento = carro.descripcionUltimoMantenimiento ?? '';
    this.editForm.ultimoInspector = carro.ultimoInspector ?? '';
    this.editForm.firmaUltimoInspector = carro.firmaUltimoInspector ?? '';
    this.editForm.fechaUltimaInspeccion = this.fechaInput(carro.fechaUltimaInspeccion);
  }

  cancelarEdicion(): void {
    this.editando = false;
    this.guardando = false;
    this.errorValidacion = null;
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
    this.carrosApi.actualizar(carro.id, payload).subscribe({
      next: (actualizado) => {
        Object.assign(carro, actualizado);
        this.guardando = false;
        this.editando = false;
        this.mensajeEdicion = 'Datos del carro actualizados correctamente.';
        this.cargarHistorialGeneral();
        this.carrosApi.obtener(carro.id).subscribe({
          next: (refresco) => Object.assign(carro, refresco),
        });
      },
      error: () => {
        this.guardando = false;
        this.mensajeEdicion = 'No se pudo guardar los cambios del carro.';
      },
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

  alertaPermisoCirculacion(c: CarroDto): string | null {
    return this.textoAlerta(c.proximaRevisionTecnica, 'Permiso de circulación');
  }

  stats(carros: CarroDto[]): { total: number; operativas: number; mantenimiento: number } {
    const total = carros.length;
    const operativas = carros.filter((c) => c.estadoOperativo === 1).length;
    return { total, operativas, mantenimiento: total - operativas };
  }

  toggleEstado(carro: CarroDto): void {
    const nuevoEstado = carro.estadoOperativo === 1 ? 0 : 1;
    this.carrosApi.toggleEstado(carro.id, nuevoEstado).subscribe({
      next: (res: any) => {
        carro.estadoOperativo = nuevoEstado;
        alert(`Carro ${carro.nomenclatura} ahora está ${nuevoEstado === 1 ? 'Operativo' : 'Fuera de Servicio'}.`);
      },
      error: (err: any) => {
        alert('Error al cambiar el estado del carro');
        console.error(err);
      }
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
        etiqueta: 'En mantenimiento',
        border: 'border-amber-600/50',
        icon: 'triangle-alert',
        iconColor: 'text-amber-400',
      },
    ];
  }
}