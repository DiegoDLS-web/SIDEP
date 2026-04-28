import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import type { LicenciaEstado, LicenciaMedicaDto, LicenciasResumenDto } from '../../models/licencias.dto';
import { AuthService } from '../../services/auth.service';
import { LicenciasService } from '../../services/licencias.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-licencias-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './licencias-page.component.html',
})
export class LicenciasPageComponent implements OnInit {
  private readonly api = inject(LicenciasService);
  private readonly auth = inject(AuthService);
  private readonly pdfExport = inject(PdfExportService);

  loading = false;
  guardando = false;
  error: string | null = null;
  errorGestion: string | null = null;
  okMsg: string | null = null;
  misLicencias: LicenciaMedicaDto[] = [];
  gestionLicencias: LicenciaMedicaDto[] = [];
  filtroGestion: '' | LicenciaEstado = '';
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

  estadoEdicion: Record<number, LicenciaEstado> = {};
  observacionEdicion: Record<number, string> = {};

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
      .subscribe((rows) => (this.misLicencias = rows));
    if (this.puedeGestionar) {
      this.cargarGestion();
      this.cargarResumen();
    }
  }

  cargarGestion(): void {
    this.errorGestion = null;
    this.api
      .listarGestion(this.filtroGestion || undefined)
      .pipe(
        catchError(() => {
          this.errorGestion = 'No se pudo cargar la gestión de licencias.';
          return of([]);
        }),
      )
      .subscribe((rows) => {
        this.gestionLicencias = rows;
        for (const l of rows) {
          this.estadoEdicion[l.id] = l.estado;
          this.observacionEdicion[l.id] = l.observacionResolucion ?? '';
        }
      });
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
            this.cargarTodo();
          }
        },
        error: (e) => {
          this.error = e?.error?.error ?? 'No se pudo enviar la solicitud.';
        },
      });
  }

  guardarEstado(item: LicenciaMedicaDto): void {
    const estado = this.estadoEdicion[item.id];
    if (!estado) {
      return;
    }
    this.api
      .cambiarEstado(item.id, estado, this.observacionEdicion[item.id] ?? '')
      .subscribe({
        next: () => {
          this.okMsg = `Estado actualizado para licencia #${item.id}.`;
          this.cargarGestion();
        },
        error: (e) => {
          this.error = e?.error?.error ?? 'No se pudo actualizar estado.';
        },
      });
  }

  setFiltro(estado: '' | LicenciaEstado): void {
    this.filtroGestion = estado;
    this.cargarGestion();
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

  etiquetaResumen(usuarioId: number): string {
    if (this.resumen.conLicencia.some((u) => u.id === usuarioId)) {
      return 'Con licencia';
    }
    if (this.resumen.mandoPermiso.some((u) => u.id === usuarioId)) {
      return 'Mandó permiso';
    }
    return 'Sin permiso';
  }

  descargarLicenciaPdf(item: LicenciaMedicaDto): void {
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
      resueltoPor: item.resueltoPor?.nombre ?? null,
      resueltoEn: item.resueltoEn ?? null,
    });
  }
}
