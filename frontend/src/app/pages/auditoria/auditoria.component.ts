import { CommonModule, formatDate } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { ToastService } from '../../services/toast.service';

type AuditoriaItem = {
  id: string;
  usuarioRut: string | null;
  usuarioNombre: string | null;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  metodoHttp: string | null;
  ruta: string | null;
  ipOrigen: string | null;
  detalle: string | null;
  resultado: string;
  createdAt: string;
};

type AuditoriaPaginaDto = {
  items: AuditoriaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './auditoria.component.html',
})
export class AuditoriaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  loading = true;
  error: string | null = null;
  items: AuditoriaItem[] = [];
  
  // Paginación
  pagina = 1;
  total = 0;
  totalPaginas = 1;
  readonly tamanioPagina = 20;

  // Filtros
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
    'LOGIN_ERROR'
  ];

  ngOnInit(): void {
    this.cargarLogs();
  }

  cargarLogs(): void {
    this.loading = true;
    this.error = null;

    let params = new HttpParams()
      .set('page', String(this.pagina))
      .set('pageSize', String(this.tamanioPagina));

    if (this.filtroRut.trim()) params = params.set('rut', this.filtroRut.trim());
    if (this.filtroAccion.trim()) params = params.set('accion', this.filtroAccion.trim());
    if (this.filtroEntidad.trim()) params = params.set('entidad', this.filtroEntidad.trim());
    if (this.filtroDesde.trim()) params = params.set('desde', this.filtroDesde.trim());
    if (this.filtroHasta.trim()) params = params.set('hasta', this.filtroHasta.trim());

    this.http.get<AuditoriaPaginaDto>('/api/auditoria', { params }).subscribe({
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
      }
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
    return Number.isNaN(d.getTime()) ? '—' : formatDate(d, "dd/MM/yyyy · HH:mm:ss", 'es-CL');
  }

  chipResultadoClass(res: string): string {
    return res === 'OK'
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35'
      : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/35';
  }
}
