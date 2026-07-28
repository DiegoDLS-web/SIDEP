import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuardiasService } from '../../services/guardias.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type { GuardiaTurnoDto, GrupoGuardia, TipoTurnoGuardia } from '../../models/guardias.dto';
import type { UsuarioSelectorDto } from '../../models/usuario.dto';
import { GRUPOS_GUARDIA, TIPOS_TURNO_GUARDIA } from '../../models/guardias.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidRecordCountBadgeComponent } from '../../shared/sid-record-count-badge.component';

@Component({
  selector: 'app-guardias-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidepIconsModule,
    SidDateInputComponent,
    SidEmptyStateComponent,
    SidRecordCountBadgeComponent,
  ],
  templateUrl: './guardias-page.component.html',
})
export class GuardiasPageComponent implements OnInit {
  private readonly api = inject(GuardiasService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly grupos = GRUPOS_GUARDIA;
  readonly tiposTurno = TIPOS_TURNO_GUARDIA;

  loading = true;
  guardando = false;
  turnos: GuardiaTurnoDto[] = [];
  voluntarios: UsuarioSelectorDto[] = [];

  fechaConsulta = new Date().toISOString().slice(0, 10);
  filtroDesde = '';
  filtroHasta = '';
  filtroGrupo: GrupoGuardia | 'TODAS' = 'TODAS';

  resumenGrupos = 0;
  resumenMiembros = 0;

  mostrarFormulario = false;
  editandoId: string | null = null;
  form = {
    fecha: new Date().toISOString().slice(0, 10),
    grupo: '1' as GrupoGuardia,
    tipoTurno: '24H' as TipoTurnoGuardia,
    cuarteleroRut: '',
    obacRut: '',
    observaciones: '',
    miembrosRut: [] as string[],
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
    const filtros: { desde?: string; hasta?: string; grupo?: GrupoGuardia } = {};
    if (this.filtroDesde) filtros.desde = this.filtroDesde;
    if (this.filtroHasta) filtros.hasta = this.filtroHasta;
    if (this.filtroGrupo !== 'TODAS') filtros.grupo = this.filtroGrupo;

    this.api.listar(filtros).subscribe({
      next: (rows) => {
        this.turnos = rows;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(mensajeApiError(err, 'No se pudo cargar el sistema de guardias.'));
      },
    });

    this.api.resumen(this.fechaConsulta).subscribe({
      next: (r) => {
        this.resumenGrupos = r.gruposCubiertos;
        this.resumenMiembros = r.totalMiembros;
      },
      error: () => {
        this.resumenGrupos = 0;
        this.resumenMiembros = 0;
      },
    });
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.form = {
      fecha: this.fechaConsulta,
      grupo: '1',
      tipoTurno: '24H',
      cuarteleroRut: '',
      obacRut: '',
      observaciones: '',
      miembrosRut: [],
    };
    this.mostrarFormulario = true;
  }

  abrirEditar(turno: GuardiaTurnoDto): void {
    this.editandoId = turno.id;
    this.form = {
      fecha: turno.fecha,
      grupo: turno.grupo,
      tipoTurno: turno.tipoTurno,
      cuarteleroRut: turno.cuarteleroRut ?? '',
      obacRut: turno.obacRut ?? '',
      observaciones: turno.observaciones ?? '',
      miembrosRut: turno.miembros.map((m) => m.usuarioRut),
    };
    this.mostrarFormulario = true;
  }

  toggleMiembro(rut: string): void {
    const i = this.form.miembrosRut.indexOf(rut);
    if (i >= 0) {
      this.form.miembrosRut = this.form.miembrosRut.filter((r) => r !== rut);
    } else {
      this.form.miembrosRut = [...this.form.miembrosRut, rut];
    }
  }

  miembroSeleccionado(rut: string): boolean {
    return this.form.miembrosRut.includes(rut);
  }

  guardar(): void {
    if (!this.puedeGestionar) return;
    this.guardando = true;
    const payload = {
      fecha: this.form.fecha,
      grupo: this.form.grupo,
      tipoTurno: this.form.tipoTurno,
      cuarteleroRut: this.form.cuarteleroRut || null,
      obacRut: this.form.obacRut || null,
      observaciones: this.form.observaciones || null,
      miembrosRut: this.form.miembrosRut,
    };
    const req = this.editandoId
      ? this.api.actualizar(this.editandoId, payload)
      : this.api.crear(payload);
    req.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarFormulario = false;
        this.toast.exito(this.editandoId ? 'Turno actualizado.' : 'Turno registrado.');
        this.cargar();
      },
      error: (err) => {
        this.guardando = false;
        this.toast.error(mensajeApiError(err, 'No se pudo guardar el turno.'));
      },
    });
  }

  eliminar(turno: GuardiaTurnoDto): void {
    if (!this.puedeGestionar || !confirm(`¿Eliminar guardia grupo ${turno.grupo} del ${turno.fecha}?`)) return;
    this.api.eliminar(turno.id).subscribe({
      next: () => {
        this.toast.exito('Turno eliminado.');
        this.cargar();
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo eliminar.')),
    });
  }

  etiquetaTurno(t: TipoTurnoGuardia): string {
    if (t === 'DIA') return 'Día';
    if (t === 'NOCHE') return 'Noche';
    return '24 horas';
  }

  nombresMiembros(turno: GuardiaTurnoDto): string {
    return turno.miembros.map((m) => m.usuario?.nombre ?? m.usuarioRut).join(', ');
  }
}
