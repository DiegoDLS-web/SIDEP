import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AuditoriaItemDto } from '../../models/auditoria.dto';
import { AuditoriaService } from '../../services/auditoria.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-auditoria-log',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './auditoria-log.component.html',
})
export class AuditoriaLogComponent implements OnInit {
  private readonly auditoria = inject(AuditoriaService);
  private readonly toast = inject(ToastService);

  loading = true;
  error: string | null = null;
  items: AuditoriaItemDto[] = [];

  pagina = 1;
  total = 0;
  totalPaginas = 1;
  readonly tamanioPagina = 20;

  filtroRut = '';
  filtroAccion = '';
  filtroEntidad = '';
  filtroDesde = '';
  filtroHasta = '';

  accionesDisponibles = [
    'CREAR_USUARIO',
    'CREAR_USUARIO_ERROR',
    'ACTUALIZAR_USUARIO',
    'ACTUALIZAR_USUARIO_ERROR',
    'ELIMINAR_USUARIO',
    'ELIMINAR_USUARIO_ERROR',
    'RESTABLECER_PASSWORD',
    'RESTABLECER_PASSWORD_ERROR',
    'CAMBIAR_PASSWORD',
    'LOGIN',
    'LOGIN_ERROR',
  ];

  ngOnInit(): void {
    this.cargarLogs();
  }

  cargarLogs(): void {
    this.loading = true;
    this.error = null;

    this.auditoria
      .listarLogs({
        page: this.pagina,
        pageSize: this.tamanioPagina,
        rut: this.filtroRut,
        accion: this.filtroAccion,
        entidad: this.filtroEntidad,
        desde: this.filtroDesde,
        hasta: this.filtroHasta,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.total = res.total;
          this.totalPaginas = res.totalPages;
          this.loading = false;
        },
        error: (err) => {
          const msg = err?.error?.error ?? 'No se pudo cargar el registro de auditoría.';
          this.error = msg;
          this.toast.error(msg);
          this.loading = false;
        },
      });
  }

  filtrar(): void {
    this.pagina = 1;
    this.cargarLogs();
  }

  limpiarFiltros(): void {
    this.filtroRut = '';
    this.filtroAccion = '';
    this.filtroEntidad = '';
    this.filtroDesde = '';
    this.filtroHasta = '';
    this.pagina = 1;
    this.cargarLogs();
  }

  cambiarPagina(delta: number): void {
    const next = this.pagina + delta;
    if (next >= 1 && next <= this.totalPaginas) {
      this.pagina = next;
      this.cargarLogs();
    }
  }

  fechaHora(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : formatDate(d, 'dd/MM/yyyy · HH:mm:ss', 'es-CL');
  }

  chipResultadoClass(res: string): string {
    return res === 'OK'
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35'
      : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/35';
  }

  get totalErrores(): number {
    return this.items.filter((i) => i.resultado !== 'OK').length;
  }
}
