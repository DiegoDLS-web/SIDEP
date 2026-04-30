import { CommonModule, formatDate } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, filter, forkJoin, map, of, startWith, switchMap, type Observable } from 'rxjs';
import type { ParteAsistenciaMetadata, ParteEmergenciaDto, ParteMetadataDto } from '../../models/parte.dto';
import { PartesExportService } from '../../services/partes-export.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { ASISTENCIA_CONTEXTO_OPCIONES, ASISTENCIA_ITEM_LABELS } from './asistencia-roster.constants';
import type { AsistenciaContextoKey } from '../../models/parte.dto';
import { CLAVES_COMPANIA_SERVICIOS, CLAVES_NUEVO_PARTE, CLAVES_OPERATIVAS, etiquetaClave } from './partes.constants';

type DetalleVm =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; parte: ParteEmergenciaDto; analitica: ParteAnalitica };

type ParteAnalitica = {
  tiempoDespachoMin: number | null;
  tiempoRespuestaMin: number | null;
  tiempoServicioMin: number | null;
  voluntariosParte: number | null;
  promedioVoluntariosBase: number | null;
  tendenciaVoluntarios: 'subio' | 'bajo' | 'igual' | 'sin-datos';
};

@Component({
  selector: 'app-parte-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './parte-detalle.component.html',
})
export class ParteDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly partesApi = inject(PartesService);
  private readonly exportador = inject(PartesExportService);
  private readonly toast = inject(ToastService);

  readonly vm$ = this.route.paramMap.pipe(
    map((pm) => pm.get('id')),
    filter((id): id is string => id !== null && id !== ''),
    map((id) => Number(id)),
    filter((id) => Number.isFinite(id) && id > 0),
    switchMap((id) =>
      forkJoin({
        parte: this.partesApi.obtener(id),
        lista: this.partesApi.listar().pipe(catchError(() => of([] as ParteEmergenciaDto[]))),
      }).pipe(
        map(
          ({ parte, lista }): DetalleVm => ({
            status: 'ok',
            parte,
            analitica: this.construirAnalitica(parte, lista),
          }),
        ),
        catchError(
          (): Observable<DetalleVm> => of({ status: 'error', message: 'No se pudo cargar el parte.' }),
        ),
        startWith({ status: 'loading' } satisfies DetalleVm),
      ),
    ),
  );

  etiquetaClave = etiquetaClave;
  readonly clavesOperativas = CLAVES_OPERATIVAS;
  readonly clavesCompania = CLAVES_COMPANIA_SERVICIOS;
  readonly asistenciaContextos = ASISTENCIA_CONTEXTO_OPCIONES;

  claveEnCatalogo(v: string): boolean {
    return CLAVES_NUEVO_PARTE.some((c) => c.value === v);
  }
  editando = false;
  guardando = false;
  errorEdicion: string | null = null;
  form = {
    claveEmergencia: '',
    direccion: '',
    fecha: '',
    estado: '',
  };

  idDisplay(correlativo: string): string {
    return `P-${correlativo}`;
  }

  fechaHora(fechaIso: string): string {
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    return `${formatDate(d, 'dd/MM/yyyy HH:mm', 'es-CL')}`;
  }

  estadoClase(estado: string): string {
    const e = estado.toUpperCase();
    if (e === 'COMPLETADO') {
      return 'bg-green-600/20 text-green-400';
    }
    if (e === 'PENDIENTE') {
      return 'bg-yellow-600/20 text-yellow-400';
    }
    if (e === 'BORRADOR') {
      return 'bg-slate-600/30 text-slate-300';
    }
    return 'bg-gray-600/20 text-gray-300';
  }

  triageClase(t: string): string {
    switch (t) {
      case 'ROJO':
        return 'text-red-400';
      case 'AMARILLO':
        return 'text-yellow-400';
      case 'VERDE':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  }

  iniciarEdicion(parte: ParteEmergenciaDto): void {
    this.editando = true;
    this.errorEdicion = null;
    this.form = {
      claveEmergencia: parte.claveEmergencia,
      direccion: parte.direccion,
      fecha: this.isoLocal(parte.fecha),
      estado: parte.estado,
    };
  }

  cancelarEdicion(): void {
    this.editando = false;
    this.errorEdicion = null;
  }

  guardarEdicion(parte: ParteEmergenciaDto): void {
    if (!this.form.claveEmergencia.trim() || !this.form.direccion.trim() || !this.form.estado.trim()) {
      this.errorEdicion = 'Completa los campos obligatorios.';
      return;
    }
    this.guardando = true;
    this.errorEdicion = null;
    this.partesApi
      .actualizar(parte.id, {
        claveEmergencia: this.form.claveEmergencia.trim(),
        direccion: this.form.direccion.trim(),
        fecha: this.form.fecha ? new Date(this.form.fecha).toISOString() : undefined,
        estado: this.form.estado.trim().toUpperCase(),
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.editando = false;
          this.toast.programarTrasRecarga('Parte actualizado correctamente.');
          window.location.reload();
        },
        error: () => {
          this.guardando = false;
          this.errorEdicion = 'No se pudo guardar la edición.';
          this.toast.error('No se pudo guardar la edición.');
        },
      });
  }

  editarParteCompleto(parte: ParteEmergenciaDto): void {
    void this.router.navigate(['/partes/nuevo'], { queryParams: { editar: parte.id } });
  }

  private isoLocal(fechaIso: string): string {
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const hh = `${d.getHours()}`.padStart(2, '0');
    const mm = `${d.getMinutes()}`.padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }

  descargarPdf(parte: ParteEmergenciaDto): void {
    this.exportador.exportarPdf(parte);
  }

  tieneDetalleExtendido(m: ParteMetadataDto): boolean {
    return !!(
      m.descripcionEmergencia?.trim() ||
      m.trabajoRealizado?.trim() ||
      m.horaDelLlamado?.trim() ||
      m.horaLlamadoCodigo?.trim() ||
      m.materialUtilizado?.trim() ||
      m.observaciones?.trim() ||
      this.asistenciaTieneDatos(m.asistencia) ||
      (m.conductoresPorCarroId && Object.keys(m.conductoresPorCarroId).length > 0) ||
      (m.vehiculos && m.vehiculos.length > 0) ||
      (m.apoyoExterno && m.apoyoExterno.length > 0)
    );
  }

  asistenciaTieneDatos(a: ParteAsistenciaMetadata | undefined): boolean {
    if (!a) {
      return false;
    }
    const sel = a.asistenciaSeleccion;
    if (sel && typeof sel === 'object' && Object.values(sel).some(Boolean)) {
      return true;
    }
    const apc = a.asistenciaPorContexto;
    if (apc && typeof apc === 'object') {
      for (const v of Object.values(apc)) {
        if (v && typeof v === 'object' && Object.values(v).some(Boolean)) {
          return true;
        }
      }
    }
    if (a.radiosSeleccion && Object.values(a.radiosSeleccion).some(Boolean)) {
      return true;
    }
    if (a.radiosDetalle && Object.values(a.radiosDetalle).some((v) => typeof v === 'string' && v.trim().length > 0)) {
      return true;
    }
    if (a.firmaEncargadoDatos?.startsWith('data:image') || a.firmaObac?.startsWith('data:image')) {
      return true;
    }
    const keysTexto: (keyof ParteAsistenciaMetadata)[] = [
      'detalleComandoIncidente',
      'comandoIncidenteCi',
      'comandoIncidenteJs',
      'comandoIncidenteJo',
      'otraCompaniaNombre',
      'otraCompaniaNombreCompania',
      'otraCompaniaUnidad',
      'asistenciaTotal',
      'oficial128',
      'radiosUtilizadas',
      'encargadoDatos',
      'nombreObac',
    ];
    for (const k of keysTexto) {
      const v = a[k];
      if (typeof v === 'string' && v.trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  /** Campos de texto de asistencia (solo claves string en el resumen). */
  readonly etiquetasAsistencia: Array<{
    k:
      | 'detalleComandoIncidente'
      | 'comandoIncidenteCi'
      | 'comandoIncidenteJs'
      | 'comandoIncidenteJo'
      | 'otraCompaniaNombre'
      | 'otraCompaniaNombreCompania'
      | 'otraCompaniaUnidad'
      | 'asistenciaTotal'
      | 'oficial128';
    label: string;
  }> = [
    { k: 'comandoIncidenteCi', label: 'Comando incidente — C. I (nombre o clave)' },
    { k: 'comandoIncidenteJs', label: 'Comando incidente — J. S (nombre o clave)' },
    { k: 'comandoIncidenteJo', label: 'Comando incidente — J. O (nombre o clave)' },
    { k: 'detalleComandoIncidente', label: 'Comando incidente (texto único, legado)' },
    { k: 'otraCompaniaNombre', label: 'Otra compañía — nombre' },
    { k: 'otraCompaniaNombreCompania', label: 'Otra compañía — compañía' },
    { k: 'otraCompaniaUnidad', label: 'Otra compañía — unidad' },
    { k: 'asistenciaTotal', label: 'Asistencia total (voluntarios)' },
    { k: 'oficial128', label: 'Oficial 12-8' },
  ];

  radiosAsistenciaLista(a: ParteAsistenciaMetadata | undefined): string[] {
    if (!a?.radiosSeleccion) {
      return [];
    }
    return Object.entries(a.radiosSeleccion)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  nombresAsistenciaMarcados(sel: Record<string, boolean> | undefined): string[] {
    if (!sel) {
      return [];
    }
    return Object.entries(sel)
      .filter(([, v]) => v)
      .map(([id]) => ASISTENCIA_ITEM_LABELS[id] ?? id);
  }

  nombresAsistenciaContexto(
    a: ParteAsistenciaMetadata | undefined,
    ctx: AsistenciaContextoKey,
  ): string[] {
    return this.nombresAsistenciaMarcados(a?.asistenciaPorContexto?.[ctx]);
  }

  usaAsistenciaPorContexto(a: ParteAsistenciaMetadata | undefined): boolean {
    const apc = a?.asistenciaPorContexto;
    if (!apc) {
      return false;
    }
    return Object.values(apc).some((rec) => rec && Object.values(rec).some(Boolean));
  }

  entradasConductores(rec: Record<string, string> | undefined): [string, string][] {
    if (!rec) {
      return [];
    }
    return Object.entries(rec);
  }

  conductorUnidad(metadata: ParteMetadataDto | null | undefined, carroId: number): string {
    const m = metadata?.conductoresPorCarroId;
    if (!m) {
      return '—';
    }
    const v = m[String(carroId)]?.trim();
    return v || '—';
  }

  horaDelLlamadoDisplay(parte: ParteEmergenciaDto): string {
    return parte.metadata?.horaDelLlamado?.trim() || '—';
  }

  /** Apoyo externo: patente y conductor; compatibilidad con `movil` antiguo. */
  lineaApoyo(
    a: NonNullable<ParteMetadataDto['apoyoExterno']>[number],
  ): string {
    const base = `${a.tipo} — ${a.nombre} (${a.cargo})`;
    const pat = a.patente?.trim();
    const cond = a.conductor?.trim();
    const leg = 'movil' in a && typeof (a as { movil?: string }).movil === 'string' ? (a as { movil?: string }).movil?.trim() : '';
    const parts = [base];
    if (pat) {
      parts.push(`Pat. ${pat}`);
    } else if (leg) {
      parts.push(leg);
    }
    if (cond) {
      parts.push(`Cond. ${cond}`);
    }
    return parts.join(' · ');
  }

  private parseHora(baseFecha: string, hhmm: string | undefined): Date | null {
    if (!hhmm) return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const d = new Date(baseFecha);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  private diffMin(a: Date | null, b: Date | null): number | null {
    if (!a || !b) return null;
    const x = (b.getTime() - a.getTime()) / 60000;
    if (!Number.isFinite(x) || x < 0 || x > 24 * 60) return null;
    return Number(x.toFixed(2));
  }

  private promedio(nums: number[]): number | null {
    if (!nums.length) return null;
    return Number((nums.reduce((acc, n) => acc + n, 0) / nums.length).toFixed(2));
  }

  private parseAsistenciaTotal(parte: ParteEmergenciaDto): number | null {
    const raw = parte.metadata?.asistencia?.asistenciaTotal;
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  }

  private construirAnalitica(parte: ParteEmergenciaDto, lista: ParteEmergenciaDto[]): ParteAnalitica {
    const tiemposDespacho: number[] = [];
    const tiemposRespuesta: number[] = [];
    const tiemposServicio: number[] = [];
    for (const u of parte.unidades) {
      const base = new Date(parte.fecha);
      const horaDespacho = this.parseHora(parte.fecha, u.hora6_0 || u.horaSalida);
      const horaLlegada = this.parseHora(parte.fecha, u.hora6_3 || u.horaLlegada);
      const horaDisponible = this.parseHora(parte.fecha, u.hora6_10 || u.horaLlegada);
      const despacho = this.diffMin(base, horaDespacho);
      const respuesta = this.diffMin(horaDespacho, horaLlegada);
      const servicio = this.diffMin(horaDespacho, horaDisponible);
      if (despacho != null) tiemposDespacho.push(despacho);
      if (respuesta != null) tiemposRespuesta.push(respuesta);
      if (servicio != null) tiemposServicio.push(servicio);
    }

    const voluntariosParte = this.parseAsistenciaTotal(parte);
    const muestra = lista
      .filter((x) => x.id !== parte.id)
      .slice(0, 30)
      .map((x) => this.parseAsistenciaTotal(x))
      .filter((x): x is number => x != null);
    const promedioVoluntariosBase = this.promedio(muestra);

    let tendenciaVoluntarios: ParteAnalitica['tendenciaVoluntarios'] = 'sin-datos';
    if (voluntariosParte != null && promedioVoluntariosBase != null) {
      if (voluntariosParte > promedioVoluntariosBase) tendenciaVoluntarios = 'subio';
      else if (voluntariosParte < promedioVoluntariosBase) tendenciaVoluntarios = 'bajo';
      else tendenciaVoluntarios = 'igual';
    }
    return {
      tiempoDespachoMin: this.promedio(tiemposDespacho),
      tiempoRespuestaMin: this.promedio(tiemposRespuesta),
      tiempoServicioMin: this.promedio(tiemposServicio),
      voluntariosParte,
      promedioVoluntariosBase,
      tendenciaVoluntarios,
    };
  }

  tendenciaVoluntariosEtiqueta(v: ParteAnalitica['tendenciaVoluntarios']): string {
    if (v === 'subio') return 'Subio';
    if (v === 'bajo') return 'Bajo';
    if (v === 'igual') return 'Igual';
    return 'Sin datos';
  }

  tendenciaVoluntariosClase(v: ParteAnalitica['tendenciaVoluntarios']): string {
    if (v === 'subio') return 'text-emerald-300';
    if (v === 'bajo') return 'text-amber-300';
    if (v === 'igual') return 'text-sky-300';
    return 'text-gray-400';
  }

}
