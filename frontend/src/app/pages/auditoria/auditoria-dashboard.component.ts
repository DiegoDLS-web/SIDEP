import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import type { AuditoriaHallazgoDto, AuditoriaMetricasDto } from '../../models/auditoria.dto';
import { AuditoriaService } from '../../services/auditoria.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-auditoria-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidepIconsModule],
  templateUrl: './auditoria-dashboard.component.html',
})
export class AuditoriaDashboardComponent implements OnInit {
  private readonly auditoria = inject(AuditoriaService);

  loading = true;
  error: string | null = null;
  metricas: AuditoriaMetricasDto | null = null;
  hallazgos: AuditoriaHallazgoDto[] = [];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      metricas: this.auditoria.cargarMetricasGenerales(),
      dashboard: this.auditoria.obtenerResumenDashboard(),
      usuarios: this.auditoria.listarUsuariosAuditoria(1, 100),
      logs: this.auditoria.listarLogs({ page: 1, pageSize: 10 }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ metricas, dashboard, usuarios, logs }) => {
        this.metricas = metricas;

        const filasChecklist = dashboard ? this.auditoria.mapearChecklistsDesdeDashboard(dashboard) : [];
        const filasUsuarios = this.auditoria.auditarUsuarios(usuarios);

        this.hallazgos = [
          ...this.auditoria.detectarHallazgosChecklists(filasChecklist),
          ...this.auditoria.detectarHallazgosUsuarios(filasUsuarios),
          ...this.auditoria.detectarHallazgosLogs(logs?.items ?? []),
        ].slice(0, 12);

        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el panel de auditoría. ¿Está el backend en ejecución?';
        this.loading = false;
      },
    });
  }

  fechaCorta(iso: string): string {
    try {
      return formatDate(iso, 'dd/MM/yyyy HH:mm', 'es-CL');
    } catch {
      return '—';
    }
  }

  iconoEstado = (estado: AuditoriaHallazgoDto['severidad']) => this.auditoria.iconoEstado(estado);
  clasesEstado = (estado: AuditoriaHallazgoDto['severidad']) => this.auditoria.clasesChipEstado(estado);
}
