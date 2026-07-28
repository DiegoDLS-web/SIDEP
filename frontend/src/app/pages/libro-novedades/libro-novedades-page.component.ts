import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NovedadesService } from '../../services/novedades.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type { CategoriaNovedad, LibroNovedadDto } from '../../models/novedades.dto';
import { CATEGORIAS_NOVEDAD } from '../../models/novedades.dto';
import { GRUPOS_GUARDIA, type GrupoGuardia } from '../../models/guardias.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidPaginationFooterComponent } from '../../shared/sid-pagination-footer.component';
import { SidHistoryFilterActionsComponent } from '../../shared/sid-history-filter-actions.component';

@Component({
  selector: 'app-libro-novedades-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidepIconsModule,
    SidDateInputComponent,
    SidEmptyStateComponent,
    SidPaginationFooterComponent,
    SidHistoryFilterActionsComponent,
  ],
  templateUrl: './libro-novedades-page.component.html',
})
export class LibroNovedadesPageComponent implements OnInit {
  private readonly api = inject(NovedadesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly categorias = CATEGORIAS_NOVEDAD;
  readonly grupos = GRUPOS_GUARDIA;

  loading = true;
  guardando = false;
  items: LibroNovedadDto[] = [];
  total = 0;
  page = 1;
  totalPages = 1;
  readonly pageSize = 15;

  filtroDesde = '';
  filtroHasta = '';
  filtroCategoria: CategoriaNovedad | '' = '';
  filtroImportante: 'TODAS' | 'SI' | 'NO' = 'TODAS';
  filtroTexto = '';

  mostrarFormulario = false;
  form = {
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toTimeString().slice(0, 5),
    categoria: 'OPERATIVA' as CategoriaNovedad,
    titulo: '',
    descripcion: '',
    grupoGuardia: '' as GrupoGuardia | '',
    importante: false,
  };

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api
      .listar({
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
        categoria: this.filtroCategoria || undefined,
        importante:
          this.filtroImportante === 'SI' ? true : this.filtroImportante === 'NO' ? false : undefined,
        q: this.filtroTexto.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (p) => {
          this.items = p.items;
          this.total = p.total;
          this.totalPages = p.totalPages;
          this.page = p.page;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(mensajeApiError(err, 'No se pudo cargar el libro de novedades.'));
        },
      });
  }

  limpiarFiltros(): void {
    this.filtroDesde = '';
    this.filtroHasta = '';
    this.filtroCategoria = '';
    this.filtroImportante = 'TODAS';
    this.filtroTexto = '';
    this.page = 1;
    this.cargar();
  }

  cambiarPagina(delta: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, this.page + delta));
    this.cargar();
  }

  abrirFormulario(): void {
    this.form = {
      fecha: new Date().toISOString().slice(0, 10),
      hora: new Date().toTimeString().slice(0, 5),
      categoria: 'OPERATIVA',
      titulo: '',
      descripcion: '',
      grupoGuardia: '',
      importante: false,
    };
    this.mostrarFormulario = true;
  }

  guardar(): void {
    if (!this.form.titulo.trim() || !this.form.descripcion.trim()) {
      this.toast.advertencia('Completa título y descripción.');
      return;
    }
    this.guardando = true;
    const fechaHora = new Date(`${this.form.fecha}T${this.form.hora}:00`).toISOString();
    this.api
      .crear({
        fechaHora,
        categoria: this.form.categoria,
        titulo: this.form.titulo.trim(),
        descripcion: this.form.descripcion.trim(),
        grupoGuardia: (this.form.grupoGuardia || null) as GrupoGuardia | null,
        importante: this.form.importante,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.mostrarFormulario = false;
          this.toast.exito('Novedad registrada.');
          this.page = 1;
          this.cargar();
        },
        error: (err) => {
          this.guardando = false;
          this.toast.error(mensajeApiError(err, 'No se pudo registrar la novedad.'));
        },
      });
  }

  eliminar(item: LibroNovedadDto): void {
    if (!confirm(`¿Eliminar novedad «${item.titulo}»?`)) return;
    this.api.eliminar(item.id).subscribe({
      next: () => {
        this.toast.exito('Novedad eliminada.');
        this.cargar();
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo eliminar.')),
    });
  }

  fechaHoraEs(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
  }

  etiquetaCategoria(c: CategoriaNovedad): string {
    return this.categorias.find((x) => x.value === c)?.label ?? c;
  }
}
