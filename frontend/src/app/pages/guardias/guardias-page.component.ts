import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GuardiasService } from '../../services/guardias.service';
import { UsuariosService } from '../../services/usuarios.service';
import { filtrarUsuariosOperativos } from '../../utils/usuario-operativo.util';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type {
  GuardiaCalendarioDto,
  GuardiaDiaCalendarioDto,
  GuardiaTurnoDto,
  GrupoGuardia,
  TipoTurnoGuardia,
} from '../../models/guardias.dto';
import type { UsuarioSelectorDto } from '../../models/usuario.dto';
import {
  GRUPOS_GUARDIA,
  MESES_GUARDIA,
  TIPOS_TURNO_GUARDIA,
} from '../../models/guardias.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidRecordCountBadgeComponent } from '../../shared/sid-record-count-badge.component';
import { GuardiasAsistenciaPlanillaComponent } from './guardias-asistencia-planilla.component';

type CeldaCalendario = {
  vacia: boolean;
  dia?: GuardiaDiaCalendarioDto;
};

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
    GuardiasAsistenciaPlanillaComponent,
  ],
  templateUrl: './guardias-page.component.html',
})
export class GuardiasPageComponent implements OnInit {
  private readonly api = inject(GuardiasService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  @ViewChild(GuardiasAsistenciaPlanillaComponent) planillaAsistencia?: GuardiasAsistenciaPlanillaComponent;

  readonly grupos = GRUPOS_GUARDIA;
  readonly tiposTurno = TIPOS_TURNO_GUARDIA;
  readonly meses = MESES_GUARDIA;
  readonly diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  readonly aniosDisponibles = this.generarAnios();

  vista: 'calendario' | 'listado' | 'asistencia' = 'calendario';
  loading = true;
  guardando = false;
  turnos: GuardiaTurnoDto[] = [];
  calendario: GuardiaCalendarioDto | null = null;
  semanas: CeldaCalendario[][] = [];
  voluntarios: UsuarioSelectorDto[] = [];

  hoyIso = new Date().toISOString().slice(0, 10);
  mesSeleccionado = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();
  fechaSeleccionada: string | null = new Date().toISOString().slice(0, 10);
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
    tipoTurno: 'NOCHE' as TipoTurnoGuardia,
    cuarteleroRut: '',
    obacRut: '',
    observaciones: '',
    miembrosRut: [] as string[],
  };

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  get diaSeleccionado(): GuardiaDiaCalendarioDto | null {
    if (!this.fechaSeleccionada || !this.calendario) return null;
    return this.calendario.dias.find((d) => d.fecha === this.fechaSeleccionada) ?? null;
  }

  get tituloCalendario(): string {
    if (!this.calendario) return 'Guardia nocturna mensual';
    return `Guardia nocturna mensual · ${this.calendario.mesLabel} ${this.calendario.anio}`;
  }

  /** Conductores con autorización activa en Usuarios. */
  get conductoresHabilitados(): UsuarioSelectorDto[] {
    return filtrarUsuariosOperativos(this.voluntarios).filter((u) => u.autorizadoConducir === true);
  }

  /** Solo capitán y tenientes para OBAC. */
  get obacOficialidad(): UsuarioSelectorDto[] {
    return filtrarUsuariosOperativos(this.voluntarios).filter((u) => {
      const r = (u.rol ?? '').toUpperCase();
      return r.includes('CAPITAN') || r.includes('TENIENTE');
    });
  }

  /** Personal disponible para marcar en el turno. */
  get personalGuardia(): UsuarioSelectorDto[] {
    return filtrarUsuariosOperativos(this.voluntarios);
  }

  ngOnInit(): void {
    this.usuariosApi.voluntariosParaSelect().subscribe((v) => (this.voluntarios = filtrarUsuariosOperativos(v)));
    this.route.queryParamMap.subscribe((q) => {
      const v = q.get('vista');
      if (v === 'asistencia' || v === 'listado' || v === 'calendario') {
        this.cambiarVista(v, false);
      } else {
        this.cargarCalendario();
      }
    });
  }

