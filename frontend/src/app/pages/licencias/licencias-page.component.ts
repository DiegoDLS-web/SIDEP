import { CommonModule, formatDate } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import type { LicenciaEstado, LicenciaMedicaDto, LicenciasResumenDto } from '../../models/licencias.dto';
import { AuthService } from '../../services/auth.service';
import { LicenciasService } from '../../services/licencias.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { exportarExcelSidep } from '../../utils/excel-export.util';
import { SIDEP_ACTION_ICON } from '../../shared/sidep-action-icons';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidEdicionPendienteBannerComponent } from '../../shared/sid-edicion-pendiente-banner.component';
import { etiquetaOficialidadCargo } from '../usuarios/usuario-registro.constants';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { CambioEstadoDialogService } from '../../services/cambio-estado-dialog.service';
import { solicitarMotivoCambioEstado } from '../../utils/cambio-estado.util';
import { confirmarDescartarCambios } from '../../utils/confirmar-descartar.util';
import type { ComponenteConEdicionPendiente } from '../../guards/edicion-pendiente.guard';
import { registrarEdicionPendienteGlobal } from '../../utils/registrar-edicion-pendiente-global.util';

@Component({
  selector: 'app-licencias-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule, SidDateInputComponent, SidEdicionPendienteBannerComponent],
  templateUrl: './licencias-page.component.html',
})
export class LicenciasPageComponent implements OnInit, ComponenteConEdicionPendiente {
  readonly icon = SIDEP_ACTION_ICON;
  private readonly api = inject(LicenciasService);
  private readonly auth = inject(AuthService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly cambioEstadoDialog = inject(CambioEstadoDialogService);

  private resolucionBaseline: Record<string, { estado: LicenciaEstado; observacion: string }> = {};

  constructor() {
    const destroyRef = inject(DestroyRef);
    registrarEdicionPendienteGlobal(destroyRef, () => this.tieneEdicionPendiente());
  }

  tieneEdicionPendiente(): boolean {
    if (this.modalNuevaSolicitudAbierta && this.solicitudTieneDatosSinGuardar()) return true;
    return this.puedeGestionar && this.tieneResolucionPendiente();
  }

  loading = false;
  guardando = false;
  error: string | null = null;
  errorGestion: string | null = null;
  okMsg: string | null = null;
  misLicencias: LicenciaMedicaDto[] = [];
  gestionLicencias: LicenciaMedicaDto[] = [];
  filtroGestion: '' | LicenciaEstado = '';
  filtroGestionTexto = '';
  filtroGestionDesde = '';
  filtroGestionHasta = '';

  filtroHistorialTexto = '';
  filtroHistorialEstado: '' | LicenciaEstado = '';
  filtroHistorialDesde = '';
  filtroHistorialHasta = '';
  resumen: LicenciasResumenDto = { fecha: '', mandoPermiso: [], sinPermiso: [], conLicencia: [] };

  form = {
    fechaInicio: '',
    fechaTermino: '',
    motivo: '',
    archivoUrl: '',
  };
  adjuntoNombre = '';
  adjuntoTipo = '';
  adjuntoError: string | null = null;
  adjuntoFile: File | null = null;
  adjuntoPreviewUrl: string | null = null;
  progresoCarga = 0;

  estadoEdicion: Record<string, LicenciaEstado> = {};
  observacionEdicion: Record<string, string> = {};
  paginaGestion = 1;
  readonly tamanioPaginaGestion = 6;
  paginaHistorial = 1;
  readonly tamanioPaginaHistorial = 8;
  modalNuevaSolicitudAbierta = false;
  /** Panel del resumen diario expandido por defecto. */
  resumenDiarioVisible = true;

  toggleResumenDiario(): void {
    this.resumenDiarioVisible = !this.resumenDiarioVisible;
  }

  get hoyIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  get motivoChars(): number {
    return this.form.motivo.trim().length;
  }

  get fechasInvalidas(): boolean {
    if (!this.form.fechaInicio || !this.form.fechaTermino) {
      return false;
    }
    return new Date(this.form.fechaTermino).getTime() < new Date(this.form.fechaInicio).getTime();
  }

  get diasSolicitados(): number {
    if (!this.form.fechaInicio || !this.form.fechaTermino || this.fechasInvalidas) {
      return 0;
    }
    const ini = new Date(`${this.form.fechaInicio}T00:00:00`);
    const fin = new Date(`${this.form.fechaTermino}T00:00:00`);
    const diff = Math.floor((fin.getTime() - ini.getTime()) / 86_400_000) + 1;
    return Math.max(0, diff);
  }

  get formInvalido(): boolean {
    if (!this.form.fechaInicio || !this.form.fechaTermino) {
      return true;
    }
    if (this.fechasInvalidas) {
      return true;
    }
    return this.motivoChars < 8;
  }

  get totalPendientes(): number {
    return this.gestionLicencias.filter((x) => x.estado === 'PENDIENTE').length;
  }

  get totalAprobadas(): number {
    return this.gestionLicencias.filter((x) => x.estado === 'APROBADA').length;
  }

  get totalRechazadas(): number {
    return this.gestionLicencias.filter((x) => x.estado === 'RECHAZADA').length;
  }

  get totalGestion(): number {
    return this.gestionLicencias.length;
  }

  get totalPaginasGestion(): number {
    return Math.max(1, Math.ceil(this.gestionLicenciasFiltradas.length / this.tamanioPaginaGestion));
  }

  get paginaGestionVista(): number {
    return Math.min(this.paginaGestion, this.totalPaginasGestion);
  }

  get gestionLicenciasPaginadas(): LicenciaMedicaDto[] {
    const paginaActiva = Math.min(this.paginaGestion, this.totalPaginasGestion);
    const inicio = (paginaActiva - 1) * this.tamanioPaginaGestion;
    return this.gestionLicenciasFiltradas.slice(inicio, inicio + this.tamanioPaginaGestion);
  }

  get gestionLicenciasFiltradas(): LicenciaMedicaDto[] {
    return this.gestionLicencias.filter((l) => {
      const nombre = (l.usuario?.nombre || '').toLowerCase();
      const motivo = (l.motivo || '').toLowerCase();
      const estado = l.estado;
      const txt = this.filtroGestionTexto.trim().toLowerCase();

      const matchTexto = !txt || nombre.includes(txt) || motivo.includes(txt);
      const matchTab = !this.filtroGestion || estado === this.filtroGestion;
      const matchDesde = !this.filtroGestionDesde || l.fechaInicio >= this.filtroGestionDesde;
      const matchHasta = !this.filtroGestionHasta || l.fechaInicio <= this.filtroGestionHasta;

      return matchTexto && matchTab && matchDesde && matchHasta;
    });
  }

  get totalPaginasHistorial(): number {
    return Math.max(1, Math.ceil(this.historialFiltrado.length / this.tamanioPaginaHistorial));
  }

  get paginaHistorialVista(): number {
    return Math.min(this.paginaHistorial, this.totalPaginasHistorial);
  }

  get historialPaginado(): LicenciaMedicaDto[] {
    const i = (this.paginaHistorialVista - 1) * this.tamanioPaginaHistorial;
    return this.historialFiltrado.slice(i, i + this.tamanioPaginaHistorial);
  }

  cambiarPaginaHistorial(delta: number): void {
    const next = this.paginaHistorial + delta;
    this.paginaHistorial = Math.min(this.totalPaginasHistorial, Math.max(1, next));
  }

  onFiltroHistorialChange(): void {
    this.paginaHistorial = 1;
  }

  /** Historial “general”: para oficialidad es el listado completo de la compañía; para el resto, solo solicitudes propias. */
  private historialGeneralFuente(): LicenciaMedicaDto[] {
    return this.puedeGestionar ? this.gestionLicencias : this.misLicencias;
  }

  get historialFiltrado(): LicenciaMedicaDto[] {
    return this.historialGeneralFuente().filter((l) => {
      const nombre = (l.usuario?.nombre || '').toLowerCase();
      const motivo = (l.motivo || '').toLowerCase();
      const estado = l.estado;
      const txt = this.filtroHistorialTexto.trim().toLowerCase();

      const matchTexto = !txt || nombre.includes(txt) || motivo.includes(txt);
      const matchEstado = !this.filtroHistorialEstado || estado === this.filtroHistorialEstado;
      const matchDesde = !this.filtroHistorialDesde || l.fechaInicio >= this.filtroHistorialDesde;
      const matchHasta = !this.filtroHistorialHasta || l.fechaInicio <= this.filtroHistorialHasta;

      return matchTexto && matchEstado && matchDesde && matchHasta;
    });
  }

  get resumenDiarioVacio(): boolean {
    return (
      this.resumen.conLicencia.length === 0 &&
      this.resumen.mandoPermiso.length === 0 &&
      this.resumen.sinPermiso.length === 0
    );
  }

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.loading = true;
    this.error = null;
    this.errorGestion = null;
    this.okMsg = null;
    this.api
      .listarMisLicencias()
      .pipe(
        catchError(() => {
          this.error = 'No se pudo cargar tu historial de licencias.';
          return of([]);
        }),
        finalize(() => (this.loading = false)),
      )
      .subscribe((rows) => {
        this.misLicencias = rows;
        this.paginaHistorial = 1;
      });
    if (this.puedeGestionar) {
      this.cargarGestion();
      this.cargarResumen();
    }
  }

