import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import type { AuditoriaChecklistFilaDto } from '../../models/auditoria.dto';
import type { ChecklistEjecucionDTO } from '../../models/checklist.dto';
import { AuditoriaService } from '../../services/auditoria.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-auditoria-checklists',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './auditoria-checklists.component.html',
})
export class AuditoriaChecklistsComponent implements OnInit {
  private readonly auditoria = inject(AuditoriaService);

  loading = true;
  error: string | null = null;
  filas: AuditoriaChecklistFilaDto[] = [];
  historial: ChecklistEjecucionDTO[] = [];

  filtroTipo: '' | 'unidad' | 'era' | 'trauma' = '';
  filtroDesde = '';
  filtroHasta = '';
  filtroUsuario = '';

  readonly tiposChecklist = [
    { value: '', label: 'Todos los tipos' },
    { value: 'unidad', label: 'Checklist carro' },
    { value: 'era', label: 'Checklist ERA' },
    { value: 'trauma', label: 'Bolso de trauma' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      dashboard: this.auditoria.obtenerResumenDashboard(),
      historial: this.auditoria.obtenerHistorialChecklists(),
    }).subscribe({
      next: ({ dashboard, historial }) => {
        this.historial = historial;
        this.filas = dashboard ? this.auditoria.mapearChecklistsDesdeDashboard(dashboard) : [];
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos de checklists.';
        this.loading = false;
      },
    });
  }

  get filasFiltradas(): AuditoriaChecklistFilaDto[] {
    return this.filas.filter((f) => {
      if (this.filtroTipo && f.tipo !== this.filtroTipo) return false;
      if (this.filtroDesde && f.fecha) {
        const d = new Date(f.fecha);
        const desde = new Date(this.filtroDesde);
        if (!Number.isNaN(desde.getTime()) && d < desde) return false;
      }
      if (this.filtroHasta && f.fecha) {
        const d = new Date(f.fecha);
        const hasta = new Date(this.filtroHasta);
        hasta.setHours(23, 59, 59, 999);
        if (!Number.isNaN(hasta.getTime()) && d > hasta) return false;
      }
      if (this.filtroUsuario.trim()) {
        const q = this.filtroUsuario.trim().toLowerCase();
        const matchHist = this.historial.some(
          (h) =>
            (h.revisorRut ?? '').toLowerCase().includes(q) &&
            String(h.entidadId ?? '').includes(f.unidad),
        );
        if (!matchHist && !f.unidad.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  get pctCompletos(): number {
    const total = this.filasFiltradas.length;
    if (total === 0) return 0;
    const ok = this.filasFiltradas.filter((f) => f.estado === 'ok').length;
    return Math.round((ok / total) * 100);
  }

  get totalErrores(): number {
    return this.filasFiltradas.filter((f) => f.estado === 'error').length;
  }

  fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    try {
      return formatDate(iso, 'dd/MM/yyyy', 'es-CL');
    } catch {
      return '—';
    }
  }

  etiquetaTipo(tipo: AuditoriaChecklistFilaDto['tipo']): string {
    return this.auditoria.etiquetaTipoChecklist(tipo);
  }

  iconoEstado = (estado: AuditoriaChecklistFilaDto['estado']) => this.auditoria.iconoEstado(estado);
  clasesEstado = (estado: AuditoriaChecklistFilaDto['estado']) => this.auditoria.clasesChipEstado(estado);
}
