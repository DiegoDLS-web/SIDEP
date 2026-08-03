import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AsistenciaCuartelerosService } from '../../services/asistencia-cuarteleros.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { mensajeApiError } from '../../utils/api-error.util';
import { exportarExcelSidep } from '../../utils/excel-export.util';
import type {
  AsistenciaCuarteleroDto,
  EstadoAsistenciaGuardia,
  PlanillaAsistenciaDto,
  PlanillaCeldaDto,
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
import { SignaturePadComponent } from '../../shared/signature-pad.component';

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
    SignaturePadComponent,
  ],
  templateUrl: './guardias-asistencia-planilla.component.html',
})
export class GuardiasAsistenciaPlanillaComponent implements OnInit {
  private readonly api = inject(AsistenciaCuartelerosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  @Input() fechaReferencia: string | null = null;

  readonly grupos = GRUPOS_GUARDIA;
  readonly estados = ESTADOS_ASISTENCIA_GUARDIA;
  readonly etiquetasEstado = ETIQUETAS_ESTADO_ASISTENCIA;

  subVista: 'planilla' | 'historial' = 'planilla';
  loading = true;
  guardandoCelda = false;
  planilla: PlanillaAsistenciaDto | null = null;

  filtroDesde = rangoGuardiaDefault().desde;
  filtroHasta = rangoGuardiaDefault().hasta;
  filtroGrupo: GrupoGuardia | 'TODAS' = 'TODAS';

  historialLoading = false;
  historialItems: AsistenciaCuarteleroDto[] = [];
  historialPage = 1;
  historialTotalPages = 1;
  historialTotal = 0;

  detalleAbierto = false;
  detalleFila: PlanillaFilaDto | null = null;
  detalleCol: PlanillaColumnaDto | null = null;
  detalleForm = {
    estadoAsistencia: '' as EstadoAsistenciaGuardia | '',
    horaEntrada: '',
    horaSalida: '',
    firmaImagenUrl: '',
    observaciones: '',
  };

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

  get resumenCobertura() {
    return this.planilla?.resumenCobertura ?? { programados: 0, faltasProgramadas: 0, cubiertos: 0 };
  }

  ngOnInit(): void {
    this.aplicarRangoReferencia();
    this.cargar();
  }

  cambiarSubVista(v: 'planilla' | 'historial'): void {
    this.subVista = v;
    if (v === 'historial') this.cargarHistorial();
  }

  aplicarRangoReferencia(): void {
    const r = rangoGuardiaDefault(this.fechaReferencia ?? undefined);
    this.filtroDesde = r.desde;
    this.filtroHasta = r.hasta;
  }

  recargarConFecha(fecha: string | null): void {
    this.fechaReferencia = fecha;
    this.aplicarRangoReferencia();
    if (this.subVista === 'planilla') this.cargar();
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

  cargarHistorial(page = this.historialPage): void {
    this.historialLoading = true;
    this.historialPage = page;
    this.api
      .listar({
        desde: this.filtroDesde,
        hasta: this.filtroHasta,
        grupo: this.filtroGrupo !== 'TODAS' ? this.filtroGrupo : undefined,
        page,
        pageSize: 25,
      })
      .subscribe({
        next: (r) => {
          this.historialItems = r.items;
          this.historialTotal = r.total;
          this.historialTotalPages = r.totalPages;
          this.historialLoading = false;
        },
        error: (err) => {
          this.historialLoading = false;
          this.toast.error(mensajeApiError(err, 'No se pudo cargar el historial.'));
        },
      });
  }

  limpiarFiltros(): void {
    this.aplicarRangoReferencia();
    this.filtroGrupo = 'TODAS';
    if (this.subVista === 'planilla') this.cargar();
    else this.cargarHistorial(1);
  }

  aplicarFiltros(): void {
    if (this.subVista === 'planilla') this.cargar();
    else this.cargarHistorial(1);
  }

  exportarExcel(): void {
    if (!this.planilla?.filas.length) {
      this.toast.error('No hay datos para exportar.');
      return;
    }
    const columnas = ['N°', 'Voluntario', 'Grupo', 'Total'];
    for (const g of this.columnasAgrupadas) {
      for (const col of g.cols) {
        columnas.push(`${g.label} ${col.sublabel}`);
      }
    }
    const filas = this.planilla.filas.map((f) => {
      const row: unknown[] = [f.numero, f.nombre, f.grupoGuardia ?? '—', f.totalAsistencias];
      for (const g of this.columnasAgrupadas) {
        for (const col of g.cols) {
          const celda = f.celdas[col.key];
          const estado = celda?.estadoAsistencia;
          row.push(estado ? this.etiquetasEstado[estado] : '—');
        }
      }
      return row;
    });
    exportarExcelSidep({
      titulo: 'Planilla de asistencia · Guardias',
      meta: [`Período: ${this.filtroDesde} — ${this.filtroHasta}`],
      columnas,
      filas,
      nombreArchivo: `asistencia-guardias_${this.filtroDesde}_${this.filtroHasta}`,
    });
  }

  abrirDetalle(fila: PlanillaFilaDto, col: PlanillaColumnaDto): void {
    if (!this.puedeGestionar) return;
    const celda = fila.celdas[col.key];
    this.detalleFila = fila;
    this.detalleCol = col;
    this.detalleForm = {
      estadoAsistencia: (celda?.estadoAsistencia ?? '') as EstadoAsistenciaGuardia | '',
      horaEntrada: celda?.horaEntrada ?? '',
      horaSalida: celda?.horaSalida ?? '',
      firmaImagenUrl: '',
      observaciones: '',
    };
    this.detalleAbierto = true;
    if (celda?.id) {
      this.api.obtener(celda.id).subscribe({
        next: (det) => {
          if (this.detalleFila?.usuarioRut !== fila.usuarioRut || this.detalleCol?.key !== col.key) return;
          this.detalleForm.firmaImagenUrl = det.firmaImagenUrl ?? '';
          this.detalleForm.observaciones = det.observaciones ?? '';
          if (!this.detalleForm.horaEntrada) this.detalleForm.horaEntrada = det.horaEntrada ?? '';
          if (!this.detalleForm.horaSalida) this.detalleForm.horaSalida = det.horaSalida ?? '';
        },
        error: () => {
          /* detalle liviano sin firma si falla */
        },
      });
    }
  }

  cerrarDetalle(): void {
    this.detalleAbierto = false;
    this.detalleFila = null;
    this.detalleCol = null;
  }

  guardarDetalle(): void {
    if (!this.detalleFila || !this.detalleCol || this.guardandoCelda) return;
    const estado = (this.detalleForm.estadoAsistencia || null) as EstadoAsistenciaGuardia | null;
    const filaRut = this.detalleFila.usuarioRut;
    const colKey = this.detalleCol.key;
    this.guardandoCelda = true;
    this.api
      .guardarCelda({
        fecha: this.detalleCol.fecha,
        usuarioRut: filaRut,
        tipoTurno: this.detalleCol.tipoTurno,
        estadoAsistencia: estado,
        grupoGuardia: this.detalleFila.grupoGuardia,
        horaEntrada: this.detalleForm.horaEntrada || null,
        horaSalida: this.detalleForm.horaSalida || null,
        firmaImagenUrl: this.detalleForm.firmaImagenUrl || null,
        observaciones: this.detalleForm.observaciones || null,
      })
      .subscribe({
        next: (resp) => {
          this.guardandoCelda = false;
          this.cerrarDetalle();
          this.toast.exito('Asistencia actualizada.');
          this.aplicarRespuestaCelda(filaRut, colKey, estado, resp);
        },
        error: (err) => {
          this.guardandoCelda = false;
          this.toast.error(mensajeApiError(err, 'No se pudo guardar la celda.'));
        },
      });
  }

  cambiarEstado(fila: PlanillaFilaDto, col: PlanillaColumnaDto, raw: string): void {
    if (!this.puedeGestionar || this.guardandoCelda) return;
    const estado = (raw || null) as EstadoAsistenciaGuardia | null;
    if (estado === 'ASISTE' || estado === 'REEMPLAZA' || estado === 'VACACIONES') {
      const celda = fila.celdas[col.key];
      this.detalleFila = fila;
      this.detalleCol = col;
      this.detalleForm = {
        estadoAsistencia: estado,
        horaEntrada: celda?.horaEntrada ?? (estado === 'VACACIONES' ? '' : new Date().toTimeString().slice(0, 5)),
        horaSalida: celda?.horaSalida ?? '',
        firmaImagenUrl: '',
        observaciones: '',
      };
      this.detalleAbierto = true;
      if (celda?.id) {
        this.api.obtener(celda.id).subscribe({
          next: (det) => {
            if (this.detalleFila?.usuarioRut !== fila.usuarioRut || this.detalleCol?.key !== col.key) return;
            this.detalleForm.firmaImagenUrl = det.firmaImagenUrl ?? '';
            this.detalleForm.observaciones = det.observaciones ?? '';
          },
        });
      }
      return;
    }
    this.guardandoCelda = true;
    const filaRut = fila.usuarioRut;
    const colKey = col.key;
    this.api
      .guardarCelda({
        fecha: col.fecha,
        usuarioRut: filaRut,
        tipoTurno: col.tipoTurno,
        estadoAsistencia: estado,
        grupoGuardia: fila.grupoGuardia,
      })
      .subscribe({
        next: (resp) => {
          this.guardandoCelda = false;
          this.aplicarRespuestaCelda(filaRut, colKey, estado, resp);
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
          horaEntrada: celda.horaEntrada,
          horaSalida: celda.horaSalida,
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
    if (estado === 'VACACIONES') return 'sid-asistencia-celda--vacaciones';
    return '';
  }

  tituloRegistrador(r: { nombre: string; rol: string; ultimaActualizacion: string }): string {
    const when = new Date(r.ultimaActualizacion).toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    return `${r.nombre} (${r.rol}) · ${when}`;
  }

  etiquetaHistorial(a: AsistenciaCuarteleroDto): string {
    return a.estadoAsistencia ? this.etiquetasEstado[a.estadoAsistencia] : '—';
  }

  /** Celdas de una fila en orden de columnas (vista móvil). */
  celdasDeFila(fila: PlanillaFilaDto): Array<{ col: PlanillaColumnaDto; celda: PlanillaCeldaDto | undefined }> {
    if (!this.planilla) return [];
    return this.planilla.columnas.map((col) => ({ col, celda: fila.celdas[col.key] }));
  }

  private aplicarRespuestaCelda(
    filaRut: string,
    colKey: string,
    estado: EstadoAsistenciaGuardia | null,
    resp: AsistenciaCuarteleroDto | { ok: boolean; eliminado: boolean },
  ): void {
    if (!this.planilla || 'eliminado' in resp) {
      this.cargar();
      return;
    }
    const fila = this.planilla.filas.find((f) => f.usuarioRut === filaRut);
    if (!fila) {
      this.cargar();
      return;
    }
    const prev = fila.celdas[colKey];
    const patch: PlanillaCeldaDto = {
      id: resp.id ?? prev?.id ?? null,
      estadoAsistencia: estado,
      horaEntrada: resp.horaEntrada ?? prev?.horaEntrada ?? null,
      horaSalida: resp.horaSalida ?? prev?.horaSalida ?? null,
      tieneFirma: Boolean(resp.firmaImagenUrl) || Boolean(prev?.tieneFirma),
      programadoGuardia: prev?.programadoGuardia ?? false,
      registradoPor: resp.registradoPor ?? prev?.registradoPor ?? null,
      updatedAt: resp.updatedAt ?? new Date().toISOString(),
    };
    fila.celdas[colKey] = patch;
    fila.totalAsistencias = Object.values(fila.celdas).filter(
      (c) => c.estadoAsistencia === 'ASISTE' || c.estadoAsistencia === 'REEMPLAZA',
    ).length;
    this.recalcularResumenCobertura();
  }

  private recalcularResumenCobertura(): void {
    if (!this.planilla) return;
    let programados = 0;
    let faltasProgramadas = 0;
    for (const f of this.planilla.filas) {
      for (const c of Object.values(f.celdas)) {
        if (!c.programadoGuardia) continue;
        programados += 1;
        const ok = c.estadoAsistencia === 'ASISTE' || c.estadoAsistencia === 'REEMPLAZA';
        if (!ok) faltasProgramadas += 1;
      }
    }
    this.planilla.resumenCobertura = {
      programados,
      faltasProgramadas,
      cubiertos: programados - faltasProgramadas,
    };
  }
}