  cambiarVista(v: 'calendario' | 'listado' | 'asistencia', recargar = true): void {
    this.vista = v;
    if (!recargar) {
      if (v === 'listado') this.cargarListado();
      else if (v === 'calendario') this.cargarCalendario();
      else this.refrescarPlanillaAsistencia();
      return;
    }
    if (v === 'listado') this.cargarListado();
    else if (v === 'calendario') this.cargarCalendario();
    else this.refrescarPlanillaAsistencia();
  }

  private refrescarPlanillaAsistencia(): void {
    setTimeout(() => this.planillaAsistencia?.recargarConFecha(this.fechaSeleccionada), 0);
  }

  cargarCalendario(): void {
    this.loading = true;
    this.api.calendario(this.anioSeleccionado, this.mesSeleccionado).subscribe({
      next: (c) => {
        this.calendario = c;
        this.semanas = this.construirSemanas(c);
        this.loading = false;
        if (this.fechaSeleccionada) {
          const enMes = c.dias.some((d) => d.fecha === this.fechaSeleccionada);
          if (!enMes && c.dias.length) this.fechaSeleccionada = c.dias[0]!.fecha;
        }
        this.actualizarResumenDia(this.fechaSeleccionada ?? this.hoyIso);
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(mensajeApiError(err, 'No se pudo cargar el calendario de guardias.'));
      },
    });
  }

  cargarListado(): void {
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
        this.toast.error(mensajeApiError(err, 'No se pudo cargar el listado de guardias.'));
      },
    });
  }

  actualizarResumenDia(fecha: string): void {
    this.api.resumen(fecha).subscribe({
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

  limpiarMes(): void {
    const hoy = new Date();
    this.mesSeleccionado = hoy.getMonth() + 1;
    this.anioSeleccionado = hoy.getFullYear();
    this.fechaSeleccionada = this.hoyIso;
    this.cargarCalendario();
  }

  seleccionarDia(dia: GuardiaDiaCalendarioDto): void {
    this.fechaSeleccionada = dia.fecha;
    this.fechaConsulta = dia.fecha;
    this.actualizarResumenDia(dia.fecha);
    if (this.vista === 'asistencia') {
      this.refrescarPlanillaAsistencia();
    }
  }

  abrirNuevo(fecha?: string): void {
    this.editandoId = null;
    const f = fecha ?? this.fechaSeleccionada ?? this.hoyIso;
    this.form = {
      fecha: f,
      grupo: '1',
      tipoTurno: 'NOCHE',
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
        if (this.vista === 'calendario') this.cargarCalendario();
        else if (this.vista === 'listado') this.cargarListado();
        else this.refrescarPlanillaAsistencia();
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
        if (this.vista === 'calendario') this.cargarCalendario();
        else if (this.vista === 'listado') this.cargarListado();
        else this.refrescarPlanillaAsistencia();
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

  fechaCorta(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  }

  esHoy(fecha: string): boolean {
    return fecha === this.hoyIso;
  }

  claseCelda(dia: GuardiaDiaCalendarioDto): string {
    const clases = ['sid-guardia-celda'];
    if (dia.esFinDeSemana) clases.push('sid-guardia-celda--finde');
    if (this.esHoy(dia.fecha)) clases.push('sid-guardia-celda--hoy');
    if (this.fechaSeleccionada === dia.fecha) clases.push('sid-guardia-celda--sel');
    clases.push(`sid-guardia-celda--${dia.estado}`);
    return clases.join(' ');
  }

  private generarAnios(): number[] {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }

  private construirSemanas(cal: GuardiaCalendarioDto): CeldaCalendario[][] {
    if (!cal.dias.length) return [];
    const celdas: CeldaCalendario[] = [];
    const offset = (cal.dias[0]!.diaSemana + 6) % 7;
    for (let i = 0; i < offset; i++) celdas.push({ vacia: true });
    for (const dia of cal.dias) celdas.push({ vacia: false, dia });
    while (celdas.length % 7 !== 0) celdas.push({ vacia: true });

    const semanas: CeldaCalendario[][] = [];
    for (let i = 0; i < celdas.length; i += 7) {
      semanas.push(celdas.slice(i, i + 7));
    }
    return semanas;
  }

}
