import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import type { CarroDto } from '../../models/carro.dto';
import type {
  AsistenciaContextoKey,
  ParteEmergenciaDto,
  ParteAsistenciaMetadata,
  ParteMetadataDto,
} from '../../models/parte.dto';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import type { CrearPartePayload } from '../../services/partes.service';
import { CarrosService } from '../../services/carros.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { LicenciasService } from '../../services/licencias.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { CLAVES_COMPANIA_SERVICIOS, CLAVES_OPERATIVAS, CLAVE_BORRADOR_DEFAULT } from './partes.constants';
import {
  ASISTENCIA_CONTEXTO_OPCIONES,
  ASISTENCIA_LAYOUT,
  RADIOS_PARTE_OPCIONES,
  type AsistenciaColumnaDef,
  type AsistenciaItemDef,
} from './asistencia-roster.constants';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

type FilaUnidad = {
  carroId: number | '';
  conductor: string;
  hora6_0: string;
  hora6_3: string;
  hora6_9: string;
  hora6_10: string;
  kmSalida: string;
  kmLlegada: string;
};

type PacienteFila = { nombre: string; edad: string; rut: string; triage: string };

type VehiculoFila = { tipo: string; patente: string; marca: string; conductor: string; rut: string };

type ApoyoFila = { tipo: string; nombre: string; cargo: string; patente: string; conductor: string };
type OtraCompaniaFila = { obac: string; compania: string; unidad: string };

type PasoId = 'basicos' | 'emergencia' | 'trabajo' | 'asistencia' | 'apoyo' | 'obs';