  cargarGestion(): void {
    this.errorGestion = null;
    this.api
      .listarGestion(undefined)
      .pipe(
        catchError(() => {
          this.errorGestion = 'No se pudo cargar la gestión de licencias.';
          return of([]);
        }),
      )
      .subscribe((rows) => {
        this.gestionLicencias = rows;
        this.paginaGestion = 1;
        this.paginaHistorial = 1;
        this.sincronizarBaselineResolucion(rows);
      });
  }

  private sincronizarBaselineResolucion(rows: LicenciaMedicaDto[]): void {
    this.resolucionBaseline = {};
    for (const l of rows) {
      this.resolucionBaseline[l.id] = {
        estado: l.estado,
        observacion: l.observacionResolucion ?? '',
      };
      this.estadoEdicion[l.id] = l.estado;
      this.observacionEdicion[l.id] = l.observacionResolucion ?? '';
    }
  }

  filaResolucionTieneCambios(id: string): boolean {
    const base = this.resolucionBaseline[id];
    if (!base) return false;
    return (
      this.estadoEdicion[id] !== base.estado ||
      (this.observacionEdicion[id] ?? '').trim() !== base.observacion.trim()
    );
  }

  tieneResolucionPendiente(): boolean {
    return this.gestionLicencias.some((l) => this.filaResolucionTieneCambios(l.id));
  }

