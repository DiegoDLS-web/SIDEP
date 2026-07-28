import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsistenciaCuartelerosService } from '../../services/asistencia-cuarteleros.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type { AsistenciaCuarteleroDto } from '../../models/asistencia-cuarteleros.dto';
import type { GrupoGuardia } from '../../models/guardias.dto';
import { GRUPOS_GUARDIA } from '../../models/guardias.dto';
import type { UsuarioSelectorDto } from '../../models/usuario.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidPaginationFooterComponent } from '../../shared/sid-pagination-footer.component';
import { SidHistoryFilterActionsComponent } from '../../shared/sid-history-filter-actions.component';
import { SidRecordCountBadgeComponent } from '../../shared/sid-record-count-badge.component';

@Component({
  selector: 'app-asistencia-cuarteleros-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidepIconsModule,
    SidDateInputComponent,
    SidEmptyStateComponent,
    SidPaginationFooterComponent,
    SidHistoryFilterActionsComponent,
    SidRecordCountBadgeComponent,
  ],
  templateUrl: './asistencia-cuarteleros-page.component.html',
})
export class AsistenciaCuartelerosPageComponent implements OnInit {
  private readonly api = inject(AsistenciaCuartelerosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly grupos = GRUPOS_GUARDIA;

  loading = true;
  guardando = false;
  items: AsistenciaCuarteleroDto[] = [];
  total = 0;
  page = 1;
  totalPages = 1;
  readonly pageSize = 20;
  voluntarios: UsuarioSelectorDto[] = [];

  fechaConsulta = new Date().toISOString().slice(0, 10);
  filtroDesde = '';
  filtroHasta = '';
  filtroGrupo: GrupoGuardia | 'TODAS' = 'TODAS';
  filtroPresente: 'TODAS' | 'SI' | 'NO' = 'TODAS';

  resumenTotal = 0;
  resumenPresentes = 0;
  resumenAusentes = 0;

  mostrarFormulario = false;
  editandoId: string | null = null;
  form = {
    fecha: new Date().toISOString().slice(0, 10),
    usuarioRut: '',
    grupoGuardia: '' as GrupoGuardia | '',
    presente: true,
    horaEntrada: '',
    horaSalida: '',
    observaciones: '',
  };

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  ngOnInit(): void {
    this.usuariosApi.voluntariosParaSelect().subscribe((v) => (this.voluntarios = v));
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api
      .listar({
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
        grupo: this.filtroGrupo !== 'TODAS' ? this.filtroGrupo : undefined,
        presente:
          this.filtroPresente === 'SI' ? true : this.filtroPresente === 'NO' ? false : undefined,
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
          this.toast.error(mensajeApiError(err, 'No se pudo cargar la asistencia.'));
        },
      });

    this.api.resumen(this.fechaConsulta).subscribe({
      next: (r) => {
        this.resumenTotal = r.total;
        this.resumenPresentes = r.presentes;
        this.resumenAusentes = r.ausentes;
      },
      error: () => {
        this.resumenTotal = 0;
        this.resumenPresentes = 0;
        this.resumenAusentes = 0;
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroDesde = '';
    this.filtroHasta = '';
    this.filtroGrupo = 'TODAS';
    this.filtroPresente = 'TODAS';
    this.page = 1;
    this.cargar();
  }

  cambiarPagina(delta: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, this.page + delta));
    this.cargar();
  }

  abrirNuevo(): void {
    if (!this.puedeGestionar) return;
    this.editandoId = null;
    this.form = {
      fecha: this.fechaConsulta,
      usuarioRut: '',
      grupoGuardia: '',
      presente: true,
      horaEntrada: '',
      horaSalida: '',
      observaciones: '',
    };
    this.mostrarFormulario = true;
  }

  abrirEditar(item: AsistenciaCuarteleroDto): void {
    if (!this.puedeGestionar) return;
    this.editandoId = item.id;
    this.form = {
      fecha: item.fecha,
      usuarioRut: item.usuarioRut,
      grupoGuardia: item.grupoGuardia ?? '',
      presente: item.presente,
      horaEntrada: item.horaEntrada ?? '',
      horaSalida: item.horaSalida ?? '',
      observaciones: item.observaciones ?? '',
    };
    this.mostrarFormulario = true;
  }

  guardar(): void {
    if (!this.puedeGestionar) return;
    if (!this.editandoId && !this.form.usuarioRut) {
      this.toast.advertencia('Selecciona un cuartelero.');
      return;
    }
    this.guardando = true;
    const payload = {
      fecha: this.form.fecha,
      usuarioRut: this.form.usuarioRut,
      grupoGuardia: (this.form.grupoGuardia || null) as GrupoGuardia | null,
      presente: this.form.presente,
      horaEntrada: this.form.horaEntrada || null,
      horaSalida: this.form.horaSalida || null,
      observaciones: this.form.observaciones.trim() || null,
    };
    const req = this.editandoId
      ? this.api.actualizar(this.editandoId, {
          grupoGuardia: payload.grupoGuardia,
          presente: payload.presente,
          horaEntrada: payload.horaEntrada,
          horaSalida: payload.horaSalida,
          observaciones: payload.observaciones,
        })
      : this.api.registrar(payload);
    req.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarFormulario = false;
        this.toast.exito(this.editandoId ? 'Asistencia actualizada.' : 'Asistencia registrada.');
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        this.toast.error(mensajeApiError(err, 'No se pudo guardar la asistencia.'));
      },
    });
  }

  eliminar(item: AsistenciaCuarteleroDto): void {
    if (!this.puedeGestionar || !confirm(`¿Eliminar registro de ${item.usuario?.nombre ?? item.usuarioRut}?`)) return;
    this.api.eliminar(item.id).subscribe({
      next: () => {
        this.toast.exito('Registro eliminado.');
        this.cargar();
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo eliminar.')),
    });
  }

  nombreVoluntario(rut: string): string {
    return this.voluntarios.find((v) => v.rut === rut)?.nombre ?? rut;
  }
}