@Component({
  selector: 'app-parte-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent],
  templateUrl: './parte-nuevo.component.html',
})
export class ParteNuevoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly carrosApi = inject(CarrosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly partesApi = inject(PartesService);
  private readonly licenciasApi = inject(LicenciasService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly clavesOperativas = CLAVES_OPERATIVAS;
  readonly clavesCompania = CLAVES_COMPANIA_SERVICIOS;
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
  private readonly licenciasActivasPorUsuario: Record<number, { desde: Date; hasta: Date }> = {};

  /** Pestaña activa del padrón (motivo de asistencia). */
  contextoAsistenciaActivo: AsistenciaContextoKey = 'emergencia';

  carros: CarroDto[] = [];
  usuarios: UsuarioListaDto[] = [];
  loading = true;
  error: string | null = null;
  submitting = false;
  guardadoError: string | null = null;

  /** Un paso a la vez: reduce saturación en campo. */
  pasoIdx = 0;

  claveEmergencia = '';
  direccion = '';
  /** Fecha del hecho (solo día). */
  fechaDia = '';
  /** Hora aproximada del parte / incidente. */
  horaIncidente = '';
  obacId: number | '' = '';
  obacInput = '';
  estado = 'PENDIENTE';

  descripcionEmergencia = '';
  trabajoRealizado = '';
  materialUtilizado = '';
  /** Hora de reloj del llamado (HH:mm). */
  horaDelLlamado = '';
  observaciones = '';

  /** Casillas por motivo (emergencia, curso, …). */
  asistenciaPorContexto: Record<AsistenciaContextoKey, Record<string, boolean>> = {
    emergencia: {},
    curso: {},
    cuartel: {},
    comision: {},
    comandancia: {},
  };

  /** Filtro en tiempo real sobre etiquetas del padrón. */
  filtroAsistencia = '';
  bloqueoAsistenciaMensaje: string | null = null;

  /** C1-1, C2-2, C3-3 */
  radiosSeleccion: Record<string, boolean> = {
    'C1-1': false,
    'C2-2': false,
    'C3-3': false,
  };

  /** Por canal: nombre o clave de quien usó la radio. */
  radiosDetalle: Record<string, string> = {};

  firmaEncargadoDatos = '';
  firmaObac = '';

  /** Texto libre de asistencia (se guarda en metadata). */
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

  readonly triageOpciones = [
    { v: 'VERDE', l: 'Verde' },
    { v: 'AMARILLO', l: 'Amarillo' },
    { v: 'ROJO', l: 'Rojo' },
    { v: 'NEGRO', l: 'Negro' },
  ];
  readonly materialesSugeridos = [
    'Tabla espinal',
    'Collar cervical',
    'Bolso de trauma',
    'Oxigeno',
    'DEA',
    'Camilla',
    'Ferno',
    'Laringoscopio',
    'Monitor',
    'Aposito',
  ];
  otrasCompanias: OtraCompaniaFila[] = [];
  mostrarComandoIncidente = false;
  editandoParteId: number | null = null;

  ngOnInit(): void {
    const parteIdRaw = this.route.snapshot.queryParamMap.get('editar');
    const parteId = Number(parteIdRaw ?? '');
    this.editandoParteId = Number.isFinite(parteId) && parteId > 0 ? parteId : null;
    const d = new Date();
    this.fechaDia = this.toDateInput(d);
    this.horaIncidente = this.toTimeInput(d);
    this.horaDelLlamado = this.toTimeInput(d);
    forkJoin({
      carros: this.carrosApi.listar(),
      usuarios: this.usuariosApi.listar(),
      licencias: this.licenciasApi.listarActivas(this.fechaDia),
      parteEdicion:
        this.editandoParteId != null ? this.partesApi.obtener(this.editandoParteId) : of(null),
    }).subscribe({
      next: ({ carros, usuarios, licencias, parteEdicion }) => {
        this.carros = carros;
        this.usuarios = usuarios;
        this.aplicarLicenciasActivas(licencias);
        this.reconstruirAsistenciaLayout();
        if (usuarios.length > 0) {
          this.obacId = usuarios[0].id;
          this.obacInput = this.formatoObac(usuarios[0]);
        }
        for (const r of this.radiosParteOpciones) {
          if (this.radiosDetalle[r.id] === undefined) {
            this.radiosDetalle[r.id] = '';
          }
        }
        if (parteEdicion) {
          this.cargarParteEnFormulario(parteEdicion);
        }
        this.loading = false;
      },
      error: () => {
        this.error = this.editandoParteId
          ? 'No se pudieron cargar datos para editar el parte.'
          : 'No se pudieron cargar carros u OBAC. ¿Backend activo?';
        this.loading = false;
      },
    });
  }

  get esEdicion(): boolean {
    return this.editandoParteId != null;
  }

  onFechaAsistenciaChange(): void {
    if (!this.fechaDia?.trim()) {
      return;
    }
    this.licenciasApi.listarActivas(this.fechaDia).subscribe({
      next: (rows) => this.aplicarLicenciasActivas(rows),
      error: () => {
        this.aplicarLicenciasActivas([]);
      },
    });
  }

  get pasosVisibles(): PasoId[] {
    return ['basicos', 'emergencia', 'trabajo', 'asistencia', 'apoyo', 'obs'];
  }

  get pasoActualId(): PasoId {
    return this.pasosVisibles[this.pasoIdx] ?? 'basicos';
  }

  get tituloPaso(): string {
    return this.etiquetaLargaPaso(this.pasoActualId);
  }

  etiquetaLargaPaso(id: PasoId): string {
    const m: Record<PasoId, string> = {
      basicos: 'Datos básicos',
      emergencia: 'Emergencia',
      trabajo: 'Trabajo realizado',
      asistencia: 'Asistencia',
      apoyo: 'Apoyo externo',
      obs: 'Observaciones y cierre',
    };
    return m[id] ?? '';
  }

  etiquetaCortaPaso(id: PasoId): string {
    const m: Record<PasoId, string> = {
      basicos: 'Básicos',
      emergencia: 'Lugar',
      trabajo: 'Trabajo',
      asistencia: 'Asist.',
      apoyo: 'Apoyo',
      obs: 'Notas',
    };
    return m[id] ?? '';
  }

  get esUltimoPaso(): boolean {
    return this.pasoIdx >= this.pasosVisibles.length - 1;
  }

  get totalPasos(): number {
    return this.pasosVisibles.length;
  }

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
      carroId: '',
      conductor: '',
      hora6_0: '',
      hora6_3: '',
      hora6_9: '',
      hora6_10: '',
      kmSalida: '',
      kmLlegada: '',
    });
  }

  onToggleAsistencia(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked && this.asistenciaNoSeleccionable(id)) {
      this.bloqueoAsistenciaMensaje =
        this.motivoDisponibilidadAsistencia(id) || 'Este voluntario no está disponible en la fecha seleccionada.';
      return;
    }
    const ctx = this.contextoAsistenciaActivo;
    const ctxPrevio = this.contextoAsignadoEnOtroContexto(id, ctx);
    if (checked && ctxPrevio) {
      this.bloqueoAsistenciaMensaje = `Este nombre ya está marcado en ${this.etiquetaContexto(ctxPrevio)}. Quita primero esa marca para moverlo.`;
      return;
    }
    this.bloqueoAsistenciaMensaje = null;
    const map = this.asistenciaPorContexto[ctx];
    if (checked) {
      map[id] = true;
    } else {
      delete map[id];
    }
  }

  conteoMarcasEnContexto(ctx: AsistenciaContextoKey): number {
    const r = this.asistenciaPorContexto[ctx];
    if (!r) {
      return 0;
    }
    return Object.values(r).filter(Boolean).length;
  }

  etiquetaContexto(ctx: AsistenciaContextoKey): string {
    return this.asistenciaContextos.find((x) => x.key === ctx)?.label ?? ctx;
  }

  private contextoAsignadoEnOtroContexto(
    id: string,
    contextoActual: AsistenciaContextoKey,
  ): AsistenciaContextoKey | null {
    for (const { key } of this.asistenciaContextos) {
      if (key !== contextoActual && this.asistenciaPorContexto[key]?.[id] === true) {
        return key;
      }
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
    if (!checked) {
      this.radiosDetalle[id] = '';
    }
  }

  radioMarcada(id: string): boolean {
    return this.radiosSeleccion[id] === true;
  }

  /** Total = voluntarios honorarios + activos marcados (una vez por persona aunque figure en varios contextos). */
  totalVoluntariosAsistencia(): number {
    const ids = new Set<string>();
    for (const { key } of ASISTENCIA_CONTEXTO_OPCIONES) {
      const rec = this.asistenciaPorContexto[key];
      if (!rec) {
        continue;
      }
      for (const [id, v] of Object.entries(rec)) {
        if (v && (id.startsWith('usr-') || id.startsWith('vh-') || id.startsWith('va-'))) {
          ids.add(id);
        }
      }
    }
    return ids.size;
  }

  asistenciaMarcada(id: string): boolean {
    return this.asistenciaPorContexto[this.contextoAsistenciaActivo]?.[id] === true;
  }

  itemsAsistenciaFiltrados(items: AsistenciaItemDef[]): AsistenciaItemDef[] {
    const q = this.filtroAsistencia.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (it) => it.label.toLowerCase().includes(q) || it.id.toLowerCase().includes(q),
    );
  }

  asistenciaNoSeleccionable(id: string): boolean {
    const estado = this.estadoDisponibilidadAsistencia(id);
    return estado === this.DISP_BLOQUEADO || estado === this.DISP_LICENCIA;
  }

  estadoDisponibilidadAsistencia(id: string): 'normal' | 'licencia' | 'bloqueado' {
    const u = this.usuarioAsistenciaPorId[id];
    if (!u) {
      return this.DISP_NORMAL;
    }
    const base = this.fechaBaseAsistencia();
    const estado = (u.estadoVoluntario ?? '').toUpperCase();
    const tipo = (u.tipoVoluntario ?? '').toUpperCase();
    const obs = u.observacionesRegistro ?? '';
    const rangoSusp = this.rangoDesdeTexto(obs, 'susp');
    const rangoLic = this.rangoDesdeTexto(obs, 'lic');
    const licenciaActiva = this.licenciasActivasPorUsuario[u.id];

    if (!u.activo || estado === 'INACTIVO') {
      return this.DISP_BLOQUEADO;
    }
    if (tipo.includes('SUSP') || estado.includes('SUSP')) {
      if (!rangoSusp || this.fechaEnRango(base, rangoSusp.desde, rangoSusp.hasta)) {
        return this.DISP_BLOQUEADO;
      }
    }
    if (licenciaActiva) {
      return this.DISP_LICENCIA;
    }
    if (tipo.includes('LICEN')) {
      if (!rangoLic || this.fechaEnRango(base, rangoLic.desde, rangoLic.hasta)) {
        return this.DISP_LICENCIA;
      }
    }
    return this.DISP_NORMAL;
  }

  colorPuntoDisponibilidadAsistencia(id: string): string {
    const u = this.usuarioAsistenciaPorId[id];
    if (!u) {
      return 'bg-gray-500';
    }
    const estado = this.estadoDisponibilidadAsistencia(id);
    if (estado === this.DISP_LICENCIA) {
      return 'bg-yellow-400';
    }
    if (estado === this.DISP_BLOQUEADO) {
      return 'bg-red-500';
    }
    return 'bg-emerald-400';
  }

  motivoDisponibilidadAsistencia(id: string): string {
    const u = this.usuarioAsistenciaPorId[id];
    if (!u) {
      return '';
    }
    const estado = this.estadoDisponibilidadAsistencia(id);
    if (estado === this.DISP_NORMAL) {
      return '';
    }
    const obs = u.observacionesRegistro ?? '';
    const rangoSusp = this.rangoDesdeTexto(obs, 'susp');
    const rangoLic = this.rangoDesdeTexto(obs, 'lic');
    const licenciaActiva = this.licenciasActivasPorUsuario[u.id] ?? null;
    const fechas = (r: { desde: Date; hasta: Date } | null): string =>
      r ? ` (${this.formatearDia(r.desde)} a ${this.formatearDia(r.hasta)})` : '';
    if (estado === this.DISP_LICENCIA) {
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
    this.asistenciaLayoutVista = this.asistenciaLayout;
  }

  private itemDesdeUsuario(u: UsuarioListaDto): AsistenciaItemDef {
    const id = `usr-${u.id}`;
    this.usuarioAsistenciaPorId[id] = u;
    const cargo = u.cargoOficialidad ? ` · ${u.cargoOficialidad}` : '';
    return { id, label: `${u.nombre}${cargo}` };
  }

  private esHonorario(u: UsuarioListaDto): boolean {
    const tipo = (u.tipoVoluntario ?? '').toUpperCase();
    return tipo.includes('HONOR');
  }

  private esActivoRoster(u: UsuarioListaDto): boolean {
    const tipo = (u.tipoVoluntario ?? '').toUpperCase();
    return !tipo.includes('HONOR');
  }

  private aplicarLicenciasActivas(
    rows: Array<{ usuarioId: number; fechaInicio: string; fechaTermino: string }>,
  ): void {
    for (const k of Object.keys(this.licenciasActivasPorUsuario)) {
      delete this.licenciasActivasPorUsuario[Number(k)];
    }
    for (const row of rows) {
      const desde = new Date(row.fechaInicio);
      const hasta = new Date(row.fechaTermino);
      if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
        continue;
      }
      this.licenciasActivasPorUsuario[row.usuarioId] = { desde, hasta };
    }
  }

  private fechaBaseAsistencia(): Date {
    if (this.fechaDia?.trim()) {
      const d = new Date(`${this.fechaDia}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        return d;
      }
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  private fechaEnRango(base: Date, desde: Date, hasta: Date): boolean {
    const b = new Date(base);
    b.setHours(0, 0, 0, 0);
    const d = new Date(desde);
    d.setHours(0, 0, 0, 0);
    const h = new Date(hasta);
    h.setHours(0, 0, 0, 0);
    return b.getTime() >= d.getTime() && b.getTime() <= h.getTime();
  }

  private formatearDia(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private rangoDesdeTexto(txt: string, kind: 'susp' | 'lic'): { desde: Date; hasta: Date } | null {
    if (!txt) {
      return null;
    }
    const t = txt.toLowerCase();
    const key = kind === 'susp' ? 'susp' : 'lic';
    const reCompact = new RegExp(
      `${key}\\w*\\s*\\[\\s*(\\d{4}-\\d{2}-\\d{2})\\s*[,;]\\s*(\\d{4}-\\d{2}-\\d{2})\\s*\\]`,
    );
    const mCompact = reCompact.exec(t);
    if (mCompact) {
      const d = new Date(`${mCompact[1]}T00:00:00`);
      const h = new Date(`${mCompact[2]}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime())) {
        return { desde: d, hasta: h };
      }
    }
    const reDesde = new RegExp(`${key}\\w*[_\\s-]*desde\\s*[:=]\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const reHasta = new RegExp(`${key}\\w*[_\\s-]*hasta\\s*[:=]\\s*(\\d{4}-\\d{2}-\\d{2})`);
    const mD = reDesde.exec(t);
    const mH = reHasta.exec(t);
    if (mD && mH) {
      const d = new Date(`${mD[1]}T00:00:00`);
      const h = new Date(`${mH[1]}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && !Number.isNaN(h.getTime())) {
        return { desde: d, hasta: h };
      }
    }
    return null;
  }

  /** True cuando el texto de búsqueda no coincide con ninguna casilla. */
  get asistenciaFiltroSinCoincidencias(): boolean {
    const q = this.filtroAsistencia.trim();
    if (!q) {
      return false;
    }
    for (const col of this.asistenciaLayout) {
      for (const sec of col.secciones) {
        if (this.itemsAsistenciaFiltrados(sec.items).length > 0) {
          return false;
        }
      }
    }
    return true;
  }

  quitarUltimaUnidad(): void {
    if (this.unidades.length > 1) {
      this.unidades.pop();
    }
  }

  carrosDisponiblesParaUnidad(index: number): CarroDto[] {
    const usados = new Set<number>();
    for (let i = 0; i < this.unidades.length; i++) {
      if (i === index) {
        continue;
      }
      const id = this.unidades[i]?.carroId;
      if (typeof id === 'number' && Number.isFinite(id) && id > 0) {
        usados.add(id);
      }
    }
    return this.carros.filter((c) => !usados.has(c.id));
  }

  agregarPaciente(): void {
    this.pacientes.push({ nombre: '', edad: '', rut: '', triage: 'VERDE' });
  }

  quitarPaciente(index: number): void {
    this.pacientes.splice(index, 1);
  }

  agregarVehiculo(): void {
    this.vehiculos.push({ tipo: '', patente: '', marca: '', conductor: '', rut: '' });
  }

  quitarVehiculo(index: number): void {
    this.vehiculos.splice(index, 1);
  }

  agregarApoyo(): void {
    this.apoyos.push({ tipo: 'SAMU', nombre: '', cargo: '', patente: '', conductor: '' });
  }

  agregarOtraCompania(): void {
    this.otrasCompanias.push({ obac: '', compania: '', unidad: '' });
  }

  quitarOtraCompania(index: number): void {
    this.otrasCompanias.splice(index, 1);
  }

  private formatoObac(u: UsuarioListaDto): string {
    return `${u.nombre} — ${u.rol}`;
  }

  onObacInputChange(): void {
    const q = this.obacInput.trim().toLowerCase();
    if (!q) {
      return;
    }
    const u = this.usuarios.find((x) => {
      const full = this.formatoObac(x).toLowerCase();
      return (
        full === q ||
        x.nombre.toLowerCase() === q ||
        x.rol.toLowerCase() === q ||
        String(x.id) === q
      );
    });
    if (u) {
      this.obacId = u.id;
      this.obacInput = this.formatoObac(u);
    }
  }

  /** Lista sugerida de voluntarios conductores; fallback a personal activo. */
  get voluntariosConductores(): UsuarioListaDto[] {
    const activos = this.usuarios.filter((u) => u.activo);
    const re = /(conductor|chofer|maquinista|maquina)/i;
    const conductores = activos.filter((u) => re.test(u.rol) || re.test(u.nombre));
    return conductores.length > 0 ? conductores : activos;
  }

  abrirPickerFecha(input: HTMLInputElement): void {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
    input.focus();
  }

  apoyoRequiereCargo(tipo: string): boolean {
    return tipo === 'OTRO';
  }

  apoyoMuestraNombre(tipo: string): boolean {
    return tipo === 'CARABINEROS' || tipo === 'OTRO';
  }

  apoyoMuestraConductor(tipo: string): boolean {
    return tipo === 'SAMU' || tipo === 'SEGURIDAD_CIUDADANA' || tipo === 'OTRO';
  }

  quitarApoyo(index: number): void {
    this.apoyos.splice(index, 1);
  }

  private normalizarRut(valor: string): string {
    const clean = (valor || '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length <= 1) return clean;
    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const withDots = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${withDots}-${dv}`;
  }

  private normalizarPatente(valor: string): string {
    const clean = (valor || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length === 6) {
      const a = clean.slice(0, 2);
      const b = clean.slice(2);
      if (/^[A-Z]{2}[0-9]{4}$/.test(clean)) return `${a}-${b}`;
      const c = clean.slice(0, 4);
      const d = clean.slice(4);
      if (/^[A-Z]{4}[0-9]{2}$/.test(clean)) return `${c}-${d}`;
    }
    return clean;
  }

  onPacienteRutInput(index: number, value: string): void {
    this.pacientes[index]!.rut = this.normalizarRut(value);
  }

  onVehiculoRutInput(index: number, value: string): void {
    this.vehiculos[index]!.rut = this.normalizarRut(value);
  }

  onVehiculoPatenteInput(index: number, value: string): void {
    this.vehiculos[index]!.patente = this.normalizarPatente(value);
  }

  onApoyoPatenteInput(index: number, value: string): void {
    this.apoyos[index]!.patente = this.normalizarPatente(value);
  }

  triageClass(triage: string): string {
    const t = (triage || '').toUpperCase();
    if (t === 'ROJO') return 'text-red-300';
    if (t === 'AMARILLO') return 'text-amber-300';
    if (t === 'VERDE') return 'text-emerald-300';
    if (t === 'NEGRO') return 'text-gray-300';
    return 'text-gray-300';
  }

  materialMarcado(item: string): boolean {
    const s = new Set(
      this.materialUtilizado
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => x.toLowerCase()),
    );
    return s.has(item.toLowerCase());
  }

  toggleMaterial(item: string): void {
    const vals = this.materialUtilizado
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const idx = vals.findIndex((x) => x.toLowerCase() === item.toLowerCase());
    if (idx >= 0) {
      vals.splice(idx, 1);
    } else {
      vals.push(item);
    }
    this.materialUtilizado = vals.join(', ');
  }

  private toDateInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private toTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** ISO 8601 para el backend. */
  private buildFechaIso(): string | null {
    if (!this.fechaDia) {
      return null;
    }
    let t = '12:00';
    const raw = this.horaIncidente?.trim() || this.horaDelLlamado?.trim();
    if (raw) {
      const m = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (m) {
        t = `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`;
      }
    }
    const d = new Date(`${this.fechaDia}T${t}:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  private compactAsistencia(): ParteAsistenciaMetadata | undefined {
    const out: ParteAsistenciaMetadata = {};
    const apc: Partial<Record<AsistenciaContextoKey, Record<string, boolean>>> = {};
    for (const { key } of ASISTENCIA_CONTEXTO_OPCIONES) {
      const src = this.asistenciaPorContexto[key];
      const comp: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(src)) {
        if (v) {
          comp[k] = true;
        }
      }
      if (Object.keys(comp).length > 0) {
        apc[key] = comp;
      }
    }
    if (Object.keys(apc).length > 0) {
      out.asistenciaPorContexto = apc;
    }
    const totalVol = this.totalVoluntariosAsistencia();
    if (totalVol > 0) {
      out.asistenciaTotal = String(totalVol);
    }
    const radSel: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(this.radiosSeleccion)) {
      if (v) {
        radSel[k] = true;
      }
    }
    if (Object.keys(radSel).length > 0) {
      out.radiosSeleccion = radSel;
      const det: Record<string, string> = {};
      const partesRadio: string[] = [];
      for (const id of Object.keys(radSel)) {
        const d = (this.radiosDetalle[id] ?? '').trim();
        det[id] = d;
        partesRadio.push(d ? `${id}: ${d}` : id);
      }
      out.radiosDetalle = det;
      out.radiosUtilizadas = partesRadio.join('; ');
    }
    const textKeys: (keyof typeof this.asistencia)[] = [
      'comandoIncidenteCi',
      'comandoIncidenteJs',
      'comandoIncidenteJo',
      'otraCompaniaNombre',
      'otraCompaniaNombreCompania',
      'otraCompaniaUnidad',
      'oficial128',
      'encargadoDatos',
      'nombreObac',
    ];
    for (const key of textKeys) {
      const v = this.asistencia[key]?.trim();
      if (v) {
        (out as Record<string, string>)[key as string] = v;
      }
    }
    if (this.otrasCompanias.length > 0) {
      const rows = this.otrasCompanias
        .map((x) => ({
          obac: x.obac.trim(),
          compania: x.compania.trim(),
          unidad: x.unidad.trim(),
        }))
        .filter((x) => x.obac || x.compania || x.unidad);
      if (rows.length > 0) {
        (out as unknown as { otrasCompanias?: OtraCompaniaFila[] }).otrasCompanias = rows;
        const first = rows[0]!;
        out.otraCompaniaNombre = first.obac || undefined;
        out.otraCompaniaNombreCompania = first.compania || undefined;
        out.otraCompaniaUnidad = first.unidad || undefined;
      }
    }
    if (this.firmaEncargadoDatos.startsWith('data:image')) {
      out.firmaEncargadoDatos = this.firmaEncargadoDatos;
    }
    if (this.firmaObac.startsWith('data:image')) {
      out.firmaObac = this.firmaObac;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private construirMetadata(): ParteMetadataDto | undefined {
    const conductoresPorCarroId: Record<string, string> = {};
    for (const u of this.unidades) {
      if (u.carroId !== '' && u.conductor.trim()) {
        conductoresPorCarroId[String(u.carroId)] = u.conductor.trim();
      }
    }
    const vehiculos = this.vehiculos.filter((v) => v.tipo.trim() || v.patente.trim() || v.marca.trim());
    const apoyoExterno = this.apoyos.filter(
      (a) => a.tipo.trim() || a.nombre.trim() || a.patente.trim() || a.conductor.trim(),
    );
    const asistencia = this.compactAsistencia();

    const meta: ParteMetadataDto = {
      descripcionEmergencia: this.descripcionEmergencia.trim() || undefined,
      trabajoRealizado: this.trabajoRealizado.trim() || undefined,
      horaDelLlamado: this.horaDelLlamado.trim() || undefined,
      materialUtilizado: this.materialUtilizado.trim() || undefined,
      asistencia,
      observaciones: this.observaciones.trim() || undefined,
      conductoresPorCarroId:
        Object.keys(conductoresPorCarroId).length > 0 ? conductoresPorCarroId : undefined,
      vehiculos: vehiculos.length ? vehiculos : undefined,
      apoyoExterno: apoyoExterno.length ? apoyoExterno : undefined,
    };

    const vacío =
      !meta.descripcionEmergencia &&
      !meta.trabajoRealizado &&
      !meta.horaDelLlamado &&
      !meta.materialUtilizado &&
      !meta.asistencia &&
      !meta.observaciones &&
      !meta.conductoresPorCarroId &&
      !meta.vehiculos?.length &&
      !meta.apoyoExterno?.length;
    return vacío ? undefined : meta;
  }

  private parseUnidadesPayload(): CrearPartePayload['unidades'] {
    const normHora = (s: string): string => {
      const t = (s || '').trim();
      if (!t) {
        return '00:00';
      }
      const m = t.match(/^(\d{1,2}):(\d{2})$/);
      if (m) {
        return `${String(Number(m[1])).padStart(2, '0')}:${m[2]}`;
      }
      return t;
    };
    return this.unidades
      .map((u) => {
        const h0 = normHora(u.hora6_0);
        const h3 = normHora(u.hora6_3);
        const h9 = normHora(u.hora6_9);
        const h10 = normHora(u.hora6_10);
        return {
          carroId: typeof u.carroId === 'number' ? u.carroId : Number(u.carroId),
          horaSalida: h0,
          horaLlegada: h10,
          hora6_0: h0,
          hora6_3: h3,
          hora6_9: h9,
          hora6_10: h10,
          kmSalida: Number.parseInt(u.kmSalida, 10) || 0,
          kmLlegada: Number.parseInt(u.kmLlegada, 10) || 0,
        };
      })
      .filter(
        (u) =>
          Number.isFinite(u.carroId) &&
          u.carroId > 0 &&
          this.carros.some((c) => c.id === u.carroId),
      );
  }

  private parsePacientesPayload(): NonNullable<CrearPartePayload['pacientes']> {
    return this.pacientes
      .filter((p) => p.nombre.trim().length > 0)
      .map((p) => ({
        nombre: p.nombre.trim(),
        triage: p.triage,
        edad: p.edad.trim() ? Number.parseInt(p.edad, 10) : undefined,
        rut: p.rut.trim() || undefined,
      }));
  }

  private resolverObacId(): number | null {
    this.onObacInputChange();
    if (this.obacId !== '') {
      return this.obacId as number;
    }
    const u = this.usuarios[0];
    return u ? u.id : null;
  }

  private cargarParteEnFormulario(parte: ParteEmergenciaDto): void {
    this.claveEmergencia = parte.claveEmergencia ?? '';
    this.direccion = parte.direccion ?? '';
    this.estado = parte.estado ?? 'PENDIENTE';
    const fechaParte = new Date(parte.fecha);
    if (!Number.isNaN(fechaParte.getTime())) {
      this.fechaDia = this.toDateInput(fechaParte);
      this.horaIncidente = this.toTimeInput(fechaParte);
    }
    this.obacId = parte.obacId;
    const obac = this.usuarios.find((u) => u.id === parte.obacId);
    this.obacInput = obac ? this.formatoObac(obac) : '';

    const meta = (parte.metadata ?? {}) as ParteMetadataDto;
    this.descripcionEmergencia = meta.descripcionEmergencia ?? '';
    this.trabajoRealizado = meta.trabajoRealizado ?? '';
    this.horaDelLlamado = meta.horaDelLlamado ?? '';
    this.materialUtilizado = meta.materialUtilizado ?? '';
    this.observaciones = meta.observaciones ?? '';

    const asistencia = (meta.asistencia ?? {}) as ParteAsistenciaMetadata;
    this.asistencia = {
      comandoIncidenteCi: asistencia.comandoIncidenteCi ?? '',
      comandoIncidenteJs: asistencia.comandoIncidenteJs ?? '',
      comandoIncidenteJo: asistencia.comandoIncidenteJo ?? '',
      otraCompaniaNombre: asistencia.otraCompaniaNombre ?? '',
      otraCompaniaNombreCompania: asistencia.otraCompaniaNombreCompania ?? '',
      otraCompaniaUnidad: asistencia.otraCompaniaUnidad ?? '',
      oficial128: asistencia.oficial128 ?? '',
      encargadoDatos: asistencia.encargadoDatos ?? '',
      nombreObac: asistencia.nombreObac ?? '',
    };
    this.firmaEncargadoDatos = asistencia.firmaEncargadoDatos ?? '';
    this.firmaObac = asistencia.firmaObac ?? '';
    this.radiosSeleccion = {};
    this.radiosDetalle = {};
    for (const r of this.radiosParteOpciones) {
      this.radiosSeleccion[r.id] = asistencia.radiosSeleccion?.[r.id] === true;
      this.radiosDetalle[r.id] = asistencia.radiosDetalle?.[r.id] ?? '';
    }
    this.asistenciaPorContexto = {
      emergencia: { ...(asistencia.asistenciaPorContexto?.emergencia ?? {}) },
      curso: { ...(asistencia.asistenciaPorContexto?.curso ?? {}) },
      cuartel: { ...(asistencia.asistenciaPorContexto?.cuartel ?? {}) },
      comision: { ...(asistencia.asistenciaPorContexto?.comision ?? {}) },
      comandancia: { ...(asistencia.asistenciaPorContexto?.comandancia ?? {}) },
    };
    const otrasCompaniasMeta = (asistencia as unknown as { otrasCompanias?: OtraCompaniaFila[] })
      .otrasCompanias;
    this.otrasCompanias = Array.isArray(otrasCompaniasMeta)
      ? otrasCompaniasMeta.map((o) => ({
          obac: o.obac ?? '',
          compania: o.compania ?? '',
          unidad: o.unidad ?? '',
        }))
      : [];

    this.unidades =
      parte.unidades.length > 0
        ? parte.unidades.map((u) => ({
            carroId: u.carroId,
            conductor: meta.conductoresPorCarroId?.[String(u.carroId)] ?? '',
            hora6_0: u.hora6_0 ?? u.horaSalida ?? '',
            hora6_3: u.hora6_3 ?? '',
            hora6_9: u.hora6_9 ?? '',
            hora6_10: u.hora6_10 ?? u.horaLlegada ?? '',
            kmSalida: String(u.kmSalida ?? ''),
            kmLlegada: String(u.kmLlegada ?? ''),
          }))
        : [
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

    this.pacientes = parte.pacientes.map((p) => ({
      nombre: p.nombre ?? '',
      edad: p.edad == null ? '' : String(p.edad),
      rut: p.rut ?? '',
      triage: p.triage ?? 'VERDE',
    }));
    this.vehiculos = (meta.vehiculos ?? []).map((v) => ({
      tipo: v.tipo ?? '',
      patente: v.patente ?? '',
      marca: v.marca ?? '',
      conductor: v.conductor ?? '',
      rut: v.rut ?? '',
    }));
    this.apoyos = (meta.apoyoExterno ?? []).map((a) => ({
      tipo: a.tipo ?? 'SAMU',
      nombre: a.nombre ?? '',
      cargo: a.cargo ?? '',
      patente: a.patente ?? '',
      conductor: a.conductor ?? '',
    }));
  }

  guardarBorrador(): void {
    this.guardadoError = null;
    const obac = this.resolverObacId();
    if (obac === null) {
      this.guardadoError = 'No hay OBAC disponible. Carga usuarios o revisa la conexión.';
      return;
    }
    const fechaIso = this.buildFechaIso() ?? new Date().toISOString();
    const meta = this.construirMetadata();
    const unidadesPayload = this.parseUnidadesPayload();

    this.submitting = true;
    const payload = {
      claveEmergencia: this.claveEmergencia.trim() || CLAVE_BORRADOR_DEFAULT,
      direccion: this.direccion.trim() || '— Borrador (sin dirección)',
      obacId: obac,
      fecha: fechaIso,
      estado: 'BORRADOR',
      borrador: true,
      unidades: unidadesPayload,
      pacientes: this.parsePacientesPayload(),
      metadata: meta,
    } satisfies CrearPartePayload;
    const request$ =
      this.editandoParteId != null
        ? this.partesApi.actualizar(this.editandoParteId, payload)
        : this.partesApi.crear(payload);
    request$.subscribe({
      next: (registro) => {
        this.toast.exito(this.editandoParteId != null ? 'Parte actualizado como borrador.' : 'Borrador guardado.');
        void this.router.navigate(['/partes', registro.id]);
      },
      error: () => {
        this.guardadoError = this.editandoParteId != null
          ? 'No se pudo actualizar el parte.'
          : 'No se pudo guardar el borrador.';
        this.toast.error(this.guardadoError);
        this.submitting = false;
      },
    });
  }

  /** Registro completo: solo validación mínima para no frenar en emergencia. */
  guardarParte(): void {
    this.guardadoError = null;
    const obac = this.resolverObacId();
    if (obac === null) {
      this.guardadoError = 'Selecciona o confirma OBAC.';
      return;
    }
    if (!this.claveEmergencia.trim()) {
      this.guardadoError = 'Indica el tipo de emergencia.';
      return;
    }
    if (!this.direccion.trim()) {
      this.guardadoError = 'Indica la dirección del lugar.';
      return;
    }
    if (!this.descripcionEmergencia.trim()) {
      this.guardadoError = 'Describe brevemente la emergencia.';
      return;
    }
    if (!this.trabajoRealizado.trim()) {
      this.guardadoError = 'Describe el trabajo realizado (puede ser breve).';
      return;
    }
    if (!this.horaDelLlamado.trim()) {
      this.guardadoError = 'Indica la hora del llamado (reloj).';
      return;
    }
    const radiosMarcadas = Object.values(this.radiosSeleccion).some(Boolean);
    if (!radiosMarcadas) {
      this.guardadoError = 'En cierre de asistencia, marca al menos una radio utilizada.';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    if (!(this.asistencia.encargadoDatos ?? '').trim()) {
      this.guardadoError = 'En cierre de asistencia, indica encargado de tomar datos (nombre o clave).';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    if (!(this.asistencia.oficial128 ?? '').trim()) {
      this.guardadoError = 'En cierre de asistencia, el Oficial 12-8 es obligatorio.';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    if (!this.firmaEncargadoDatos.startsWith('data:image')) {
      this.guardadoError = 'En cierre de asistencia, falta la firma del encargado de tomar datos.';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    if (!(this.asistencia.nombreObac ?? '').trim()) {
      this.guardadoError = 'En cierre de asistencia, indica OBAC (nombre o clave).';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    if (!this.firmaObac.startsWith('data:image')) {
      this.guardadoError = 'En cierre de asistencia, falta la firma del OBAC.';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    const fechaIso = this.buildFechaIso();
    if (!fechaIso) {
      this.guardadoError = 'Revisa la fecha u hora del parte.';
      return;
    }

    const unidadesPayload = this.parseUnidadesPayload();
    if (unidadesPayload.length === 0) {
      this.guardadoError = 'Agrega al menos una unidad con carro asignado.';
      return;
    }
    const unidadesInvalidas = this.unidades.some(
      (u) =>
        u.carroId === '' ||
        !u.conductor.trim() ||
        !u.hora6_0.trim() ||
        !u.hora6_3.trim() ||
        !u.hora6_9.trim() ||
        !u.hora6_10.trim() ||
        !u.kmSalida.trim() ||
        !u.kmLlegada.trim(),
    );
    if (unidadesInvalidas) {
      this.guardadoError = 'En unidades, completa conductor, KM y tiempos 6-0/6-3/6-9/6-10.';
      return;
    }

    const pacientesInvalidos = this.pacientes.some(
      (p) => !p.nombre.trim() || !p.edad.trim() || !p.rut.trim() || !p.triage.trim(),
    );
    if (pacientesInvalidos) {
      this.guardadoError = 'Si agregas pacientes, completa todos sus campos obligatorios.';
      this.pasoIdx = this.pasosVisibles.indexOf('emergencia');
      return;
    }
    const vehiculosInvalidos = this.vehiculos.some(
      (v) => !v.tipo.trim() || !v.patente.trim() || !v.marca.trim() || !v.conductor.trim() || !v.rut.trim(),
    );
    if (vehiculosInvalidos) {
      this.guardadoError = 'Si agregas vehículos, completa tipo, patente, marca, conductor y RUT.';
      this.pasoIdx = this.pasosVisibles.indexOf('emergencia');
      return;
    }
    const otrasCompaniasInvalidas = this.otrasCompanias.some(
      (o) => !o.obac.trim() || !o.compania.trim() || !o.unidad.trim(),
    );
    if (otrasCompaniasInvalidas) {
      this.guardadoError = 'En otras compañías, completa OBAC, compañía y unidad.';
      this.pasoIdx = this.pasosVisibles.indexOf('asistencia');
      return;
    }
    const apoyosInvalidos = this.apoyos.some(
      (a) => !a.tipo.trim() || !a.nombre.trim() || !a.cargo.trim() || !a.patente.trim() || !a.conductor.trim(),
    );
    if (apoyosInvalidos) {
      this.guardadoError = 'En apoyo externo, todos los campos son obligatorios por institución.';
      this.pasoIdx = this.pasosVisibles.indexOf('apoyo');
      return;
    }

    const meta = this.construirMetadata();

    this.submitting = true;
    const payload = {
      claveEmergencia: this.claveEmergencia.trim(),
      direccion: this.direccion.trim(),
      obacId: obac,
      fecha: fechaIso,
      estado: 'PENDIENTE',
      unidades: unidadesPayload,
      pacientes: this.parsePacientesPayload(),
      metadata: meta,
    } satisfies CrearPartePayload;
    const request$ =
      this.editandoParteId != null
        ? this.partesApi.actualizar(this.editandoParteId, payload)
        : this.partesApi.crear(payload);
    request$.subscribe({
      next: (registro) => {
        this.toast.exito(this.editandoParteId != null ? 'Parte actualizado correctamente.' : 'Parte registrado correctamente.');
        void this.router.navigate(['/partes', registro.id]);
      },
      error: () => {
        this.guardadoError = this.editandoParteId != null
          ? 'No se pudo actualizar el parte.'
          : 'No se pudo registrar el parte.';
        this.toast.error(this.guardadoError);
        this.submitting = false;
      },
    });
  }

}
