import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsistenciaCuartelerosService } from '../../services/asistencia-cuarteleros.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import type {
  EstadoAsistenciaGuardia,
  PlanillaAsistenciaDto,
  PlanillaColumnaDto,
  PlanillaFilaDto,
} from '../../models/asistencia-cuarteleros.dto';
import {
  ESTADOS_ASISTENCIA_GUARDIA,
  ETIQUETAS_ESTADO_ASISTENCIA,
} from '../../models/asistencia-cuarteleros.dto';
import { GRUPOS_GUARDIA, type GrupoGuardia } from '../../models/guardias.dto';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidHistoryFilterActionsComponent } from '../../shared/sid-history-filter-actions.component';

function isoLocal(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function rangoGuardiaDefault(desdeFecha?: string): { desde: string; hasta: string } {
  const base = desdeFecha ? new Date(`${desdeFecha}T12:00:00.000Z`) : new Date();
  const dia = base.getUTCDay();
  const diffSab = (dia + 1) % 7;
  const sab = new Date(base);
  sab.setUTCDate(base.getUTCDate() - diffSab);
  const dom = new Date(sab);
  dom.setUTCDate(sab.getUTCDate() + 1);
  return { desde: isoLocal(sab), hasta: isoLocal(dom) };
}

@Component({
  selector: 'app-guardias-asistencia-planilla',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidDateInputComponent,
    SidEmptyStateComponent,
    SidHistoryFilterActionsComponent,
  ],
  templateUrl: './guardias-asistencia-planilla.component.html',
})
export class GuardiasAsistenciaPlanillaComponent implements OnInit {
  private readonly api = inject(AsistenciaCuartelerosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Si se pasa, la planilla arranca en el fin de semana de esa fecha. */
  @Input() fechaReferencia: string | null = null;

  readonly grupos = GRUPOS_GUARDIA;
  readonly estados = ESTADOS_ASISTENCIA_GUARDIA;
  readonly etiquetasEstado = ETIQUETAS_ESTADO_ASISTENCIA;

  loading = true;
  guardandoCelda = false;
  planilla: PlanillaAsistenciaDto | null = null;

  filtroDesde = rangoGuardiaDefault().desde;
  filtroHasta = rangoGuardiaDefault().hasta;
  filtroGrupo: GrupoGuardia | 'TODAS' = 'TODAS';

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  get columnasAgrupadas(): Array<{ fecha: string; label: string; cols: PlanillaColumnaDto[] }> {
    if (!this.planilla) return [];
    const map = new Map<string, { fecha: string; label: string; cols: PlanillaColumnaDto[] }>();
    for (const col of this.planilla.columnas) {
      let g = map.get(col.fecha);
      if (!g) {
        g = { fecha: col.fecha, label: col.label, cols: [] };
        map.set(col.fecha, g);
      }
      g.cols.push(col);
    }
    return [...map.values()];
  }

  get totalVoluntarios(): number {
    return this.planilla?.filas.length ?? 0;
  }

  get totalMarcados(): number {
    return this.planilla?.filas.reduce((acc, f) => acc + f.totalAsistencias, 0) ?? 0;
  }

  ngOnInit(): void {
    this.aplicarRangoReferencia();
    this.cargar();
  }

  aplicarRangoReferencia(): void {
    const r = rangoGuardiaDefault(this.fechaReferencia ?? undefined);
    this.filtroDesde = r.desde;
    this.filtroHasta = r.hasta;
  }

  recargarConFecha(fecha: string | null): void {
    this.fechaReferencia = fecha;
    this.aplicarRangoReferencia();
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.api
      .planilla({
        desde: this.filtroDesde,
        hasta: this.filtroHasta,
        grupo: this.filtroGrupo !== 'TODAS' ? this.filtroGrupo : undefined,
      })
      .subscribe({
        next: (p) => {
          this.planilla = p;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(mensajeApiError(err, 'No se pudo cargar la planilla de asistencia.'));
        },
      });
  }

  limpiarFiltros(): void {
    this.aplicarRangoReferencia();
    this.filtroGrupo = 'TODAS';
    this.cargar();
  }

  cambiarEstado(fila: PlanillaFilaDto, col: PlanillaColumnaDto, raw: string): void {
    if (!this.puedeGestionar || this.guardandoCelda) return;
    const estado = (raw || null) as EstadoAsistenciaGuardia | null;
    this.guardandoCelda = true;
    this.api
      .guardarCelda({
        fecha: col.fecha,
        usuarioRut: fila.usuarioRut,
        tipoTurno: col.tipoTurno,
        estadoAsistencia: estado,
        grupoGuardia: fila.grupoGuardia,
      })
      .subscribe({
        next: () => {
          this.guardandoCelda = false;
          this.cargar();
        },
        error: (err) => {
          this.guardandoCelda = false;
          this.toast.error(mensajeApiError(err, 'No se pudo guardar la celda.'));
        },
      });
  }

  cambiarGrupo(fila: PlanillaFilaDto, raw: string): void {
    if (!this.puedeGestionar || !this.planilla) return;
    fila.grupoGuardia = (raw || null) as GrupoGuardia | null;
    for (const col of this.planilla.columnas) {
      const celda = fila.celdas[col.key];
      if (!celda?.estadoAsistencia) continue;
      this.api
        .guardarCelda({
          fecha: col.fecha,
          usuarioRut: fila.usuarioRut,
          tipoTurno: col.tipoTurno,
          estadoAsistencia: celda.estadoAsistencia,
          grupoGuardia: fila.grupoGuardia,
        })
        .subscribe({ error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo actualizar el grupo.')) });
    }
  }

  claseEstado(estado: EstadoAsistenciaGuardia | null): string {
    if (!estado) return '';
    if (estado === 'ASISTE' || estado === 'REEMPLAZA') return 'sid-asistencia-celda--ok';
    if (estado === 'NO_ASISTE') return 'sid-asistencia-celda--no';
    if (estado === 'DEJA_REEMPLAZO') return 'sid-asistencia-celda--reemplazo';
    if (estado === 'LIBERADO') return 'sid-asistencia-celda--liberado';
    return '';
  }

  tituloRegistrador(r: { nombre: string; rol: string; ultimaActualizacion: string }): string {
    const when = new Date(r.ultimaActualizacion).toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return `${r.nombre} (${r.rol}) · ${when}`;
  }
}
