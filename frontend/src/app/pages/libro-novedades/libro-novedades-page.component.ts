import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NovedadesService } from '../../services/novedades.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { IaService } from '../../services/ia.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type { ImagenNovedadDto, LibroNovedadDto } from '../../models/novedades.dto';
import type { UsuarioSelectorDto } from '../../models/usuario.dto';
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
  private readonly usuariosApi = inject(UsuariosService);
  private readonly iaApi = inject(IaService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly grupos = GRUPOS_GUARDIA;

  loading = true;
  guardando = false;
  asistiendoIa = false;
  borradorIa = '';
  sugerenciaIa: {
    titulo?: string;
    resumen?: string;
    avisarOficialidad?: boolean;
    motivoAviso?: string | null;
    oficialACargoNombreSugerido?: string | null;
  } | null = null;
  items: LibroNovedadDto[] = [];
  oficiales: UsuarioSelectorDto[] = [];
  total = 0;
  page = 1;
  totalPages = 1;
  readonly pageSize = 15;

  filtroDesde = '';
  filtroHasta = '';
  filtroTexto = '';

  mostrarFormulario = false;
  form = {
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toTimeString().slice(0, 5),
    titulo: '',
    descripcion: '',
    grupoGuardia: '' as GrupoGuardia | '',
    oficialACargoRut: '',
    imagenes: [] as ImagenNovedadDto[],
  };

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  ngOnInit(): void {
    this.usuariosApi.voluntariosParaSelect().subscribe({
      next: (u) => (this.oficiales = u),
      error: () => (this.oficiales = []),
    });
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api
      .listar({
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
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
    this.filtroTexto = '';
    this.page = 1;
    this.cargar();
  }

  cambiarPagina(delta: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, this.page + delta));
    this.cargar();
  }

  abrirFormulario(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.form = {
      fecha: hoy,
      hora: new Date().toTimeString().slice(0, 5),
      titulo: '',
      descripcion: '',
      grupoGuardia: '',
      oficialACargoRut: '',
      imagenes: [],
    };
    this.borradorIa = '';
    this.sugerenciaIa = null;
    this.mostrarFormulario = true;
  }

  asistirConIa(): void {
    const texto = (this.borradorIa || this.form.descripcion).trim();
    if (texto.length < 8) {
      this.toast.advertencia('Escribe el texto libre de la novedad (mín. 8 caracteres).');
      return;
    }
    this.asistiendoIa = true;
    this.iaApi.asistirNovedad(texto).subscribe({
      next: (r) => {
        this.asistiendoIa = false;
        this.sugerenciaIa = r;
        this.form.titulo = r.titulo || this.form.titulo;
        this.form.descripcion = r.resumen || texto;
        if (r.grupoGuardia) this.form.grupoGuardia = r.grupoGuardia;
        if (r.oficialACargoRutSugerido) {
          this.form.oficialACargoRut = r.oficialACargoRutSugerido;
        }
        this.toast.exito('Sugerencia IA lista — confirma oficial y guarda.');
      },
      error: (err) => {
        this.asistiendoIa = false;
        this.toast.error(mensajeApiError(err, 'No se pudo asistir con IA.'));
      },
    });
  }

  onImagenesSeleccionadas(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const restantes = 5 - this.form.imagenes.length;
    if (restantes <= 0) {
      this.toast.advertencia('Máximo 5 imágenes.');
      input.value = '';
      return;
    }
    const tomar = files.slice(0, restantes);
    Promise.all(tomar.map((f) => this.leerComoDataUrl(f)))
      .then((urls) => {
        for (const url of urls) {
          this.form.imagenes.push({ url });
        }
      })
      .catch(() => this.toast.error('No se pudo leer una o más imágenes.'))
      .finally(() => {
        input.value = '';
      });
  }

  quitarImagen(i: number): void {
    this.form.imagenes.splice(i, 1);
  }

  private leerComoDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('tipo'));
        return;
      }
      if (file.size > 900 * 1024) {
        reject(new Error('tamaño'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  guardar(): void {
    if (!this.form.titulo.trim() || !this.form.descripcion.trim()) {
      this.toast.advertencia('Completa título y descripción.');
      return;
    }
    if (!this.form.oficialACargoRut) {
      this.toast.advertencia('Selecciona el oficial a cargo.');
      return;
    }
    this.guardando = true;
    const fechaHora = new Date(`${this.form.fecha}T${this.form.hora}:00`).toISOString();
    this.api
      .crear({
        fechaHora,
        titulo: this.form.titulo.trim(),
        descripcion: this.form.descripcion.trim(),
        oficialACargoRut: this.form.oficialACargoRut,
        grupoGuardia: (this.form.grupoGuardia || null) as GrupoGuardia | null,
        imagenes: this.form.imagenes,
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

  etiquetaOficial(n: LibroNovedadDto): string {
    return n.oficialACargo?.nombre ?? n.oficialACargoRut;
  }
}
