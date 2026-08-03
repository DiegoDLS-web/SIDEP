import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout, throwError, type Observable } from 'rxjs';
import type { CarroDto } from '../../models/carro.dto';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { CarrosService } from '../../services/carros.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { LicenciasService } from '../../services/licencias.service';
import { CatalogoTiposEmergenciaService } from '../../services/catalogo-tipos-emergencia.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { CLAVE_BORRADOR_DEFAULT, claveEmergenciaExigeUnidadesEnDespacho } from './partes.constants';
import {
  ASISTENCIA_CONTEXTO_OPCIONES,
  ASISTENCIA_LAYOUT,
  RADIOS_PARTE_OPCIONES,
  type AsistenciaColumnaDef,
  type AsistenciaItemDef,
  type AsistenciaSeccionDef,
} from './asistencia-roster.constants';
import { etiquetaDirectorioVoluntario, etiquetaPadronAsistenciaParte, nombreListaSoloPersona, ordenPorClaveNomina, CARGOS_INSPECTORES_COMANDANCIA, CARGOS_OFICIALES_COMPANIA, CARGOS_OFICIALES_GENERALES } from '../usuarios/usuario-registro.constants';
import { mensajeApiError } from '../../utils/api-error.util';
import { esUsuarioOperativo } from '../../utils/usuario-operativo.util';
import { formatearFechaBorradorLocal, manejarErrorGuardadoConBorradorLocal } from '../../utils/borrador-local.util';
import { BorradorLocalService } from '../../services/borrador-local.service';
import { AutosaveLocal } from '../../utils/autosave-local.helper';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { AuthService } from '../../services/auth.service';
import { puedeEditarParteCompletado } from '../../utils/parte-edicion-roles.util';
import { crearControlEdicionPendiente } from '../../utils/edicion-pendiente.util';
import type { ComponenteConEdicionPendiente } from '../../guards/edicion-pendiente.guard';
import { registrarEdicionPendienteGlobal } from '../../utils/registrar-edicion-pendiente-global.util';
import { SignaturePadComponent } from '../../shared/signature-pad.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';

// Corrección de Import: Usamos el DTO de PostgreSQL
import type { ParteEmergenciaDTO } from '../../models/parte.dto';

// Tipos definidos localmente para satisfacer la interfaz de la vista sin alterar el DTO global
export type AsistenciaContextoKey = 'emergencia' | 'curso' | 'cuartel' | 'comision' | 'comandancia';
export type ParteAsistenciaMetadata = any;
export type ParteMetadataDto = any;

type FilaUnidad = {
  carroId: string | number | ''; // Tolerante a UUID string y número legado
  conductor: string;
  hora6_0: string;
  hora6_3: string;
  hora6_9: string;
  hora6_10: string;
  kmSalida: string | number;
  kmLlegada: string | number;
};

type PacienteFila = { nombre: string; edad: string | number; rut: string; triage: string };
type VehiculoFila = { tipo: string; patente: string; marca: string; conductor: string; rut: string };
type ApoyoFila = { tipo: string; nombre: string; cargo: string; patente: string; conductor: string };
type OtraCompaniaFila = { obac: string; compania: string; unidad: string };
type PasoId = 'basicos' | 'emergencia' | 'trabajo' | 'asistencia' | 'apoyo' | 'obs';

@Component({
  selector: 'app-parte-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent, SidDateInputComponent],
  templateUrl: './parte-nuevo.component.html',
})
export class ParteNuevoComponent implements OnInit, OnDestroy, ComponenteConEdicionPendiente {
  readonly nombreListaSoloPersona = nombreListaSoloPersona;

  get exigeUnidadesDespacho(): boolean {
    return claveEmergenciaExigeUnidadesEnDespacho(this.claveEmergencia);
  }

