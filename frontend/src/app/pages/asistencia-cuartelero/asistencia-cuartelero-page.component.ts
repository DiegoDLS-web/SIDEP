import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuarteleroPanelService } from '../../services/cuartelero-panel.service';
import { AsistenciaCuartelerosService } from '../../services/asistencia-cuarteleros.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type { AsistenciaCuarteleroDto } from '../../models/asistencia-cuarteleros.dto';
import { ETIQUETAS_ESTADO_ASISTENCIA } from '../../models/asistencia-cuarteleros.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

@Component({
  selector: 'app-asistencia-cuartelero-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SidepIconsModule,
    SidEmptyStateComponent,
    SidDateInputComponent,
    SignaturePadComponent,
  ],
  templateUrl: './asistencia-cuartelero-page.component.html',
})
export class AsistenciaCuarteleroPageComponent implements OnInit {
  private readonly panelApi = inject(CuarteleroPanelService);
  private readonly asistenciaApi = inject(AsistenciaCuartelerosService);
  private readonly toast = inject(ToastService);

  readonly etiquetasEstado = ETIQUETAS_ESTADO_ASISTENCIA;
  readonly hoyIso = new Date().toISOString().slice(0, 10);

  loading = true;
  guardando = false;
  proximasGuardias: Array<{ id: string; fecha: string; grupo: string; tipoTurno: string; rolEnTurno: string }> = [];
  historial: AsistenciaCuarteleroDto[] = [];
  historialPage = 1;
  historialTotalPages = 1;

  registroForm = {
    fecha: new Date().toISOString().slice(0, 10),
    tipoTurno: 'NOCTURNA' as 'NOCTURNA' | 'DIURNA',
    horaEntrada: new Date().toTimeString().slice(0, 5),
    horaSalida: '',
    firmaImagenUrl: '',
    observaciones: '',
  };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.panelApi.miPanel().subscribe({
      next: (p) => {
        this.proximasGuardias = p.proximasGuardias ?? [];
        this.historial = p.historialAsistencias ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(mensajeApiError(err, 'No se pudo cargar tu asistencia.'));
        this.cargarHistorial(1);
      },
    });
  }

  cargarHistorial(page = 1): void {
    this.panelApi.miHistorial(page, 15).subscribe({
      next: (r) => {
        this.historial = r.items;
        this.historialPage = r.page;
        this.historialTotalPages = r.totalPages;
      },
      error: () => {
        /* historial opcional si falla el panel completo */
      },
    });
  }

  registrarAsistencia(): void {
    if (this.guardando) return;
    if (!this.registroForm.firmaImagenUrl?.trim()) {
      this.toast.error('Debes firmar para registrar tu asistencia.');
      return;
    }
    this.guardando = true;
    this.asistenciaApi
      .guardarMiCelda({
        fecha: this.registroForm.fecha,
        tipoTurno: this.registroForm.tipoTurno,
        estadoAsistencia: 'ASISTE',
        horaEntrada: this.registroForm.horaEntrada || null,
        horaSalida: this.registroForm.horaSalida || null,
        firmaImagenUrl: this.registroForm.firmaImagenUrl,
        observaciones: this.registroForm.observaciones || null,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.toast.exito('Asistencia registrada correctamente.');
          this.registroForm.firmaImagenUrl = '';
          this.registroForm.observaciones = '';
          this.cargar();
        },
        error: (err) => {
          this.guardando = false;
          this.toast.error(mensajeApiError(err, 'No se pudo registrar la asistencia.'));
        },
      });
  }

  etiquetaTurno(t: string): string {
    if (t === 'NOCHE' || t === 'NOCTURNA') return 'Noche';
    if (t === 'DIA' || t === 'DIURNA') return 'Día';
    return t;
  }

  etiquetaRol(r: string): string {
    if (r === 'CONDUCTOR') return 'Conductor';
    if (r === 'OBAC') return 'OBAC';
    return 'Miembro';
  }
}
