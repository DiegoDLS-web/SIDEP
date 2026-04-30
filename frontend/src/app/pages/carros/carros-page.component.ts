import { CommonModule, formatDate } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, of, startWith, switchMap, tap, type Observable } from 'rxjs';
import type {
  CarroHistorialGeneralFila,
  CarroRegistroHistorialDto,
} from '../../models/carro-registro-historial.dto';
import type { CarroDto } from '../../models/carro.dto';
import { CarrosService } from '../../services/carros.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

type CarrosView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'list'; carros: CarroDto[] }
  | { status: 'detail'; carro: CarroDto };

@Component({
  selector: 'app-carros-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule, SignaturePadComponent],
  templateUrl: './carros-page.component.html',
})
export class CarrosPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly carrosApi = inject(CarrosService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly toast = inject(ToastService);

  /** Si el backend no trae `imagenUrl`, usamos la foto local conocida por unidad. */
  private readonly imagenPorNomenclatura: Record<string, string> = {
    'B-1': this.assetUrl('assets/carros/b1.png'),
    'BX-1': this.assetUrl('assets/carros/bx1.png'),
    'R-1': this.assetUrl('assets/carros/r1.png'),
  };

  readonly imagenFallback =
    'https://images.unsplash.com/photo-1588662880295-13d2b28127c6?w=1080&q=80&fm=jpg';
  hoveredCarroId: number | null = null;
  private readonly carroGlow = new Map<number, { x: number; y: number }>();
  editando = false;
  guardando = false;
  mensajeEdicion = '';
  errorValidacion: string | null = null;
  historialExpandidoId: number | null = null;
  paginaHistorialDetalle = 1;
  readonly tamanioHistorialDetalle = 10;

  /** Solo en vista lista: historial global de mantenciones. */
  historialGeneralFilas: CarroHistorialGeneralFila[] = [];
  historialGeneralLoading = false;
  filtroUnidadHistorial: number | 'TODAS' = 'TODAS';
  filtroHistorialDesde = '';
  filtroHistorialHasta = '';
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
        map((carro): CarrosView => ({ status: 'detail', carro })),
        tap(() => {
          this.historialGeneralFilas = [];
          this.historialGeneralLoading = false;
          this.paginaHistorialDetalle = 1;
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
    const f: { carroId?: number; desde?: string; hasta?: string } = {};
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

  totalPaginasHistorialGeneral(): number {
    return Math.max(1, Math.ceil(this.historialGeneralFilas.length / this.tamanioPaginaHistorialGeneral));
  }

  historialGeneralPaginado(): CarroHistorialGeneralFila[] {
    const i = (this.paginaHistorialGeneral - 1) * this.tamanioPaginaHistorialGeneral;
    return this.historialGeneralFilas.slice(i, i + this.tamanioPaginaHistorialGeneral);
  }

  cambiarPaginaHistorialGeneral(delta: number): void {
    const next = this.paginaHistorialGeneral + delta;
    const total = this.totalPaginasHistorialGeneral();
    this.paginaHistorialGeneral = Math.min(Math.max(next, 1), total);
  }

  irADetalleCarro(carroId: number): void {
    void this.router.navigate(['/carros', carroId]);
  }

  pdfHistorialGeneral(row: CarroHistorialGeneralFila): void {
    this.pdfExport.exportarRegistroHistorialCarro({
      nomenclatura: row.carro.nomenclatura,
      patente: row.carro.patente,
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

  imagenCarro(c: CarroDto): string {
    const raw = c.imagenUrl?.trim() ?? '';
    if (!raw) {
      return this.imagenPorNomenclatura[c.nomenclatura] ?? this.imagenFallback;
    }
    return this.normalizarUrlImagen(raw, c.nomenclatura);
  }

  onImageError(event: Event, c: CarroDto): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }
    const fallbackUnidad = this.imagenPorNomenclatura[c.nomenclatura];
    if (fallbackUnidad && !img.src.includes(fallbackUnidad)) {
      img.src = fallbackUnidad;
      return;
    }
    if (!img.src.includes(this.imagenFallback)) {
      img.src = this.imagenFallback;
    }
  }

  onCarroMouseMove(event: MouseEvent, carro: CarroDto): void {
    const el = event.currentTarget as HTMLElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.hoveredCarroId = carro.id;
    this.carroGlow.set(carro.id, { x, y });
  }

  onCarroMouseLeave(carro: CarroDto): void {
    if (this.hoveredCarroId === carro.id) {
      this.hoveredCarroId = null;
    }
  }

  estiloGlowCarro(carro: CarroDto): Record<string, string> {
    const pos = this.carroGlow.get(carro.id) ?? { x: 50, y: 50 };
    return {
      '--mx': `${pos.x}%`,
      '--my': `${pos.y}%`,
    };
  }

  claseVivaCarro(carro: CarroDto): string {
    if (carro.estadoOperativo) return 'sid-carro-vivo-ok';
    return 'sid-carro-vivo-mant';
  }

  private normalizarUrlImagen(raw: string, nomenclatura: string): string {
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
    return this.imagenPorNomenclatura[nomenclatura] ?? this.imagenFallback;
  }

  private assetUrl(path: string): string {
    return new URL(path, document.baseURI).toString();
  }

  /** Firma guardada como PNG en base64 (data URL). */
  esFirmaImagen(val: string | null | undefined): boolean {
    return !!val?.trim().startsWith('data:image');
  }

  trackHistorial(_i: number, h: CarroRegistroHistorialDto): number {
    return h.id;
  }

  historialDetallePaginado(c: CarroDto): CarroRegistroHistorialDto[] {
    const rows = c.historialRegistros ?? [];
    const i = (this.paginaHistorialDetalle - 1) * this.tamanioHistorialDetalle;
    return rows.slice(i, i + this.tamanioHistorialDetalle);
  }

  totalPaginasHistorialDetalle(c: CarroDto): number {
    const n = c.historialRegistros?.length ?? 0;
    return Math.max(1, Math.ceil(n / this.tamanioHistorialDetalle));
  }

  cambiarPaginaHistorialDetalle(delta: number, c: CarroDto): void {
    const total = this.totalPaginasHistorialDetalle(c);
    const next = this.paginaHistorialDetalle + delta;
    this.paginaHistorialDetalle = Math.min(Math.max(next, 1), total);
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
      id: 0,
      carroId: carro.id,
      creadoEn: new Date().toISOString(),
      ultimoMantenimiento: carro.ultimoMantenimiento,
      proximoMantenimiento: carro.proximoMantenimiento,
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

  verHistorial(registro: CarroRegistroHistorialDto): void {
    this.historialExpandidoId = this.historialExpandidoId === registro.id ? null : registro.id;
  }

  historialEstaExpandido(registro: CarroRegistroHistorialDto): boolean {
    return this.historialExpandidoId === registro.id;
  }

  editarDesdeHistorial(carro: CarroDto, registro: CarroRegistroHistorialDto): void {
    this.historialExpandidoId = registro.id;
    this.editando = true;
    this.errorValidacion = null;
    this.mensajeEdicion = 'Registro cargado desde historial para edición.';
    this.editForm.ultimoConductor = registro.ultimoConductor ?? '';
    this.editForm.ultimoMantenimiento = this.fechaInput(registro.ultimoMantenimiento);
    this.editForm.proximoMantenimiento = this.fechaInput(registro.proximoMantenimiento);
    this.editForm.proximaRevisionTecnica = this.fechaInput(registro.proximaRevisionTecnica);
    this.editForm.ultimaRevisionBombaAgua = this.fechaInput(registro.ultimaRevisionBombaAgua);
    this.editForm.descripcionUltimoMantenimiento = registro.descripcionUltimoMantenimiento ?? '';
    this.editForm.ultimoInspector = registro.ultimoInspector ?? '';
    this.editForm.firmaUltimoInspector = registro.firmaUltimoInspector ?? '';
    this.editForm.fechaUltimaInspeccion = this.fechaInput(registro.fechaUltimaInspeccion);
    this.editForm.ultimoConductor = registro.ultimoConductor ?? '';
    // Sincroniza dato visible inmediatamente en ficha sin guardar.
    carro.ultimoConductor = this.editForm.ultimoConductor || null;
  }

  estadoEtiqueta(c: CarroDto): string {
    return c.estadoOperativo ? 'Operativo' : 'En Mantenimiento';
  }

  estadoClaseTexto(c: CarroDto): string {
    return c.estadoOperativo ? 'text-green-500' : 'text-yellow-500';
  }

  kmTexto(km: number | null): string {
    if (km == null) {
      return '—';
    }
    return `${new Intl.NumberFormat('es-CL').format(km)} km`;
  }

  fechaCorta(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return formatDate(d, 'dd/MM/yyyy', 'es-CL');
  }

  /** Fecha formateada o texto visible cuando no hay dato (evita confundir con “huecos” en tema oscuro). */
  fechaMantenimiento(iso: string | null | undefined, sinDato = 'Sin registrar'): string {
    if (iso == null || String(iso).trim() === '') {
      return sinDato;
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return sinDato;
    }
    return formatDate(d, 'dd/MM/yyyy', 'es-CL');
  }

  textoOmitida(val: string | null | undefined, sinDato = 'Sin registrar'): string {
    const t = val?.trim();
    return t ? t : sinDato;
  }

  fechaHora(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
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
    if (!f.ultimoConductor.trim()) {
      return 'El último conductor es obligatorio.';
    }
    if (!f.ultimoMantenimiento) {
      return 'La fecha de último mantenimiento es obligatoria.';
    }
    if (!f.proximoMantenimiento) {
      return 'La fecha de próximo mantenimiento es obligatoria.';
    }
    if (!f.proximaRevisionTecnica) {
      return 'La fecha de próxima revisión técnica es obligatoria.';
    }
    if (!f.ultimaRevisionBombaAgua) {
      return 'La fecha de última revisión de bomba de agua es obligatoria.';
    }
    if (!f.descripcionUltimoMantenimiento.trim()) {
      return 'La descripción de la última mantención es obligatoria.';
    }
    if (!f.ultimoInspector.trim()) {
      return 'El último inspector es obligatorio.';
    }
    if (!this.esFirmaImagen(f.firmaUltimoInspector)) {
      return 'La firma del inspector es obligatoria (dibújala en el recuadro).';
    }
    if (!f.fechaUltimaInspeccion) {
      return 'La fecha de inspección es obligatoria.';
    }
    return null;
  }

  iniciarEdicion(carro: CarroDto): void {
    this.editando = true;
    this.mensajeEdicion = '';
    this.errorValidacion = null;
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
      this.toast.advertencia(err);
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
        this.paginaHistorialDetalle = 1;
        this.mensajeEdicion = 'Datos del carro actualizados correctamente.';
        this.toast.exito('Datos del carro actualizados correctamente.');
      },
      error: () => {
        this.guardando = false;
        this.mensajeEdicion = 'No se pudo guardar los cambios del carro.';
        this.toast.error('No se pudo guardar los cambios del carro.');
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
    return null;
  }

  alertaMantenimiento(c: CarroDto): string | null {
    return this.textoAlerta(c.proximoMantenimiento, 'Mantención');
  }

  alertaRevisionTecnica(c: CarroDto): string | null {
    return this.textoAlerta(c.proximaRevisionTecnica, 'Revisión técnica');
  }

  alertaPermisoCirculacion(c: CarroDto): string | null {
    // Se reutiliza la misma fecha de vencimiento de revisión técnica/permiso.
    return this.textoAlerta(c.proximaRevisionTecnica, 'Permiso de circulación');
  }

  stats(carros: CarroDto[]): { total: number; operativas: number; mantenimiento: number } {
    const total = carros.length;
    const operativas = carros.filter((c) => c.estadoOperativo).length;
    return { total, operativas, mantenimiento: total - operativas };
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