  private readonly route = inject(ActivatedRoute);
  private readonly carrosApi = inject(CarrosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly partesApi = inject(PartesService);
  private readonly licenciasApi = inject(LicenciasService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly borradorLocal = inject(BorradorLocalService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);
  private autosaveLocal?: AutosaveLocal;

  constructor() {
    const destroyRef = inject(DestroyRef);
    registrarEdicionPendienteGlobal(destroyRef, () => this.tieneEdicionPendiente());
  }

  readonly asistenciaLayout = ASISTENCIA_LAYOUT;
  asistenciaLayoutVista: AsistenciaColumnaDef[] = ASISTENCIA_LAYOUT;
  readonly asistenciaContextos = ASISTENCIA_CONTEXTO_OPCIONES;
  readonly radiosParteOpciones = RADIOS_PARTE_OPCIONES;
  readonly tiposApoyoExterno = [
    { id: 'SAMU', label: 'SAMU' },
    { id: 'CARABINEROS', label: 'Carabineros' },
    { id: 'SEGURIDAD_CIUDADANA', label: 'Seguridad ciudadana' },
    { id: 'OTRO', label: 'Otro' },
  ] as const;

  private readonly DISP_NORMAL = 'normal';
  private readonly DISP_LICENCIA = 'licencia';
  private readonly DISP_BLOQUEADO = 'bloqueado';
  private readonly usuarioAsistenciaPorId: Record<string, UsuarioListaDto> = {};
  private readonly licenciasActivasPorUsuario: Record<string, { desde: Date; hasta: Date }> = {};

  contextoAsistenciaActivo: AsistenciaContextoKey = 'emergencia';
  carros: CarroDto[] = [];
  usuarios: UsuarioListaDto[] = [];
  loading = true;
  error: string | null = null;
  submitting = false;
  guardadoError: string | null = null;
  pasoIdx = 0;

  claveEmergencia = '';
  direccion = '';
  fechaDia = '';
  horaIncidente = '';
  obacId: string | null = null;
  estado = 'PENDIENTE';

  descripcionEmergencia = '';
  trabajoRealizado = '';
  materialUtilizado = '';
  horaDelLlamado = '';
  observaciones = '';
  motivoPendienteManual = '';

  asistenciaPorContexto: Record<AsistenciaContextoKey, Record<string, boolean>> = {
    emergencia: {},
    curso: {},
    cuartel: {},
    comision: {},
    comandancia: {},
  };

  filtroAsistencia = '';
  bloqueoAsistenciaMensaje: string | null = null;

  radiosSeleccion: Record<string, boolean> = {
    'C1-1': false,
    'C2-2': false,
    'C3-3': false,
  };

  radiosDetalle: Record<string, string> = {};
  firmaEncargadoDatos = '';
  firmaObac = '';

  asistencia: Pick<
    ParteAsistenciaMetadata,
    | 'comandoIncidenteCi'
    | 'comandoIncidenteJs'
    | 'comandoIncidenteJo'
    | 'otraCompaniaNombre'
    | 'otraCompaniaNombreCompania'
    | 'otraCompaniaUnidad'
    | 'oficial128'
    | 'encargadoDatos'
    | 'nombreObac'
  > = {
    comandoIncidenteCi: '',
    comandoIncidenteJs: '',
    comandoIncidenteJo: '',
    otraCompaniaNombre: '',
    otraCompaniaNombreCompania: '',
    otraCompaniaUnidad: '',
    oficial128: '',
    encargadoDatos: '',
    nombreObac: '',
  };

  unidades: FilaUnidad[] = [
    {
      carroId: '',
      conductor: '',
      hora6_0: '',
      hora6_3: '',
      hora6_9: '',
      hora6_10: '',
      kmSalida: '',
      kmLlegada: '',
    },
  ];

  pacientes: PacienteFila[] = [];
  vehiculos: VehiculoFila[] = [];
  apoyos: ApoyoFila[] = [];
  otrasCompanias: OtraCompaniaFila[] = [];
  mostrarComandoIncidente = false;
  
  editandoParteId: string | number | null = null;

  private readonly controlEdicion = crearControlEdicionPendiente(() => ({
    claveEmergencia: this.claveEmergencia,
    direccion: this.direccion,
    fechaDia: this.fechaDia,
    horaIncidente: this.horaIncidente,
    horaDelLlamado: this.horaDelLlamado,
    obacId: this.obacId,
    descripcionEmergencia: this.descripcionEmergencia,
    trabajoRealizado: this.trabajoRealizado,
    materialUtilizado: this.materialUtilizado,
    observaciones: this.observaciones,
    motivoPendienteManual: this.motivoPendienteManual,
    unidades: this.unidades,
    pacientes: this.pacientes,
    asistencia: this.asistencia,
    asistenciaPorContexto: this.asistenciaPorContexto,
    firmaEncargadoDatos: this.firmaEncargadoDatos,
    firmaObac: this.firmaObac,
  }));

  tieneEdicionPendiente(): boolean {
    if (this.loading || this.submitting) return false;
    return this.controlEdicion.tieneCambios();
  }

  readonly triageOpciones = [
    { v: 'VERDE', l: 'Verde' },
    { v: 'AMARILLO', l: 'Amarillo' },
    { v: 'ROJO', l: 'Rojo' },
    { v: 'NEGRO', l: 'Negro' },
  ];

  readonly materialesSugeridos = [
    'Tabla espinal', 'Collar cervical', 'Bolso de trauma', 'Oxigeno',
    'DEA', 'Camilla', 'Ferno', 'Laringoscopio', 'Monitor', 'Aposito'
  ];

  ngOnInit(): void {
    this.autosaveLocal = new AutosaveLocal(
      this.borradorLocal,
      'parte',
      () => this.claveParteLocal(),
      () => this.payloadAutosaveLocal(),
      { habilitado: () => !this.loading && !this.submitting },
    );

    const parteIdRaw = this.route.snapshot.queryParamMap.get('editar');
    this.editandoParteId = parteIdRaw?.trim() ? parteIdRaw.trim() : null;

    if (this.editandoParteId == null) {
      const d = new Date();
      this.fechaDia = this.toDateInput(d);
      this.horaIncidente = this.toTimeInput(d);
      this.horaDelLlamado = this.toTimeInput(d);
    }

    forkJoin({
      carros: this.carrosApi.listar().pipe(catchError(() => of([]))),
      usuarios: this.usuariosApi.voluntariosParaSelect().pipe(catchError(() => of([] as UsuarioListaDto[]))),
      licencias: this.licenciasApi.listarActivas(this.fechaDia).pipe(catchError(() => of([]))),
      parteEdicion:
        this.editandoParteId != null
          ? this.partesApi.obtener(String(this.editandoParteId)).pipe(catchError(() => of(null)))
          : of(null),
    }).subscribe({
      next: ({ carros, usuarios, licencias, parteEdicion }: any) => {
        if (this.editandoParteId && !parteEdicion) {
          this.error = 'No se pudo cargar el parte a editar.';
          this.loading = false;
          return;
        }
        this.carros = carros?.data ? carros.data : (carros ?? []);
        this.usuarios = (usuarios ?? []).filter((u: UsuarioListaDto) => esUsuarioOperativo(u));
        this.aplicarLicenciasActivas(licencias);
        this.reconstruirAsistenciaLayout();
        for (const r of this.radiosParteOpciones) {
          if (this.radiosDetalle[r.id] === undefined) {
            this.radiosDetalle[r.id] = '';
          }
        }
        if (parteEdicion) {
          const parte = parteEdicion.data ? parteEdicion.data : parteEdicion;
          const estadoRaw =
            typeof parte.estado === 'string'
              ? parte.estado
              : (parte.estado?.codigo ?? parte.estado?.nombre ?? '');
          const estado = String(estadoRaw).trim().toUpperCase();
          if (estado === 'COMPLETADO' && !puedeEditarParteCompletado(this.auth.usuarioActual?.rol)) {
            this.error = 'Solo capitán, tenientes o administrador pueden editar un parte completado.';
            this.toast.advertencia(this.error);
            void this.router.navigate(['/partes']);
            this.loading = false;
            return;
          }
          this.cargarParteEnFormulario(parte);
          this.recargarLicenciasParaFechaParte();
        }
        this.controlEdicion.marcarLimpio();
        this.loading = false;
        void this.ofrecerRestaurarBorradorLocal();
      },
      error: () => {
        this.error = this.editandoParteId
          ? 'No se pudieron cargar datos para editar el parte.'
          : 'No se pudieron cargar carros u OBAC. ¿Backend activo?';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.autosaveLocal?.destruir();
  }

  programarAutosaveLocal(): void {
    this.autosaveLocal?.programar();
  }

  get esEdicion(): boolean {
    return this.editandoParteId != null;
  }

  onFechaAsistenciaChange(): void {
    this.recargarLicenciasParaFechaParte();
  }

  private recargarLicenciasParaFechaParte(): void {
    if (!this.fechaDia?.trim()) return;
    this.licenciasApi.listarActivas(this.fechaDia).subscribe({
      next: (rows) => {
        this.aplicarLicenciasActivas(rows);
        this.sanearSeleccionPorDisponibilidadFecha();
      },
      error: () => {
        this.aplicarLicenciasActivas([]);
        this.sanearSeleccionPorDisponibilidadFecha();
      },
    });
  }

  private voluntarioDisponibleParaParte(u: UsuarioListaDto): boolean {
    return this.estadoDisponibilidadAsistencia(`usr-${u.id}`) === this.DISP_NORMAL;
  }

  private mantenimientoVencidoEnFecha(c: CarroDto, fecha: Date): boolean {
    const ref = new Date(fecha);
    ref.setHours(0, 0, 0, 0);
    for (const iso of [c.proximoMantenimiento, c.proximaRevisionTecnica]) {
      if (!iso) continue;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      if (d < ref) return true;
    }
    return false;
  }

  carroDisponibleParaParte(c: CarroDto | undefined, fecha: Date = this.fechaBaseAsistencia()): boolean {
    if (!c) return false;
    if (c.estadoOperativo !== 1) return false;
    if (this.mantenimientoVencidoEnFecha(c, fecha)) return false;
    return true;
  }

  motivoCarroNoDisponible(c: CarroDto, fecha: Date = this.fechaBaseAsistencia()): string {
    if (c.estadoOperativo === 0) return 'Fuera de servicio';
    if (c.estadoOperativo === 2) return 'En mantención';
    if (c.estadoOperativo !== 1) return 'No operativa';
    if (this.mantenimientoVencidoEnFecha(c, fecha)) return 'Mantención o revisión técnica vencida en esa fecha';
    return '';
  }

  private sanearSeleccionPorDisponibilidadFecha(): void {
    const fecha = this.fechaBaseAsistencia();
    this.unidades.forEach((u) => {
      if (!u.carroId) return;
      const carro = this.carros.find((c) => String(c.id) === String(u.carroId));
      if (!carro || !this.carroDisponibleParaParte(carro, fecha)) {
        u.carroId = '';
        u.conductor = '';
      } else if (this.textoCampoSeguro(u.conductor)) {
        const conductorNombre = this.textoCampoSeguro(u.conductor);
        const conductor = this.voluntariosConductores.find(
          (v) => nombreListaSoloPersona(v) === conductorNombre,
        );
        if (!conductor) u.conductor = '';
      }
    });

    for (const { key } of ASISTENCIA_CONTEXTO_OPCIONES) {
      const ctx = (this.asistenciaPorContexto as Record<string, Record<string, boolean>>)[key] ?? {};
      for (const id of Object.keys(ctx)) {
        if (ctx[id] && this.asistenciaNoSeleccionable(id)) {
          ctx[id] = false;
        }
      }
    }

    const obac = this.resolverObacId();
    if (obac) {
      const u = this.usuarios.find((x) => x.id === obac || x.rut === obac);
      if (u && !this.voluntarioDisponibleParaParte(u)) {
        this.obacId = '';
      }
    }
  }

  private validarDisponibilidadOperativaAntesDeGuardar(): string | null {
    const fecha = this.fechaBaseAsistencia();
    const obac = this.resolverObacId();
    if (obac) {
      const u = this.usuarios.find((x) => x.id === obac || x.rut === obac);
      if (u && !this.voluntarioDisponibleParaParte(u)) {
        return this.motivoDisponibilidadAsistencia(`usr-${u.id}`) || 'El OBAC seleccionado no está disponible en la fecha del parte.';
      }
    }

    for (const u of this.unidades) {
      if (!u.carroId) continue;
      const carro = this.carros.find((c) => String(c.id) === String(u.carroId));
      if (!carro || !this.carroDisponibleParaParte(carro, fecha)) {
        const nom = carro?.nomenclatura ?? 'seleccionada';
        const motivo = carro ? this.motivoCarroNoDisponible(carro, fecha) : 'no encontrada';
        return `La unidad ${nom} no puede despacharse: ${motivo.toLowerCase()}.`;
      }
      const conductorNombre = (u.conductor ?? '').trim();
      if (conductorNombre) {
        const conductor = this.voluntariosConductores.find((v) => nombreListaSoloPersona(v) === conductorNombre);
        if (!conductor) {
          return `El conductor ${conductorNombre} no está disponible en la fecha del parte.`;
        }
      }
    }

    for (const { key } of ASISTENCIA_CONTEXTO_OPCIONES) {
      const ctx = (this.asistenciaPorContexto as Record<string, Record<string, boolean>>)[key] ?? {};
      for (const [id, marcado] of Object.entries(ctx)) {
        if (!marcado || !id.startsWith('usr-')) continue;
        if (this.asistenciaNoSeleccionable(id)) {
          const u = this.usuarioAsistenciaPorId[id];
          const nombre = u ? nombreListaSoloPersona(u) : 'Voluntario';
          return `${nombre} no puede figurar en asistencia: ${this.motivoDisponibilidadAsistencia(id) || 'no disponible en la fecha.'}`;
        }
      }
    }

    return null;
  }

  // Restauración de Métodos de Licencias y Fechas
  private aplicarLicenciasActivas(rows: Array<{ usuarioId: string; fechaInicio: string; fechaTermino: string }>): void {
    for (const k of Object.keys(this.licenciasActivasPorUsuario)) {
      delete this.licenciasActivasPorUsuario[k];
    }
    for (const row of rows) {
      const desde = new Date(row.fechaInicio);
      const hasta = new Date(row.fechaTermino);
      if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) continue;
      this.licenciasActivasPorUsuario[row.usuarioId] = { desde, hasta };
    }
  }

  private fechaBaseAsistencia(): Date {
    if (this.fechaDia?.trim()) {
      const d = new Date(`${this.fechaDia}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  private fechaEnRango(base: Date, desde: Date, hasta: Date): boolean {
    const b = new Date(base); b.setHours(0, 0, 0, 0);
    const d = new Date(desde); d.setHours(0, 0, 0, 0);
    const h = new Date(hasta); h.setHours(0, 0, 0, 0);
    return b.getTime() >= d.getTime() && b.getTime() <= h.getTime();
  }

  private formatearDia(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private rangoDesdeTexto(txt: string, kind: 'susp' | 'lic'): { desde: Date; hasta: Date } | null {
    if (!txt) return null;
    const t = txt.toLowerCase();
    const key = kind === 'susp' ? 'susp' : 'lic';
    const reCompact = new RegExp(`${key}\\w*\\s*\\[\\s*(\\d{4}-\\d{2}-\\d{2})\\s*[,;]\\s*(\\d{4}-\\d{2}-\\d{2})\\s*\\]`);
    const mCompact = reCompact.exec(t);
    if (mCompact) {
      const d = new Date(`${mCompact[1]}T00:00:00`);
      const h = new Date(`${mCompact[2]}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime())) return { desde: d, hasta: h };
    }
    const reDesde = new RegExp(`${key}\\w*[_\\s-]*desde\\s*[:=]\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const reHasta = new RegExp(`${key}\\w*[_\\s-]*hasta\\s*[:=]\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const mD = reDesde.exec(t);
    const mH = reHasta.exec(t);
    if (mD && mH) {
      const d = new Date(`${mD[1]}T00:00:00`);
      const h = new Date(`${mH[1]}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime())) return { desde: d, hasta: h };
    }
    return null;
  }

  get pasosVisibles(): PasoId[] { return ['basicos', 'emergencia', 'trabajo', 'asistencia', 'apoyo', 'obs']; }
  get pasoActualId(): PasoId { return this.pasosVisibles[this.pasoIdx] ?? 'basicos'; }
  get tituloPaso(): string { return this.etiquetaLargaPaso(this.pasoActualId); }

  etiquetaLargaPaso(id: PasoId): string {
    const m: Record<PasoId, string> = {
      basicos: 'Datos básicos', emergencia: 'Emergencia', trabajo: 'Trabajo realizado',
      asistencia: 'Asistencia', apoyo: 'Apoyo externo', obs: 'Observaciones y cierre',
    };
    return m[id] ?? '';
  }

  etiquetaCortaPaso(id: PasoId): string {
    const m: Record<PasoId, string> = {
      basicos: 'Básicos', emergencia: 'Lugar', trabajo: 'Trabajo',
      asistencia: 'Asist.', apoyo: 'Apoyo', obs: 'Notas',
    };
    return m[id] ?? '';
  }

  get esUltimoPaso(): boolean { return this.pasoIdx >= this.pasosVisibles.length - 1; }
  get totalPasos(): number { return this.pasosVisibles.length; }

  anteriorPaso(): void {
    if (this.pasoIdx > 0) {
      this.pasoIdx--;
      this.guardadoError = null;
    }
  }

  siguientePaso(): void {
    if (!this.esUltimoPaso) {
      this.pasoIdx++;
      this.guardadoError = null;
    }
  }

  irAPaso(i: number): void {
    if (i >= 0 && i < this.pasosVisibles.length) {
      this.pasoIdx = i;
      this.guardadoError = null;
    }
  }

  agregarUnidad(): void {
    if (this.carros.length === 0) {
      this.guardadoError = 'No hay unidades inscritas en el sistema para agregar.';
      return;
    }
    this.unidades.push({
      carroId: '', conductor: '', hora6_0: '', hora6_3: '',
      hora6_9: '', hora6_10: '', kmSalida: '', kmLlegada: '',
    });
    
  }
  
  quitarUltimaUnidad(): void {
    if (this.unidades.length > 1) {
      this.unidades.pop();
    }
  }

  onToggleAsistencia(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked && this.asistenciaNoSeleccionable(id)) {
      this.bloqueoAsistenciaMensaje = this.motivoDisponibilidadAsistencia(id) || 'No disponible en la fecha.';
      return;
    }
    const ctx = this.contextoAsistenciaActivo;
    const ctxPrevio = this.contextoAsignadoEnOtroContexto(id, ctx);
    if (checked && ctxPrevio) {
      this.bloqueoAsistenciaMensaje = `Ya marcado en ${this.etiquetaContexto(ctxPrevio)}.`;
      return;
    }
    this.bloqueoAsistenciaMensaje = null;
    const map = this.asistenciaPorContexto[ctx];
    if (checked) map[id] = true;
    else delete map[id];
  }

  conteoMarcasEnContexto(ctx: AsistenciaContextoKey): number {
    return Object.values(this.asistenciaPorContexto[ctx] || {}).filter(Boolean).length;
  }

  etiquetaContexto(ctx: AsistenciaContextoKey): string {
    return this.asistenciaContextos.find((x) => x.key === ctx)?.label ?? ctx;
  }

  private contextoAsignadoEnOtroContexto(id: string, contextoActual: AsistenciaContextoKey): AsistenciaContextoKey | null {
    for (const { key } of this.asistenciaContextos) {
      if (key !== contextoActual && (this.asistenciaPorContexto as any)[key]?.[id] === true) return key;
    }
    return null;
  }

  asistenciaBloqueadaPorOtroContexto(id: string): boolean {
    return this.contextoAsignadoEnOtroContexto(id, this.contextoAsistenciaActivo) !== null;
  }

  asistenciaContextoBloqueante(id: string): string {
    const k = this.contextoAsignadoEnOtroContexto(id, this.contextoAsistenciaActivo);
    return k ? this.etiquetaContexto(k) : '';
  }

  onToggleRadio(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.radiosSeleccion[id] = checked;
    if (!checked) this.radiosDetalle[id] = '';
  }

  radioMarcada(id: string): boolean { return this.radiosSeleccion[id] === true; }

  totalVoluntariosAsistencia(): number {
    const ids = new Set<string>();
    for (const { key } of ASISTENCIA_CONTEXTO_OPCIONES) {
      for (const [id, v] of Object.entries((this.asistenciaPorContexto as any)[key] || {})) {
        if (v && (id.startsWith('usr-') || id.startsWith('vh-') || id.startsWith('va-'))) ids.add(id);
      }
    }
    return ids.size;
  }

  asistenciaMarcada(id: string): boolean {
    return this.asistenciaPorContexto[this.contextoAsistenciaActivo]?.[id] === true;
  }

  itemsAsistenciaFiltrados(items: AsistenciaItemDef[]): AsistenciaItemDef[] {
    const q = this.filtroAsistencia.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => it.label.toLowerCase().includes(q) || it.id.toLowerCase().includes(q));
  }

  asistenciaNoSeleccionable(id: string): boolean {
    const estado = this.estadoDisponibilidadAsistencia(id);
    return estado === this.DISP_BLOQUEADO || estado === this.DISP_LICENCIA;
  }

  estadoDisponibilidadAsistencia(id: string): 'normal' | 'licencia' | 'bloqueado' {
    const u = this.usuarioAsistenciaPorId[id];
    if (!u) return this.DISP_NORMAL;
    const base = this.fechaBaseAsistencia();
    const estado = (u.estadoVoluntario ?? '').toUpperCase();
    const tipo = (u.tipoVoluntario ?? '').toUpperCase();
    const rangoSusp = this.rangoDesdeTexto(u.observacionesRegistro ?? '', 'susp');
    const rangoLic = this.rangoDesdeTexto(u.observacionesRegistro ?? '', 'lic');
    if (!u.activo || estado === 'INACTIVO') return this.DISP_BLOQUEADO;
    if ((tipo.includes('SUSP') || estado.includes('SUSP')) && (!rangoSusp || this.fechaEnRango(base, rangoSusp.desde, rangoSusp.hasta))) return this.DISP_BLOQUEADO;
    if (this.licenciasActivasPorUsuario[u.id]) return this.DISP_LICENCIA;
    if (tipo.includes('LICEN') && (!rangoLic || this.fechaEnRango(base, rangoLic.desde, rangoLic.hasta))) return this.DISP_LICENCIA;
    return this.DISP_NORMAL;
  }

  colorPuntoDisponibilidadAsistencia(id: string): string {
    const est = this.estadoDisponibilidadAsistencia(id);
    if (est === this.DISP_LICENCIA) return 'bg-yellow-400';
    if (est === this.DISP_BLOQUEADO) return 'bg-red-500';
    return 'bg-emerald-400';
  }

  motivoDisponibilidadAsistencia(id: string): string {
    const u = this.usuarioAsistenciaPorId[id];
    if (!u) return '';
    const est = this.estadoDisponibilidadAsistencia(id);
    if (est === this.DISP_NORMAL) return '';
    const obs = u.observacionesRegistro ?? '';
    const rangoSusp = this.rangoDesdeTexto(obs, 'susp');
    const rangoLic = this.rangoDesdeTexto(obs, 'lic');
    const licenciaActiva = this.licenciasActivasPorUsuario[u.id] ?? null;
    const fechas = (r: { desde: Date; hasta: Date } | null): string =>
      r ? ` (${this.formatearDia(r.desde)} a ${this.formatearDia(r.hasta)})` : '';
    if (est === this.DISP_LICENCIA) {
      if (licenciaActiva) {
        return `Con licencia médica (${this.formatearDia(licenciaActiva.desde)} a ${this.formatearDia(licenciaActiva.hasta)}).`;
      }
      return `Con licencia médica${fechas(rangoLic)}.`;
    }
    if ((u.estadoVoluntario ?? '').toUpperCase() === 'INACTIVO' || !u.activo) {
      return 'Voluntario inactivo.';
    }
    return `Voluntario suspendido${fechas(rangoSusp)}.`;
  }

  private reconstruirAsistenciaLayout(): void {
    for (const k of Object.keys(this.usuarioAsistenciaPorId)) {
      delete this.usuarioAsistenciaPorId[k];
    }

    const pool = this.usuarios
      .filter((u) => esUsuarioOperativo(u) && !this.esAspirante(u));

    const usados = new Set<string>();
    const sortClave = (a: UsuarioListaDto, b: UsuarioListaDto) => ordenPorClaveNomina(a, b);

    const mkItem = (u: UsuarioListaDto): AsistenciaItemDef => {
      const id = `usr-${u.id}`;
      usados.add(id);
      this.usuarioAsistenciaPorId[id] = u;
      return { id, label: etiquetaPadronAsistenciaParte(u) };
    };

    const tipo = (u: UsuarioListaDto) => (u.tipoVoluntario ?? '').trim().toUpperCase();
    const cargo = (u: UsuarioListaDto) => (u.cargoOficialidad ?? '').trim().toUpperCase();

    const oficialesGenerales = pool
      .filter((u) => CARGOS_OFICIALES_GENERALES.has(cargo(u)))
      .sort(sortClave)
      .map((u) => mkItem(u));

    const inspectoresComandancia = pool
      .filter((u) => CARGOS_INSPECTORES_COMANDANCIA.has(cargo(u)) && !usados.has(`usr-${u.id}`))
      .sort(sortClave)
      .map((u) => mkItem(u));

    const insignes = pool
      .filter((u) => tipo(u) === 'INSIGNE' && !usados.has(`usr-${u.id}`))
      .sort(sortClave)
      .map((u) => mkItem(u));

    const honorarios = pool
      .filter((u) => tipo(u) === 'HONORARIO' && !usados.has(`usr-${u.id}`))
      .sort(sortClave)
      .map((u) => mkItem(u));

    let oficialesCompania = pool
      .filter((u) => {
        if (usados.has(`usr-${u.id}`)) return false;
        const c = cargo(u);
        if (CARGOS_OFICIALES_COMPANIA.has(c)) return true;
        return c.length > 0 && c !== 'VOLUNTARIO' && !CARGOS_OFICIALES_GENERALES.has(c) && !CARGOS_INSPECTORES_COMANDANCIA.has(c);
      })
      .sort(sortClave)
      .map((u) => mkItem(u));

    if (oficialesCompania.length === 0) {
      for (const col of ASISTENCIA_LAYOUT) {
        for (const sec of col.secciones) {
          for (const it of sec.items) {
            oficialesCompania.push({ ...it });
          }
        }
      }
    }

    const voluntariosActivos = pool
      .filter((u) => !usados.has(`usr-${u.id}`))
      .sort(sortClave)
      .map((u) => mkItem(u));

    const seccionesIzq: AsistenciaSeccionDef[] = [];
    if (oficialesGenerales.length > 0) {
      seccionesIzq.push({ titulo: 'Oficiales generales', items: oficialesGenerales });
    }
    if (inspectoresComandancia.length > 0) {
      seccionesIzq.push({ titulo: 'Inspectores de comandancia', items: inspectoresComandancia });
    }
    if (insignes.length > 0) {
      seccionesIzq.push({ titulo: 'Insignes', items: insignes });
    }
    if (honorarios.length > 0) {
      seccionesIzq.push({ titulo: 'Honorarios', items: honorarios });
    }

    const columnas: AsistenciaColumnaDef[] = [];
    if (seccionesIzq.length > 0) {
      columnas.push({ secciones: seccionesIzq });
    }
    if (oficialesCompania.length > 0) {
      columnas.push({
        secciones: [{ titulo: 'Oficiales de compañía', items: oficialesCompania, columnasGrid: 2 }],
      });
    }
    if (voluntariosActivos.length > 0) {
      columnas.push({
        secciones: [{ titulo: 'Voluntarios', items: voluntariosActivos, columnasGrid: 2, columnasGridXl: 3 }],
      });
    }

    this.asistenciaLayoutVista = columnas.length > 0 ? columnas : [{ secciones: [] }];
  }

  clasesGridAsistencia(sec: AsistenciaSeccionDef): Record<string, boolean> {
    if (!sec.columnasGrid) return {};
    if (this.asistenciaLayoutVista.length > 1) {
      return { 'grid-cols-1': true };
    }
    const cols = sec.columnasGrid;
    const colsXl = sec.columnasGridXl ?? cols;
    return {
      'grid-cols-1': true,
      'md:grid-cols-2': cols >= 2,
      'xl:grid-cols-2': colsXl === 2,
      'xl:grid-cols-3': colsXl >= 3,
    };
  }

  onObacSeleccionado(): void {
    this.aplicarObacEnAsistenciaYCierre();
  }

  private aplicarObacEnAsistenciaYCierre(): void {
    const obac = this.resolverObacId();
    if (!obac) return;
    const u =
      this.usuariosElegiblesObac.find((x) => x.id === obac || x.rut === obac) ??
      this.usuarios.find((x) => x.id === obac || x.rut === obac);
    if (!u) return;

    const id = `usr-${u.id}`;
    this.asistenciaPorContexto.emergencia[id] = true;

    const clave = u.claveNomina?.trim() ?? '';
    const nom = nombreListaSoloPersona(u);
    this.asistencia.nombreObac = clave || nom;
    if (!(this.asistencia.oficial128 ?? '').trim()) {
      this.asistencia.oficial128 = clave || nom;
    }

    const firma = u.firmaImagen?.trim() ?? '';
    if (firma.startsWith('data:image')) {
      this.firmaObac = firma;
    }
  }

  private prepararCierreAntesDeGuardar(): void {
    this.aplicarObacEnAsistenciaYCierre();
    if (!(this.asistencia.oficial128 ?? '').trim()) {
      const obac = this.resolverObacId();
      const u = this.usuariosElegiblesObac.find((x) => x.id === obac);
      if (u) {
        this.asistencia.oficial128 = u.claveNomina?.trim() || nombreListaSoloPersona(u);
      }
    }
    if (!(this.asistencia.encargadoDatos ?? '').trim() && (this.asistencia.nombreObac ?? '').trim()) {
      this.asistencia.encargadoDatos = this.asistencia.nombreObac;
    }
    if (!(this.asistencia.oficial128 ?? '').trim() && (this.asistencia.encargadoDatos ?? '').trim()) {
      this.asistencia.oficial128 = this.asistencia.encargadoDatos;
    }
    const firmaObac = this.firmaObacEfectiva();
    if (
      firmaObac.startsWith('data:image') &&
      !this.firmaEncargadoDatos.trim().startsWith('data:image') &&
      (this.asistencia.encargadoDatos ?? '').trim() === (this.asistencia.nombreObac ?? '').trim()
    ) {
      this.firmaEncargadoDatos = firmaObac;
    }
    for (const u of this.unidades) {
      if (!u.carroId) continue;
      if (!this.textoCampoSeguro(u.hora6_9) && this.textoCampoSeguro(u.hora6_3)) {
        u.hora6_9 = this.textoCampoSeguro(u.hora6_3);
      }
    }
  }

  private mostrarErrorGuardado(mensaje: string, pasoDestino?: PasoId): void {
    this.guardadoError = mensaje;
    this.toast.error(mensaje);
    if (pasoDestino) {
      const idx = this.pasosVisibles.indexOf(pasoDestino);
      if (idx >= 0) this.pasoIdx = idx;
    }
    this.cdr.markForCheck();
    queueMicrotask(() => {
      document.getElementById('parte-guardado-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private puedeIniciarGuardado(): boolean {
    if (this.loading) {
      this.toast.advertencia('El formulario aún está cargando. Espera un momento e intenta de nuevo.');
      return false;
    }
    if (this.submitting) {
      this.toast.advertencia('Ya hay un guardado en curso. Espera a que termine.');
      return false;
    }
    return true;
  }

  private textoCampoSeguro(valor: unknown): string {
    if (valor == null) return '';
    return String(valor).trim();
  }

  /** OBAC para API: estricto en registro completo; en borrador/pendiente acepta sesión actual como respaldo. */
  private resolverParObac(relajado: boolean): { obac: string; obacRut: string } | null {
    const obac = this.resolverObacId();
    const obacRut = obac ? this.resolverObacRutDesdeId(obac) : null;
    if (obac && obacRut) return { obac, obacRut };

    if (!relajado) return null;

    const sesion = this.auth.usuarioActual;
    const rutSesion = sesion?.rut?.trim();
    if (!rutSesion) return null;

    const enLista = this.usuarios.find((u) => u.rut === rutSesion || u.id === rutSesion);
    return { obac: enLista?.id ?? sesion!.id, obacRut: enLista?.rut ?? rutSesion };
  }

  private validarCamposObligatoriosRegistro(): { mensaje: string; paso: PasoId } | null {
    const faltantes: { label: string; paso: PasoId }[] = [];
    if (!this.claveEmergencia.trim()) faltantes.push({ label: 'tipo de emergencia', paso: 'basicos' });
    if (!this.resolverObacId()) faltantes.push({ label: 'OBAC', paso: 'basicos' });
    if (!this.horaDelLlamado.trim()) faltantes.push({ label: 'hora del llamado', paso: 'basicos' });
    if (!this.direccion.trim()) faltantes.push({ label: 'dirección', paso: 'emergencia' });
    if (!this.descripcionEmergencia.trim()) faltantes.push({ label: 'descripción de la emergencia', paso: 'emergencia' });
    if (!this.trabajoRealizado.trim()) faltantes.push({ label: 'trabajo realizado', paso: 'trabajo' });
    if (faltantes.length === 0) return null;
    return {
      mensaje: `Completa: ${faltantes.map((f) => f.label).join(', ')}.`,
      paso: faltantes[0]!.paso,
    };
  }

  private detalleUnidadesInvalidas(): { mensaje: string; paso: PasoId } | null {
    if (this.unidades.some((u) => this.filaTieneBasuraSinCarro(u))) {
      return {
        mensaje: 'Hay datos de despacho sin unidad seleccionada. Elige el carro o limpia esos campos.',
        paso: 'basicos',
      };
    }
    const exige = claveEmergenciaExigeUnidadesEnDespacho(this.claveEmergencia);
    const filas = exige ? this.unidades.filter((u) => u.carroId !== '') : this.unidades.filter((u) => u.carroId !== '');
    if (exige && filas.length === 0) {
      return { mensaje: 'Este tipo de emergencia exige al menos una unidad en despacho completa.', paso: 'basicos' };
    }
    for (const [i, u] of filas.entries()) {
      if (!this.filaUnidadIncompleta(u)) continue;
      const partes: string[] = [];
      if (!this.textoCampoSeguro(u.conductor)) partes.push('conductor');
      if (!this.textoCampoSeguro(u.hora6_0)) partes.push('6-0');
      if (!this.textoCampoSeguro(u.hora6_3)) partes.push('6-3');
      if (!this.textoCampoSeguro(u.hora6_9)) partes.push('6-9');
      if (!this.textoCampoSeguro(u.hora6_10)) partes.push('6-10');
      if (!this.textoCampoSeguro(u.kmSalida)) partes.push('KM salida');
      if (!this.textoCampoSeguro(u.kmLlegada)) partes.push('KM llegada');
      return {
        mensaje: `Unidad ${i + 1}: falta ${partes.join(', ')}.`,
        paso: 'basicos',
      };
    }
    return null;
  }

  carrosDisponiblesParaUnidad(index: number): CarroDto[] {
    const usados = new Set<string>();
    for (let i = 0; i < this.unidades.length; i++) {
      if (i === index) continue;
      const id = this.unidades[i]?.carroId;
      if (id) usados.add(String(id));
    }
    const fecha = this.fechaBaseAsistencia();
    return this.carros.filter((c) => {
      if (usados.has(String(c.id))) return false;
      return this.carroDisponibleParaParte(c, fecha);
    });
  }

  agregarPaciente(): void { this.pacientes.push({ nombre: '', edad: '', rut: '', triage: 'VERDE' }); }
  quitarPaciente(index: number): void { this.pacientes.splice(index, 1); }
  agregarVehiculo(): void { this.vehiculos.push({ tipo: '', patente: '', marca: '', conductor: '', rut: '' }); }
  quitarVehiculo(index: number): void { this.vehiculos.splice(index, 1); }
  agregarApoyo(): void { this.apoyos.push({ tipo: 'SAMU', nombre: '', cargo: '', patente: '', conductor: '' }); }
  agregarOtraCompania(): void { this.otrasCompanias.push({ obac: '', compania: '', unidad: '' }); }
  quitarOtraCompania(index: number): void { this.otrasCompanias.splice(index, 1); }
  etiquetaObacSeleccion(u: UsuarioListaDto): string { return u.claveNomina?.trim() ? `${u.claveNomina.trim()} · ${nombreListaSoloPersona(u)}` : nombreListaSoloPersona(u); }
  private debePriorizarAlFinalParaObac(u: UsuarioListaDto): boolean { return (u.rol ?? '').trim().toUpperCase() === 'ADMIN'; }

  get usuariosElegiblesObac(): UsuarioListaDto[] {
    return this.usuarios
      .filter((u) => esUsuarioOperativo(u) && !this.esAspirante(u) && this.voluntarioDisponibleParaParte(u))
      .sort((a, b) => {
      const da = this.debePriorizarAlFinalParaObac(a) ? 1 : 0;
      const db = this.debePriorizarAlFinalParaObac(b) ? 1 : 0;
      return da !== db ? da - db : a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  private esAspirante(u: UsuarioListaDto): boolean { return (u.tipoVoluntario ?? '').trim().toUpperCase() === 'ASPIRANTE'; }
  get voluntariosConductores(): UsuarioListaDto[] {
    return this.usuarios
      .filter((u) => u.autorizadoConducir === true && this.voluntarioDisponibleParaParte(u))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  conductoresParaFila(indiceFila: number): UsuarioListaDto[] {
    const otros = new Set(this.unidades.map((fil, idx) => (idx === indiceFila ? '' : (fil.conductor ?? '').trim())).filter(Boolean));
    return this.voluntariosConductores.filter((v) => !otros.has(nombreListaSoloPersona(v)));
  }

  onConductorUnidadChange(indiceFila: number): void {
    const mio = (this.unidades[indiceFila]?.conductor ?? '').trim();
    if (!mio) return;
    this.unidades.forEach((u, j) => { if (j !== indiceFila && (u.conductor ?? '').trim() === mio) u.conductor = ''; });
  }

  onCarroUnidadChange(indiceFila: number): void {
    const fila = this.unidades[indiceFila];
    if (!fila?.carroId) return;
    const carro = this.carros.find((c) => String(c.id) === String(fila.carroId));
    if (!carro) return;
    const km = carro.ultimoKmDespacho ?? carro.kilometraje ?? 0;
    if (km > 0) {
      fila.kmSalida = String(Math.round(km));
    }
  }

  private sanearConductoresDuplicadosUnidades(): void {
    const visto = new Set<string>();
    this.unidades.forEach(fil => {
      const c = (fil.conductor ?? '').trim();
      if (c && visto.has(c)) fil.conductor = '';
      else if (c) visto.add(c);
    });
  }

  private hayConductorRepetidoEnUnidades(): boolean {
    const xs = this.unidades.map((u) => (u.conductor ?? '').trim()).filter(Boolean);
    return xs.length !== new Set(xs).size;
  }

  private filaUnidadIncompleta(u: FilaUnidad): boolean {
    return (
      !this.textoCampoSeguro(u.conductor) ||
      !this.textoCampoSeguro(u.hora6_0) ||
      !this.textoCampoSeguro(u.hora6_3) ||
      !this.textoCampoSeguro(u.hora6_9) ||
      !this.textoCampoSeguro(u.hora6_10) ||
      !this.textoCampoSeguro(u.kmSalida) ||
      !this.textoCampoSeguro(u.kmLlegada)
    );
  }

  private filaTieneBasuraSinCarro(u: FilaUnidad): boolean {
    if (u.carroId !== '') return false;
    return !!(
      this.textoCampoSeguro(u.conductor) ||
      this.textoCampoSeguro(u.hora6_0) ||
      this.textoCampoSeguro(u.hora6_3) ||
      this.textoCampoSeguro(u.hora6_9) ||
      this.textoCampoSeguro(u.hora6_10) ||
      this.textoCampoSeguro(u.kmSalida) ||
      this.textoCampoSeguro(u.kmLlegada)
    );
  }

  private unidadesFormularioInvalidasParaGuardar(): boolean {
    const exige = claveEmergenciaExigeUnidadesEnDespacho(this.claveEmergencia);
    if (this.unidades.some((u) => this.filaTieneBasuraSinCarro(u))) return true;
    if (exige) {
      const conCarro = this.unidades.filter((u) => u.carroId !== '');
      return conCarro.length === 0 || conCarro.some((u) => this.filaUnidadIncompleta(u));
    }
    return this.unidades.some((u) => u.carroId !== '' && this.filaUnidadIncompleta(u));
  }

  apoyoRequiereCargo(tipo: string): boolean { return tipo === 'OTRO'; }
  apoyoMuestraNombre(tipo: string): boolean { return tipo === 'CARABINEROS' || tipo === 'OTRO'; }
  apoyoMuestraConductor(tipo: string): boolean { return tipo === 'SAMU' || tipo === 'SEGURIDAD_CIUDADANA' || tipo === 'OTRO'; }
  quitarApoyo(index: number): void { this.apoyos.splice(index, 1); }
  private normalizarRut(valor: string): string { const clean = (valor || '').replace(/[^0-9kK]/g, '').toUpperCase(); if (clean.length <= 1) return clean; const cuerpo = clean.slice(0, -1); const withDots = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return `${withDots}-${clean.slice(-1)}`; }
  private normalizarPatente(valor: string): string { const clean = (valor || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); if (clean.length === 6) { if (/^[A-Z]{2}[0-9]{4}$/.test(clean)) return `${clean.slice(0, 2)}-${clean.slice(2)}`; if (/^[A-Z]{4}[0-9]{2}$/.test(clean)) return `${clean.slice(0, 4)}-${clean.slice(4)}`; } return clean; }
  onPacienteRutInput(index: number, value: string): void { this.pacientes[index]!.rut = this.normalizarRut(value); }
  onVehiculoRutInput(index: number, value: string): void { this.vehiculos[index]!.rut = this.normalizarRut(value); }
  onVehiculoPatenteInput(index: number, value: string): void { this.vehiculos[index]!.patente = this.normalizarPatente(value); }
  onApoyoPatenteInput(index: number, value: string): void { this.apoyos[index]!.patente = this.normalizarPatente(value); }
  triageClass(triage: string): string { const t = (triage || '').toUpperCase(); return t === 'ROJO' ? 'text-red-300' : t === 'AMARILLO' ? 'text-amber-300' : 'text-emerald-300'; }
  materialMarcado(item: string): boolean { const s = new Set(this.materialUtilizado.split(',').map(x => x.trim().toLowerCase()).filter(Boolean)); return s.has(item.toLowerCase()); }

  toggleMaterial(item: string): void {
    const vals = this.materialUtilizado.split(',').map(x => x.trim()).filter(Boolean);
    const idx = vals.findIndex(x => x.toLowerCase() === item.toLowerCase());
    idx >= 0 ? vals.splice(idx, 1) : vals.push(item);
    this.materialUtilizado = vals.join(', ');
  }

  private toDateInput(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  private toTimeInput(d: Date): string { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

  private buildFechaIso(): string | null {
    if (!this.fechaDia) return null;
    let t = '12:00';
    const raw = this.horaIncidente?.trim() || this.horaDelLlamado?.trim();
    if (raw) { const m = raw.match(/^(\d{1,2}):(\d{2})$/); if (m) t = `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`; }
    const d = new Date(`${this.fechaDia}T${t}:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  get asistenciaFiltroSinCoincidencias(): boolean {
    if (!this.filtroAsistencia.trim()) return false;
    return !this.asistenciaLayoutVista.some((col) =>
      col.secciones.some((sec) => this.itemsAsistenciaFiltrados(sec.items).length > 0),
    );
  }

  private compactAsistencia(): ParteAsistenciaMetadata | undefined {
    const out: ParteAsistenciaMetadata = {};
    const apc: any = {};
    ASISTENCIA_CONTEXTO_OPCIONES.forEach(({ key }) => {
      const comp: any = {};
      Object.entries((this.asistenciaPorContexto as any)[key] || {}).forEach(([k, v]) => { if (v) comp[k] = true; });
      if (Object.keys(comp).length > 0) apc[key] = comp;
    });
    if (Object.keys(apc).length > 0) out.asistenciaPorContexto = apc;
    
    const totalVol = this.totalVoluntariosAsistencia();
    if (totalVol > 0) out.asistenciaTotal = String(totalVol);
    
    const radSel: any = {};
    Object.entries(this.radiosSeleccion).forEach(([k, v]) => { if (v) radSel[k] = true; });
    if (Object.keys(radSel).length > 0) {
      out.radiosSeleccion = radSel;
      const det: any = {};
      Object.keys(radSel).forEach(id => det[id] = (this.radiosDetalle[id] ?? '').trim());
      out.radiosDetalle = det;
    }
    
    Object.keys(this.asistencia).forEach((k) => {
      const v = this.textoCampoSeguro((this.asistencia as Record<string, unknown>)[k]);
      if (v) (out as Record<string, string>)[k] = v;
    });
    if (this.textoCampoSeguro(this.firmaEncargadoDatos).startsWith('data:image')) {
      out.firmaEncargadoDatos = this.firmaEncargadoDatos;
    }
    const firmaObac = this.firmaObacEfectiva();
    if (firmaObac.startsWith('data:image')) out.firmaObac = firmaObac;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private construirMetadata(): ParteMetadataDto | undefined {
    const conductoresPorCarroId: Record<string, string> = {};
    this.unidades.forEach((u) => {
      const conductor = this.textoCampoSeguro(u.conductor);
      if (u.carroId !== '' && conductor) conductoresPorCarroId[String(u.carroId)] = conductor;
    });
    const unidadesHorarios: Record<string, Record<string, string>> = {};
    for (const u of this.unidades) {
      if (!u.carroId) continue;
      const horarios: Record<string, string> = {};
      const h60 = this.textoCampoSeguro(u.hora6_0);
      const h63 = this.textoCampoSeguro(u.hora6_3);
      const h69 = this.textoCampoSeguro(u.hora6_9);
      const h610 = this.textoCampoSeguro(u.hora6_10);
      if (h60) horarios['hora6_0'] = h60;
      if (h63) horarios['hora6_3'] = h63;
      if (h69) horarios['hora6_9'] = h69;
      if (h610) horarios['hora6_10'] = h610;
      if (Object.keys(horarios).length > 0) unidadesHorarios[String(u.carroId)] = horarios;
    }
    return {
      claveEmergencia: this.claveEmergencia.trim() || undefined,
      descripcionEmergencia: this.descripcionEmergencia.trim() || undefined,
      trabajoRealizado: this.trabajoRealizado.trim() || undefined,
      horaDelLlamado: this.horaDelLlamado.trim() || undefined,
      materialUtilizado: this.materialUtilizado.trim() || undefined,
      asistencia: this.compactAsistencia(),
      observaciones: this.observaciones.trim() || undefined,
      conductoresPorCarroId: Object.keys(conductoresPorCarroId).length > 0 ? conductoresPorCarroId : undefined,
      unidadesHorarios: Object.keys(unidadesHorarios).length > 0 ? unidadesHorarios : undefined,
    };
  }

  private parseUnidadesPayload(): any[] {
    const normHora = (valor: unknown): string => {
      const t = this.textoCampoSeguro(valor);
      if (!t) return '00:00';
      const m = t.match(/^(\d{1,2}):(\d{2})$/);
      return m ? `${String(Number(m[1])).padStart(2, '0')}:${m[2]}` : t;
    };
    return this.unidades
      .map((u) => ({
        carroId: String(u.carroId),
        horaSalida: normHora(u.hora6_0),
        horaLlegada: normHora(u.hora6_10),
        hora6_0: normHora(u.hora6_0),
        hora6_3: normHora(u.hora6_3),
        hora6_9: normHora(u.hora6_9),
        hora6_10: normHora(u.hora6_10),
        kmSalida: Number.parseInt(this.textoCampoSeguro(u.kmSalida), 10) || 0,
        kmLlegada: Number.parseInt(this.textoCampoSeguro(u.kmLlegada), 10) || 0,
      }))
      .filter((u) => u.carroId && this.carros.some((c) => String(c.id) === u.carroId));
  }

  private parseAsistenciasPayload(): Array<{ usuarioRut: string }> {
    const ruts = new Set<string>();
    for (const key of Object.keys(this.asistenciaPorContexto) as AsistenciaContextoKey[]) {
      for (const [id, v] of Object.entries(this.asistenciaPorContexto[key] || {})) {
        if (!v || !id.startsWith('usr-')) continue;
        const u = this.usuarioAsistenciaPorId[id];
        const rut = u?.rut?.trim() || id.slice(4).trim();
        if (rut) ruts.add(rut);
      }
    }
    return [...ruts].map((usuarioRut) => ({ usuarioRut }));
  }

  private parsePacientesPayload(): any[] {
    return this.pacientes
      .filter((p) => this.textoCampoSeguro(p.nombre).length > 0)
      .map((p) => {
        const edadTxt = this.textoCampoSeguro(p.edad);
        const edadNum = edadTxt ? Number.parseInt(edadTxt, 10) : Number.NaN;
        return {
          nombre: this.textoCampoSeguro(p.nombre),
          triage: p.triage,
          edad: Number.isFinite(edadNum) ? edadNum : undefined,
          rut: this.textoCampoSeguro(p.rut) || undefined,
        };
      });
  }

  private filtrarVehiculosPayload() {
    return this.vehiculos.filter(
      (v) => this.textoCampoSeguro(v.tipo) || this.textoCampoSeguro(v.patente),
    );
  }

  private filtrarApoyosPayload() {
    return this.apoyos.filter(
      (a) => this.textoCampoSeguro(a.tipo) || this.textoCampoSeguro(a.nombre),
    );
  }

  private filtrarOtrasCompaniasPayload() {
    return this.otrasCompanias.filter(
      (o) => this.textoCampoSeguro(o.compania) || this.textoCampoSeguro(o.unidad),
    );
  }

  private normalizarTriagePaciente(triage: unknown): string {
    if (typeof triage === 'string' && triage.trim()) return triage.trim().toUpperCase();
    if (triage && typeof triage === 'object') {
      const t = triage as { codigo?: string; nombre?: string };
      return String(t.codigo || t.nombre || 'VERDE').trim().toUpperCase();
    }
    return 'VERDE';
  }

  private firmaObacEfectiva(): string {
    if (this.firmaObac.trim().startsWith('data:image')) {
      return this.firmaObac.trim();
    }
    const obacRut = this.resolverObacId();
    const u = this.usuariosElegiblesObac.find((x) => x.id === obacRut);
    return u?.firmaImagen?.trim() ?? '';
  }

  private faltantesCierreParte(): string[] {
    const faltantes: string[] = [];
    if (!(this.asistencia.encargadoDatos ?? '').trim()) {
      faltantes.push('Encargado de tomar datos (nombre o clave)');
    }
    if (!(this.asistencia.oficial128 ?? '').trim()) {
      faltantes.push('Oficial 12-8 (quien estuvo)');
    }
    if (!this.firmaEncargadoDatos.trim().startsWith('data:image')) {
      faltantes.push('Firma del encargado de datos');
    }
    if (!this.firmaObacEfectiva().startsWith('data:image')) {
      faltantes.push('Firma del OBAC (dibujada o en el perfil del responsable)');
    }
    return faltantes;
  }

  private construirMotivoPendiente(): string {
    const manual = this.motivoPendienteManual.trim();
    const partesAuto: string[] = [];
    const basicos = this.validarCamposObligatoriosRegistro();
    if (basicos) partesAuto.push(basicos.mensaje);
    const faltantes = this.faltantesCierreParte();
    if (faltantes.length > 0) {
      partesAuto.push(`Faltan datos de cierre: ${faltantes.join('; ')}.`);
    }
    const auto = partesAuto.join(' ').trim();
    if (manual && auto) return `${manual} — ${auto}`;
    if (manual) return manual;
    return auto || 'Parte guardado sin cierre completo.';
  }

  private resolverObacId(): string | null {
    const raw = this.obacId == null || this.obacId === '' ? '' : String(this.obacId).trim();
    if (raw) {
      const elegible = this.usuariosElegiblesObac.find((u) => u.id === raw || u.rut === raw);
      if (elegible) return elegible.id;

      const historico = this.usuarios.find((u) => (u.id === raw || u.rut === raw) && u.activo && !this.esAspirante(u));
      if (historico) return historico.id;

      const porReferencia = this.buscarUsuarioObacPorReferencia(raw);
      if (porReferencia) return porReferencia.id;

      if (this.editandoParteId && raw.length >= 7) return raw;
      return null;
    }

    const textoCierre = (this.asistencia.nombreObac ?? '').trim();
    const inferido = this.buscarUsuarioObacPorReferencia(textoCierre);
    if (inferido) {
      this.obacId = inferido.id;
      return inferido.id;
    }
    return null;
  }

  private buscarUsuarioObacPorReferencia(ref: string): UsuarioListaDto | null {
    const raw = ref.trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    const candidatos = this.usuarios.filter((u) => u.activo && !this.esAspirante(u));
    return (
      candidatos.find((u) => u.id === raw || u.rut === raw) ??
      candidatos.find((u) => (u.claveNomina ?? '').trim().toLowerCase() === lower) ??
      candidatos.find((u) => nombreListaSoloPersona(u).toLowerCase() === lower) ??
      candidatos.find((u) => (u.claveNomina ?? '').trim().toLowerCase().startsWith(lower)) ??
      candidatos.find((u) => nombreListaSoloPersona(u).toLowerCase().includes(lower)) ??
      null
    );
  }

  /** RUT del OBAC para el API (id en lista ya es el RUT). */
  private resolverObacRut(): string | null {
    const id = this.resolverObacId();
    return id ? this.resolverObacRutDesdeId(id) : null;
  }

  private resolverObacRutDesdeId(id: string): string | null {
    const u = this.usuarios.find((x) => x.id === id || x.rut === id);
    return u?.rut ?? id;
  }

  private extraerHoraDeRegistro(valor: unknown): string {
    if (!valor) return '';
    if (typeof valor === 'string') {
      const t = valor.trim();
      if (/^\d{1,2}:\d{2}$/.test(t)) return t;
      const m = t.match(/T(\d{2}):(\d{2})/);
      if (m) return `${m[1]}:${m[2]}`;
    }
    const d = new Date(valor as string | Date);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ============================================================================
  // INTERCEPCIÓN RELACIONAL: Mapeo estricto del JSON Metadata a Tablas Relacionales
  // ============================================================================
  private claveParteLocal(): string {
    return String(this.editandoParteId ?? 'nuevo');
  }

  /** Snapshot local del formulario (autosave / sin conexión). */
  private payloadAutosaveLocal(): unknown | null {
    if (this.loading) return null;
    try {
      this.prepararCierreAntesDeGuardar();
      const parObac = this.resolverParObac(true);
      return {
        claveEmergencia: this.claveEmergencia.trim() || CLAVE_BORRADOR_DEFAULT,
        direccion: this.direccion.trim() || '',
        obacId: parObac?.obac ?? null,
        obacRut: parObac?.obacRut ?? null,
        fecha: this.buildFechaIso() ?? new Date().toISOString(),
        estado: 'BORRADOR',
        unidades: this.parseUnidadesPayload(),
        pacientes: this.parsePacientesPayload(),
        asistencias: this.parseAsistenciasPayload(),
        descripcionEmergencia: this.descripcionEmergencia.trim() || null,
        trabajoRealizado: this.trabajoRealizado.trim() || null,
        materialUtilizado: this.materialUtilizado.trim() || null,
        observaciones: this.observaciones.trim() || null,
        vehiculosAfectados: this.filtrarVehiculosPayload(),
        apoyosExternos: this.filtrarApoyosPayload(),
        otrasCompanias: this.filtrarOtrasCompaniasPayload(),
        metadata: { ...this.construirMetadata(), _pasoIdx: this.pasoIdx },
      };
    } catch {
      return null;
    }
  }

  private async ofrecerRestaurarBorradorLocal(): Promise<void> {
    const saved = this.borradorLocal.obtener('parte', this.claveParteLocal());
    if (!saved?.payload) return;
    const ok = await this.confirmDialog.abrir({
      title: 'Borrador sin conexión',
      message: `Hay un borrador de parte guardado en este dispositivo (${formatearFechaBorradorLocal(saved.meta.guardadoEn)}). ¿Restaurarlo?`,
      confirmText: 'Restaurar',
      cancelText: 'Descartar',
    });
    if (!ok) {
      this.borradorLocal.eliminar('parte', this.claveParteLocal());
      return;
    }
    this.cargarParteEnFormulario(saved.payload);
    const meta = (saved.payload as { metadata?: { _pasoIdx?: number } })?.metadata;
    if (typeof meta?._pasoIdx === 'number' && meta._pasoIdx >= 0 && meta._pasoIdx < this.pasosVisibles.length) {
      this.pasoIdx = meta._pasoIdx;
    }
    this.toast.exito('Borrador local restaurado. Recuerda sincronizarlo con el servidor.');
  }

  private ejecutarGuardadoParte(
    request$: Observable<ParteEmergenciaDTO>,
    handlers: {
      onOk: (registro: ParteEmergenciaDTO) => void;
      onError: (err: unknown) => void;
    },
  ): void {
    request$
      .pipe(
        timeout(45_000),
        catchError((err) => {
          if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'TimeoutError') {
            return throwError(() => ({
              status: 0,
              error: { message: 'El servidor no respondió a tiempo. Verifica que el backend esté activo en el puerto 3000.' },
            }));
          }
          return throwError(() => err);
        }),
        finalize(() => {
          this.submitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: handlers.onOk,
        error: handlers.onError,
      });
  }

  guardarBorrador(): void {
    if (!this.puedeIniciarGuardado()) return;
    try {
      this.guardadoError = null;
      this.prepararCierreAntesDeGuardar();
      const parObac = this.resolverParObac(true);
      if (!parObac) {
        this.mostrarErrorGuardado(
          'Selecciona OBAC en datos básicos, escribe una clave/nombre válido en el cierre, o verifica tu sesión.',
          'basicos',
        );
        return;
      }
      const { obac, obacRut } = parObac;
      if (this.hayConductorRepetidoEnUnidades()) {
        this.mostrarErrorGuardado('Un conductor no puede estar en más de una unidad.', 'basicos');
        return;
      }
      const payload = {
        claveEmergencia: this.claveEmergencia.trim() || CLAVE_BORRADOR_DEFAULT,
        direccion: this.direccion.trim() || '— Borrador (sin dirección)',
        obacId: obac,
        obacRut,
        fecha: this.buildFechaIso() ?? new Date().toISOString(),
        estado: 'BORRADOR',
        unidades: this.parseUnidadesPayload(),
        pacientes: this.parsePacientesPayload(),
        asistencias: this.parseAsistenciasPayload(),
        descripcionEmergencia: this.descripcionEmergencia.trim() || null,
        trabajoRealizado: this.trabajoRealizado.trim() || null,
        materialUtilizado: this.materialUtilizado.trim() || null,
        observaciones: this.observaciones.trim() || null,

        vehiculosAfectados: this.filtrarVehiculosPayload(),
        apoyosExternos: this.filtrarApoyosPayload(),
        otrasCompanias: this.filtrarOtrasCompaniasPayload(),

        metadata: this.construirMetadata(),
      } as any;

      const request$ = this.editandoParteId != null
        ? this.partesApi.actualizar(String(this.editandoParteId), payload)
        : this.partesApi.crear(payload);

      this.submitting = true;
      this.cdr.markForCheck();
      this.ejecutarGuardadoParte(request$, {
        onOk: (registro) => {
          this.borradorLocal.eliminar('parte', this.claveParteLocal());
          const eraNuevo = this.editandoParteId == null;
          if (registro?.id) {
            this.editandoParteId = registro.id;
          }
          this.controlEdicion.marcarLimpio();
          this.toast.exito(eraNuevo ? 'Borrador guardado.' : 'Borrador actualizado.');
          void this.router.navigate(['/partes']);
        },
        onError: (err) => {
          if (
            manejarErrorGuardadoConBorradorLocal(
              this.borradorLocal,
              this.toast,
              'parte',
              this.claveParteLocal(),
              payload,
              err,
              {
                mensajeError: 'No se pudo guardar el borrador en el servidor.',
                syncRequest: {
                  kind: this.editandoParteId != null ? 'parte-actualizar' : 'parte-crear',
                  parteId: this.editandoParteId,
                  body: payload as Record<string, unknown>,
                },
                onGuardadoLocal: () => {
                  this.guardadoError = null;
                  this.controlEdicion.marcarLimpio();
                },
              },
            )
          ) {
            this.guardadoError = null;
          } else {
            this.mostrarErrorGuardado(mensajeApiError(err, 'No se pudo guardar el borrador en el servidor.'));
          }
        },
      });
    } catch (err) {
      this.submitting = false;
      console.error('guardarBorrador', err);
      this.mostrarErrorGuardado(
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Error inesperado al preparar el borrador. Revisa los datos e intenta de nuevo.',
      );
    }
  }

  guardarPendiente(): void {
    if (!this.puedeIniciarGuardado()) return;
    try {
      this.guardadoError = null;
      this.prepararCierreAntesDeGuardar();
      const parObac = this.resolverParObac(true);
      if (!parObac) {
        this.mostrarErrorGuardado(
          'Selecciona OBAC en datos básicos, escribe una clave/nombre válido en el cierre, o verifica tu sesión.',
          'basicos',
        );
        return;
      }
      const { obac, obacRut } = parObac;
      if (this.hayConductorRepetidoEnUnidades()) {
        this.mostrarErrorGuardado('Un conductor no puede estar en más de una unidad.', 'basicos');
        return;
      }

      const motivoPendiente = this.construirMotivoPendiente();
      const payload = {
        claveEmergencia: this.claveEmergencia.trim() || CLAVE_BORRADOR_DEFAULT,
        direccion: this.direccion.trim() || '— Pendiente (sin dirección)',
        obacId: obac,
        obacRut,
        fecha: this.buildFechaIso() ?? new Date().toISOString(),
        estado: 'PENDIENTE',
        motivoPendiente,
        unidades: this.parseUnidadesPayload(),
        pacientes: this.parsePacientesPayload(),
        asistencias: this.parseAsistenciasPayload(),
        descripcionEmergencia: this.descripcionEmergencia.trim() || null,
        trabajoRealizado: this.trabajoRealizado.trim() || null,
        materialUtilizado: this.materialUtilizado.trim() || null,
        observaciones: this.observaciones.trim() || null,
        vehiculosAfectados: this.filtrarVehiculosPayload(),
        apoyosExternos: this.filtrarApoyosPayload(),
        otrasCompanias: this.filtrarOtrasCompaniasPayload(),
        metadata: { ...(this.construirMetadata() ?? {}), motivoPendiente },
      } as any;

      const request$ = this.editandoParteId != null
        ? this.partesApi.actualizar(String(this.editandoParteId), payload)
        : this.partesApi.crear(payload);

      this.submitting = true;
      this.cdr.markForCheck();
      this.ejecutarGuardadoParte(request$, {
        onOk: (registro) => {
          this.borradorLocal.eliminar('parte', this.claveParteLocal());
          const eraNuevo = this.editandoParteId == null;
          if (registro?.id) {
            this.editandoParteId = registro.id;
          }
          this.controlEdicion.marcarLimpio();
          this.toast.exito(eraNuevo ? 'Parte guardado como pendiente.' : 'Parte actualizado como pendiente.');
          void this.router.navigate(['/partes']);
        },
        onError: (err) => {
          if (
            manejarErrorGuardadoConBorradorLocal(
              this.borradorLocal,
              this.toast,
              'parte',
              this.claveParteLocal(),
              payload,
              err,
              {
                mensajeError: 'No se pudo guardar el parte pendiente en el servidor.',
                syncRequest: {
                  kind: this.editandoParteId != null ? 'parte-actualizar' : 'parte-crear',
                  parteId: this.editandoParteId,
                  body: payload as Record<string, unknown>,
                },
                onGuardadoLocal: () => {
                  this.guardadoError = null;
                  this.controlEdicion.marcarLimpio();
                },
              },
            )
          ) {
            this.guardadoError = null;
          } else {
            this.mostrarErrorGuardado(mensajeApiError(err, 'No se pudo guardar el parte pendiente.'));
          }
        },
      });
    } catch (err) {
      this.submitting = false;
      console.error('guardarPendiente', err);
      this.mostrarErrorGuardado(
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Error inesperado al preparar el parte pendiente. Revisa los datos e intenta de nuevo.',
      );
    }
  }

  guardarParte(): void {
    if (!this.puedeIniciarGuardado()) return;
    try {
      this.guardadoError = null;
      this.prepararCierreAntesDeGuardar();
      const camposObligatorios = this.validarCamposObligatoriosRegistro();
      if (camposObligatorios) {
        this.mostrarErrorGuardado(camposObligatorios.mensaje, camposObligatorios.paso);
        return;
      }
      const parObac = this.resolverParObac(false);
      if (!parObac) {
        this.mostrarErrorGuardado('Selecciona OBAC en datos básicos.', 'basicos');
        return;
      }
      const { obac, obacRut } = parObac;
      if (this.hayConductorRepetidoEnUnidades()) {
        this.mostrarErrorGuardado('Un conductor no puede estar en más de una unidad.', 'basicos');
        return;
      }
      const disponibilidad = this.validarDisponibilidadOperativaAntesDeGuardar();
      if (disponibilidad) {
        this.mostrarErrorGuardado(disponibilidad, 'emergencia');
        return;
      }
      const faltantesCierre = this.faltantesCierreParte();
      if (faltantesCierre.length > 0) {
        this.mostrarErrorGuardado(`Faltan datos de cierre: ${faltantesCierre.join('; ')}.`, 'asistencia');
        return;
      }
      const fechaIso = this.buildFechaIso();
      if (!fechaIso) {
        this.mostrarErrorGuardado('Indica la fecha del parte en datos básicos.', 'basicos');
        return;
      }
      const unidadesInvalidas = this.detalleUnidadesInvalidas();
      if (unidadesInvalidas) {
        this.mostrarErrorGuardado(unidadesInvalidas.mensaje, unidadesInvalidas.paso);
        return;
      }
      if (this.unidadesFormularioInvalidasParaGuardar()) {
        this.mostrarErrorGuardado(
          this.exigeUnidadesDespacho
            ? 'Revisa las unidades en despacho: carro, conductor, horas 6-0 a 6-10 y kilómetros.'
            : 'Revisa los tiempos y datos de las unidades en despacho.',
          'basicos',
        );
        return;
      }

      const payload = {
        claveEmergencia: this.claveEmergencia.trim(),
        direccion: this.direccion.trim(),
        obacId: obac,
        obacRut,
        fecha: fechaIso,
        estado: 'COMPLETADO',
        motivoPendiente: null,
        unidades: this.parseUnidadesPayload(),
        pacientes: this.parsePacientesPayload(),
        asistencias: this.parseAsistenciasPayload(),
        descripcionEmergencia: this.descripcionEmergencia.trim(),
        trabajoRealizado: this.trabajoRealizado.trim(),
        materialUtilizado: this.materialUtilizado.trim() || null,
        observaciones: this.observaciones.trim() || null,

        vehiculosAfectados: this.filtrarVehiculosPayload(),
        apoyosExternos: this.filtrarApoyosPayload(),
        otrasCompanias: this.filtrarOtrasCompaniasPayload(),

        metadata: this.construirMetadata(),
      } as any;

      const request$ = this.editandoParteId != null
        ? this.partesApi.actualizar(String(this.editandoParteId), payload)
        : this.partesApi.crear(payload);

      this.submitting = true;
      this.cdr.markForCheck();
      this.ejecutarGuardadoParte(request$, {
        onOk: (registro) => {
          this.borradorLocal.eliminar('parte', this.claveParteLocal());
          if (registro?.id) {
            this.editandoParteId = registro.id;
          }
          this.controlEdicion.marcarLimpio();
          this.toast.exito(this.esEdicion ? 'Parte actualizado correctamente.' : 'Parte registrado correctamente.');
          void this.router.navigate(['/partes']);
        },
        onError: (err) => {
          if (
            manejarErrorGuardadoConBorradorLocal(
              this.borradorLocal,
              this.toast,
              'parte',
              this.claveParteLocal(),
              payload,
              err,
              {
                mensajeError: 'No se pudo registrar el parte. Revisa los datos e intenta de nuevo.',
                syncRequest: {
                  kind: this.editandoParteId != null ? 'parte-actualizar' : 'parte-crear',
                  parteId: this.editandoParteId,
                  body: payload as Record<string, unknown>,
                },
                onGuardadoLocal: () => {
                  this.guardadoError = null;
                  this.controlEdicion.marcarLimpio();
                },
              },
            )
          ) {
            this.guardadoError = null;
          } else {
            this.mostrarErrorGuardado(
              mensajeApiError(err, 'No se pudo registrar el parte. Revisa los datos e intenta de nuevo.'),
            );
          }
        },
      });
    } catch (err) {
      this.submitting = false;
      console.error('guardarParte', err);
      this.mostrarErrorGuardado(
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Error inesperado al preparar el registro. Revisa los datos e intenta de nuevo.',
      );
    }
  }

  // --- MÉTODOS DE RENDERIZADO Y CONTROL DE ARREGLOS RESTAURADOS ---

  private cargarParteEnFormulario(parte: any): void {
    const meta = parte.metadata ?? {};
    this.claveEmergencia =
      parte.claveEmergencia ??
      parte.codigoEmergencia ??
      parte.clave?.codigo ??
      meta.claveEmergencia ??
      '';
    if (!this.claveEmergencia.trim() && parte.claveId != null) {
      const porId = this.catalogoEmergencias
        .nuevosParte()
        .find((c) => String(c.value).trim() === String(parte.claveId));
      if (porId) this.claveEmergencia = porId.value;
    }
    this.direccion = parte.direccion ?? '';
    this.estado = parte.estado ?? 'PENDIENTE';
    if (parte.fecha) {
      const fp = new Date(parte.fecha);
      this.fechaDia = this.toDateInput(fp);
      this.horaIncidente = this.toTimeInput(fp);
    }
    const obacRut = parte.obacRut ?? parte.obacId ?? parte.obac?.rut ?? null;
    if (obacRut) {
      if (!this.usuarios.some((u) => u.id === obacRut || u.rut === obacRut) && parte.obac) {
        const nombreObac =
          parte.obac.nombre ??
          `${parte.obac.nombres ?? ''} ${parte.obac.apellidoPaterno ?? ''}`.trim();
        this.usuarios = [
          ...this.usuarios,
          {
            id: obacRut,
            rut: obacRut,
            nombre: nombreObac,
            nombres: parte.obac.nombres ?? nombreObac,
            apellidoPaterno: parte.obac.apellidoPaterno ?? '',
            activo: true,
            rol: 'VOLUNTARIOS',
          } as UsuarioListaDto,
        ];
      }
      const match =
        this.usuariosElegiblesObac.find((u) => u.id === obacRut || u.rut === obacRut) ??
        this.usuarios.find((u) => u.id === obacRut || u.rut === obacRut);
      this.obacId = match?.id ?? obacRut;
      this.aplicarObacEnAsistenciaYCierre();
    } else {
      this.obacId = null;
    }

    // Soporte bidireccional (Lee desde tablas relacionales o desde metadata legado)
    this.descripcionEmergencia = parte.descripcionEmergencia ?? meta.descripcionEmergencia ?? '';
    this.trabajoRealizado = parte.trabajoRealizado ?? meta.trabajoRealizado ?? '';
    this.materialUtilizado = parte.materialUtilizado ?? meta.materialUtilizado ?? '';
    this.observaciones = parte.observaciones ?? meta.observaciones ?? '';
    const motivoGuardado =
      (typeof parte.motivoPendiente === 'string' ? parte.motivoPendiente : null) ??
      (typeof meta.motivoPendiente === 'string' ? meta.motivoPendiente : null);
    this.motivoPendienteManual = motivoGuardado?.trim() ?? '';
    this.horaDelLlamado = meta.horaDelLlamado ?? this.horaDelLlamado;
    if (!this.horaDelLlamado?.trim() && parte.fecha) {
      this.horaDelLlamado = this.toTimeInput(new Date(parte.fecha));
    }

    const asis = meta.asistencia ?? {};
    this.asistencia = {
      comandoIncidenteCi: asis.comandoIncidenteCi ?? '',
      comandoIncidenteJs: asis.comandoIncidenteJs ?? '',
      comandoIncidenteJo: asis.comandoIncidenteJo ?? '',
      otraCompaniaNombre: asis.otraCompaniaNombre ?? '',
      otraCompaniaNombreCompania: asis.otraCompaniaNombreCompania ?? '',
      otraCompaniaUnidad: asis.otraCompaniaUnidad ?? '',
      oficial128: asis.oficial128 ?? '',
      encargadoDatos: asis.encargadoDatos ?? '',
      nombreObac: asis.nombreObac ?? parte.obac?.nombre ?? '',
    };

    if (asis.radiosSeleccion && typeof asis.radiosSeleccion === 'object') {
      Object.entries(asis.radiosSeleccion as Record<string, boolean>).forEach(([k, v]) => {
        if (v) this.radiosSeleccion[k] = true;
      });
    }
    if (asis.radiosDetalle && typeof asis.radiosDetalle === 'object') {
      Object.assign(this.radiosDetalle, asis.radiosDetalle);
    }

    this.firmaEncargadoDatos = asis.firmaEncargadoDatos ?? '';
    this.firmaObac = asis.firmaObac ?? '';
    const baseCtx: Record<AsistenciaContextoKey, Record<string, boolean>> = {
      emergencia: {},
      curso: {},
      cuartel: {},
      comision: {},
      comandancia: {},
    };
    if (asis.asistenciaPorContexto && typeof asis.asistenciaPorContexto === 'object') {
      for (const key of Object.keys(baseCtx) as AsistenciaContextoKey[]) {
        const src = (asis.asistenciaPorContexto as Record<string, Record<string, boolean>>)[key];
        if (src) baseCtx[key] = { ...src };
      }
    }
    this.asistenciaPorContexto = baseCtx;

    const horariosMeta = meta.unidadesHorarios as Record<string, Record<string, string>> | undefined;
    const conductoresMeta = meta.conductoresPorCarroId as Record<string, string> | undefined;
    const origUnidades = parte.unidades ?? parte.carrosAsistentes ?? [];
    this.unidades = origUnidades.map((u: any) => {
      const carroKey = String(u.carroId ?? u.carro?.id ?? '');
      const h = horariosMeta?.[carroKey] ?? {};
      const conductorRaw =
        conductoresMeta?.[carroKey] ??
        (u.conductor?.nombres
          ? `${u.conductor.nombres} ${u.conductor.apellidoPaterno ?? ''} ${u.conductor.apellidoMaterno ?? ''}`.trim()
          : '') ??
        '';
      return {
        carroId: carroKey,
        conductor: this.resolverNombreConductorParaSelect(conductorRaw),
        hora6_0: h['hora6_0'] ?? u.hora6_0 ?? this.extraerHoraDeRegistro(u.horaSalida),
        hora6_3: h['hora6_3'] ?? u.hora6_3 ?? this.extraerHoraDeRegistro(u.hora6_3 ?? u.horaSalida),
        hora6_9: h['hora6_9'] ?? u.hora6_9 ?? this.extraerHoraDeRegistro(u.hora6_9),
        hora6_10: h['hora6_10'] ?? u.hora6_10 ?? this.extraerHoraDeRegistro(u.horaLlegada),
        kmSalida: String(u.kmSalida ?? ''),
        kmLlegada: String(u.kmLlegada ?? ''),
      };
    });
    if (this.unidades.length === 0) this.agregarUnidad();
    this.sanearConductoresDuplicadosUnidades();

    this.pacientes = (parte.pacientes || []).map((p: any, idx: number) => {
      const metaPacientes = Array.isArray(meta.pacientes) ? meta.pacientes : [];
      const metaPac =
        metaPacientes[idx] ?? metaPacientes.find((m: any) => String(m?.nombre ?? '') === String(p?.nombre ?? ''));
      const edadRaw = p.edad ?? metaPac?.edad;
      return {
        nombre: p.nombre ?? '',
        edad: edadRaw != null && edadRaw !== '' ? String(edadRaw) : '',
        rut: p.rut ?? p.rutPaciente ?? metaPac?.rut ?? '',
        triage: this.normalizarTriagePaciente(p.triage ?? metaPac?.triage),
      };
    });

    const vehiculosMeta = Array.isArray(meta.vehiculos) ? meta.vehiculos : [];
    const vehiculosRel = Array.isArray(parte.vehiculosAfectados) ? parte.vehiculosAfectados : [];
    const vehiculosFuente = vehiculosMeta.length > 0 ? vehiculosMeta : vehiculosRel;
    this.vehiculos = vehiculosFuente.map((v: any, idx: number) => {
      const rel = vehiculosRel[idx];
      return {
        tipo: v.tipo ?? '',
        patente: v.patente ?? rel?.patente ?? '',
        marca: v.marca ?? rel?.marca ?? '',
        conductor: v.conductor ?? rel?.conductor ?? '',
        rut: v.rut ?? v.rutConductor ?? rel?.rutConductor ?? rel?.rut ?? '',
      };
    });

    this.apoyos = (parte.apoyosExternos || meta.apoyoExterno || []).map((a: any) => ({
      tipo: a.tipo ?? 'SAMU', nombre: a.nombre ?? '', cargo: a.cargo ?? '', patente: a.patente ?? '', conductor: a.conductor ?? ''
    }));

    this.otrasCompanias = (parte.otrasCompanias || meta.otrasCompanias || asis.otrasCompanias || []).map((o: any) => ({
      obac: o.obac ?? '', compania: o.compania ?? '', unidad: o.unidad ?? ''
    }));

    if (!(this.asistencia.encargadoDatos ?? '').trim() && (this.asistencia.nombreObac ?? '').trim()) {
      this.asistencia.encargadoDatos = this.asistencia.nombreObac;
    }
    if (!(this.asistencia.oficial128 ?? '').trim() && (this.asistencia.nombreObac ?? '').trim()) {
      this.asistencia.oficial128 = this.asistencia.nombreObac;
    }
    if (this.obacId) {
      this.aplicarObacEnAsistenciaYCierre();
    }
  }

  private resolverNombreConductorParaSelect(nombreGuardado: string): string {
    const n = (nombreGuardado ?? '').trim();
    if (!n) return '';
    const exacto = this.voluntariosConductores.find((v) => nombreListaSoloPersona(v) === n);
    if (exacto) return nombreListaSoloPersona(exacto);
    const porNombreCompleto = this.voluntariosConductores.find((v) => (v.nombre ?? '').trim() === n);
    if (porNombreCompleto) return nombreListaSoloPersona(porNombreCompleto);
    const parcial = this.voluntariosConductores.find((v) => {
      const lista = nombreListaSoloPersona(v).toLowerCase();
      const full = (v.nombre ?? '').toLowerCase();
      const buscado = n.toLowerCase();
      return lista === buscado || full === buscado || full.startsWith(buscado) || buscado.startsWith(lista);
    });
    return parcial ? nombreListaSoloPersona(parcial) : n;
  }

  // --- MÉTODOS DE RENDERIZADO Y CONTROL DE ARREGLOS RESTAURADOS ---
}