  private revertirResolucionPendiente(): void {
    for (const l of this.gestionLicencias) {
      const base = this.resolucionBaseline[l.id];
      if (!base) continue;
      this.estadoEdicion[l.id] = base.estado;
      this.observacionEdicion[l.id] = base.observacion;
    }
  }

  private async confirmarSiHayResolucionPendiente(mensaje: string): Promise<boolean> {
    if (!this.tieneResolucionPendiente()) return true;
    const ok = await confirmarDescartarCambios(this.confirmDialog, true, {
      title: 'Cambios sin guardar',
      message: mensaje,
    });
    if (ok) this.revertirResolucionPendiente();
    return ok;
  }

  cargarResumen(): void {
    this.api
      .obtenerResumen(this.hoyIso)
      .pipe(
        catchError(() => {
          this.errorGestion = 'No se pudo cargar el resumen diario de licencias.';
          return of({ fecha: '', mandoPermiso: [], sinPermiso: [], conLicencia: [] } as LicenciasResumenDto);
        }),
      )
      .subscribe((rows) => {
        this.resumen = rows;
      });
  }

  crearLicencia(): void {
    this.error = null;
    this.okMsg = null;
    this.adjuntoError = null;
    if (this.formInvalido) {
      this.error = 'Revisa fechas y escribe un motivo de al menos 8 caracteres.';
      return;
    }
    this.guardando = true;
    this.progresoCarga = 0;
    this.api
      .crearConAdjunto({
        fechaInicio: this.form.fechaInicio,
        fechaTermino: this.form.fechaTermino,
        motivo: this.form.motivo.trim(),
        adjunto: this.adjuntoFile,
      })
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? 0;
            this.progresoCarga = total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0;
            return;
          }
          if (event.type === HttpEventType.Response) {
            this.progresoCarga = 100;
            this.okMsg = 'Solicitud enviada correctamente.';
            this.limpiarFormulario();
            this.cerrarModalNuevaSolicitud();
            this.cargarTodo();
          }
        },
        error: (e) => {
          this.error = e?.error?.error ?? 'No se pudo enviar la solicitud.';
        },
      });
  }

  async guardarEstado(item: LicenciaMedicaDto): Promise<void> {
    const estado = this.estadoEdicion[item.id];
    if (!estado) {
      return;
    }
    const base = this.resolucionBaseline[item.id];
    if (base && estado === base.estado) {
      return;
    }

    const confirmacion = await solicitarMotivoCambioEstado(this.cambioEstadoDialog, {
      title: 'Resolver licencia',
      message: `Vas a marcar la licencia de ${item.usuario?.nombre ?? item.usuarioId} como ${this.etiquetaEstado(estado)}.`,
      estadoAnterior: base ? this.etiquetaEstado(base.estado) : this.etiquetaEstado(item.estado),
      estadoNuevo: this.etiquetaEstado(estado),
    });
    if (!confirmacion) return;

    this.api
      .cambiarEstado(item.id, estado, confirmacion.motivo, confirmacion.fecha)
      .subscribe({
        next: () => {
          this.okMsg = `Estado actualizado para licencia #${item.id}.`;
          this.observacionEdicion[item.id] = confirmacion.motivo;
          this.cargarGestion();
        },
        error: (e) => {
          this.error = e?.error?.error ?? e?.error?.message ?? 'No se pudo actualizar estado.';
        },
      });
  }

  async setFiltro(estado: '' | LicenciaEstado): Promise<void> {
    const ok = await this.confirmarSiHayResolucionPendiente(
      'Tienes cambios sin guardar al resolver licencias. Si cambias el filtro se descartarán.',
    );
    if (!ok) return;
    this.filtroGestion = estado;
    this.paginaGestion = 1;
  }

  async limpiarFiltrosGestion(): Promise<void> {
    const ok = await this.confirmarSiHayResolucionPendiente(
      'Tienes cambios sin guardar al resolver licencias. Si limpias los filtros se descartarán.',
    );
    if (!ok) return;
    this.filtroGestion = '';
    this.filtroGestionTexto = '';
    this.filtroGestionDesde = '';
    this.filtroGestionHasta = '';
    this.paginaGestion = 1;
  }

  limpiarFiltrosHistorial(): void {
    this.filtroHistorialTexto = '';
    this.filtroHistorialEstado = '';
    this.filtroHistorialDesde = '';
    this.filtroHistorialHasta = '';
    this.paginaHistorial = 1;
  }

  async cambiarPaginaGestion(delta: number): Promise<void> {
    const ok = await this.confirmarSiHayResolucionPendiente(
      'Tienes observaciones o estados sin guardar. Si cambias de página se descartarán.',
    );
    if (!ok) return;
    const next = this.paginaGestion + delta;
    if (next < 1 || next > this.totalPaginasGestion) {
      return;
    }
    this.paginaGestion = next;
  }

  abrirModalNuevaSolicitud(): void {
    this.modalNuevaSolicitudAbierta = true;
    this.error = null;
  }

  cerrarModalNuevaSolicitud(): void {
    this.modalNuevaSolicitudAbierta = false;
  }

  private solicitudTieneDatosSinGuardar(): boolean {
    return !!(
      this.form.fechaInicio?.trim() ||
      this.form.fechaTermino?.trim() ||
      this.form.motivo?.trim() ||
      this.adjuntoFile
    );
  }

  solicitudTieneCambios(): boolean {
    return this.solicitudTieneDatosSinGuardar();
  }

  async intentarCerrarModalNuevaSolicitud(): Promise<void> {
    const ok = await confirmarDescartarCambios(this.confirmDialog, this.solicitudTieneDatosSinGuardar(), {
      title: 'Cerrar solicitud',
      message: 'Tienes una solicitud en curso. Si cierras se perderán los datos ingresados. ¿Deseas continuar?',
    });
    if (!ok) return;
    this.limpiarFormulario();
    this.cerrarModalNuevaSolicitud();
  }

  setEstadoRapido(item: LicenciaMedicaDto, estado: LicenciaEstado): void {
    this.estadoEdicion[item.id] = estado;
  }

  async onAdjuntoSeleccionado(event: Event): Promise<void> {
    this.adjuntoError = null;
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.adjuntoError = 'El archivo supera 8 MB. Adjunta uno más liviano.';
      if (input) input.value = '';
      return;
    }
    const permitidos = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/gif',
    ];
    if (!permitidos.includes((file.type || '').toLowerCase())) {
      this.adjuntoError = 'Formato no válido. Usa PDF o imagen (PNG/JPG/WEBP/GIF).';
      if (input) input.value = '';
      return;
    }
    try {
      this.liberarPreviewAdjunto();
      this.form.archivoUrl = 'archivo-adjunto';
      this.adjuntoFile = file;
      this.adjuntoNombre = file.name;
      this.adjuntoTipo = file.type || 'application/octet-stream';
      this.adjuntoPreviewUrl = URL.createObjectURL(file);
    } catch {
      this.adjuntoError = 'No se pudo leer el archivo adjunto.';
    } finally {
      if (input) input.value = '';
    }
  }

  quitarAdjunto(): void {
    this.form.archivoUrl = '';
    this.adjuntoFile = null;
    this.adjuntoNombre = '';
    this.adjuntoTipo = '';
    this.adjuntoError = null;
    this.liberarPreviewAdjunto();
  }

  tieneAdjunto(archivoUrl: string | null | undefined): boolean {
    const value = String(archivoUrl ?? '').trim();
    return value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://');
  }

  esPreviewImagen(): boolean {
    return (this.adjuntoTipo || '').startsWith('image/');
  }

  esPreviewPdf(): boolean {
    return (this.adjuntoTipo || '').toLowerCase() === 'application/pdf';
  }

  private liberarPreviewAdjunto(): void {
    if (this.adjuntoPreviewUrl) {
      URL.revokeObjectURL(this.adjuntoPreviewUrl);
      this.adjuntoPreviewUrl = null;
    }
  }

  private limpiarFormulario(): void {
    this.form = { fechaInicio: '', fechaTermino: '', motivo: '', archivoUrl: '' };
    this.adjuntoFile = null;
    this.adjuntoNombre = '';
    this.adjuntoTipo = '';
    this.adjuntoError = null;
    this.progresoCarga = 0;
    this.liberarPreviewAdjunto();
  }

  etiquetaEstado(estado: LicenciaEstado): string {
    if (estado === 'APROBADA') return 'Aprobada';
    if (estado === 'RECHAZADA') return 'Rechazada';
    if (estado === 'ANULADA') return 'Anulada';
    return 'Pendiente';
  }

  /** N° correlativo por año calendario (orden de creación), más legible que el UUID. */
  correlativoLicencia(licencia: LicenciaMedicaDto, lista: LicenciaMedicaDto[]): string {
    const anio = this.anioLicencia(licencia);
    const delAnio = lista
      .filter((l) => this.anioLicencia(l) === anio)
      .sort((a, b) => {
        const ta = new Date(a.createdAt || a.fechaInicio).getTime();
        const tb = new Date(b.createdAt || b.fechaInicio).getTime();
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      });
    const idx = delAnio.findIndex((l) => l.id === licencia.id);
    const numero = idx >= 0 ? idx + 1 : delAnio.length + 1;
    return `N° ${numero}/${anio}`;
  }

  private anioLicencia(licencia: LicenciaMedicaDto): number {
    const ref = licencia.createdAt || licencia.fechaInicio;
    const d = new Date(ref);
    return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  claseEstado(estado: LicenciaEstado): string {
    if (estado === 'APROBADA') return 'bg-emerald-500/20 text-emerald-200';
    if (estado === 'RECHAZADA') return 'bg-red-500/20 text-red-200';
    if (estado === 'ANULADA') return 'bg-gray-500/20 text-gray-200';
    return 'bg-amber-500/20 text-amber-200';
  }

  fecha(iso: string): string {
    try {
      return formatDate(iso, 'dd/MM/yyyy', 'es-CL');
    } catch {
      return iso;
    }
  }

  etiquetaResumen(usuarioId: string): string {
    if (this.resumen.conLicencia.some((u) => u.id === usuarioId)) {
      return 'Con licencia';
    }
    if (this.resumen.mandoPermiso.some((u) => u.id === usuarioId)) {
      return 'Mandó permiso';
    }
    return 'Sin permiso';
  }

  aplicarFiltrosHistorial(): void {
    this.paginaHistorial = 1;
  }

  actualizarHistorialLicencias(): void {
    this.cargarTodo();
  }

  exportarHistorialExcel(): void {
    const rows = this.historialFiltrado;
    if (rows.length === 0) return;
    const cols = this.puedeGestionar
      ? ['Solicitante', 'RUT', 'Período inicio', 'Período término', 'Motivo', 'Estado', 'Resolución', 'Resuelto por']
      : ['Período inicio', 'Período término', 'Motivo', 'Estado', 'Resolución'];
    const body = rows.map((l) => {
      const rp = l.resueltoPor;
      const resueltoPor = rp?.nombre ?? '';
      if (this.puedeGestionar) {
        return [
          l.usuario?.nombre || `Usuario #${l.usuarioId}`,
          l.usuario?.rut ?? '',
          this.fecha(l.fechaInicio),
          this.fecha(l.fechaTermino),
          l.motivo,
          this.etiquetaEstado(l.estado),
          l.observacionResolucion || '',
          resueltoPor,
        ];
      }
      return [
        this.fecha(l.fechaInicio),
        this.fecha(l.fechaTermino),
        l.motivo,
        this.etiquetaEstado(l.estado),
        l.observacionResolucion || '',
      ];
    });
    exportarExcelSidep({
      titulo: 'SIDEP · Historial de licencias médicas',
      meta: [`Registros: ${rows.length}`],
      columnas: cols,
      filas: body,
      nombreHoja: 'Licencias',
      nombreArchivo: `SIDEP-historial-licencias-${new Date().toISOString().slice(0, 10)}.xlsx`,
      anchosCols: this.puedeGestionar ? [22, 14, 12, 12, 36, 12, 28, 20] : [12, 12, 40, 12, 30],
    });
  }

  exportarHistorialPdf(): void {
    const rows = this.historialFiltrado;
    if (rows.length === 0) return;
    const columnas = this.puedeGestionar
      ? ['Solicitante', 'Período', 'Motivo', 'Estado', 'Resolución']
      : ['Período', 'Motivo', 'Estado', 'Resolución'];
    const filas = rows.map((l) =>
      this.puedeGestionar
        ? [
            l.usuario?.nombre || `Usuario #${l.usuarioId}`,
            `${this.fecha(l.fechaInicio)} — ${this.fecha(l.fechaTermino)}`,
            (l.motivo ?? '').slice(0, 120),
            this.etiquetaEstado(l.estado),
            (l.observacionResolucion ?? '').slice(0, 80),
          ]
        : [
            `${this.fecha(l.fechaInicio)} — ${this.fecha(l.fechaTermino)}`,
            (l.motivo ?? '').slice(0, 160),
            this.etiquetaEstado(l.estado),
            (l.observacionResolucion ?? '').slice(0, 80),
          ],
    );
    void this.pdfExport.exportarHistorialTabla({
      titulo: 'Historial general de licencias',
      subtitulo: 'SIDEP · Licencias médicas',
      columnas,
      filas,
      segmentosNombre: ['Licencias', 'Historial'],
      landscape: true,
      resumen: [`Total registros: ${rows.length}`],
    });
  }

  descargarLicenciaPdf(item: LicenciaMedicaDto): void {
    const rp = item.resueltoPor;
    const cargoResolutor =
      rp != null ? etiquetaOficialidadCargo(rp.cargoOficialidad ?? null, rp.rol) : null;
    void this.pdfExport.exportarLicencia({
      id: item.id,
      solicitante: item.usuario?.nombre || `Usuario #${item.usuarioId}`,
      rut: item.usuario?.rut ?? null,
      rol: item.usuario?.rol ?? null,
      fechaInicio: item.fechaInicio,
      fechaTermino: item.fechaTermino,
      motivo: item.motivo,
      estado: this.etiquetaEstado(item.estado),
      observacionResolucion: item.observacionResolucion,
      resueltoPor: rp?.nombre ?? null,
      resueltoCargoEtiqueta: cargoResolutor,
      resueltoEn: item.resueltoEn ?? null,
      firmaResolutor: rp?.firmaImagen ?? null,
      estadoCodigo: item.estado,
    });
  }
}
