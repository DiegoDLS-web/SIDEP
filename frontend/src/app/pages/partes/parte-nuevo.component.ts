import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { CarroDto } from '../../models/carro.dto';
import type {
  AsistenciaContextoKey,
  ParteAsistenciaMetadata,
  ParteMetadataDto,
} from '../../models/parte.dto';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import type { CrearPartePayload } from '../../services/partes.service';
import { CarrosService } from '../../services/carros.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { CLAVES_COMPANIA_SERVICIOS, CLAVES_OPERATIVAS, CLAVE_BORRADOR_DEFAULT } from './partes.constants';
import {
  ASISTENCIA_CONTEXTO_OPCIONES,
  ASISTENCIA_LAYOUT,
  RADIOS_PARTE_OPCIONES,
  esVoluntarioAsistenciaId,
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

type PasoId = 'basicos' | 'emergencia' | 'trabajo' | 'asistencia' | 'apoyo' | 'obs';

@Component({
  selector: 'app-parte-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent],
  templateUrl: './parte-nuevo.component.html',
})
export class ParteNuevoComponent implements OnInit {
  private readonly carrosApi = inject(CarrosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly partesApi = inject(PartesService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly clavesOperativas = CLAVES_OPERATIVAS;
  readonly clavesCompania = CLAVES_COMPANIA_SERVICIOS;
  readonly asistenciaLayout = ASISTENCIA_LAYOUT;
  readonly asistenciaContextos = ASISTENCIA_CONTEXTO_OPCIONES;
  readonly radiosParteOpciones = RADIOS_PARTE_OPCIONES;
  readonly tiposApoyoExterno = [
    { id: 'SAMU', label: 'SAMU' },
    { id: 'CARABINEROS', label: 'Carabineros' },
    { id: 'SEGURIDAD_CIUDADANA', label: 'Seguridad ciudadana' },
    { id: 'OTRO', label: 'Otro' },
  ] as const;

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

  ngOnInit(): void {
    const d = new Date();
    this.fechaDia = this.toDateInput(d);
    this.horaIncidente = this.toTimeInput(d);
    this.horaDelLlamado = this.toTimeInput(d);
    forkJoin({
      carros: this.carrosApi.listar(),
      usuarios: this.usuariosApi.listar(),
    }).subscribe({
      next: ({ carros, usuarios }) => {
        this.carros = carros;
        this.usuarios = usuarios;
        if (usuarios.length > 0) {
          this.obacId = usuarios[0].id;
          this.obacInput = this.formatoObac(usuarios[0]);
        }
        for (const r of this.radiosParteOpciones) {
          if (this.radiosDetalle[r.id] === undefined) {
            this.radiosDetalle[r.id] = '';
          }
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar carros u OBAC. ¿Backend activo?';
        this.loading = false;
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
        if (v && esVoluntarioAsistenciaId(id)) {
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
    const raw = this.horaIncidente?.trim();
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
    this.partesApi
      .crear({
        claveEmergencia: this.claveEmergencia.trim() || CLAVE_BORRADOR_DEFAULT,
        direccion: this.direccion.trim() || '— Borrador (sin dirección)',
        obacId: obac,
        fecha: fechaIso,
        estado: 'BORRADOR',
        borrador: true,
        unidades: unidadesPayload,
        pacientes: this.parsePacientesPayload(),
        metadata: meta,
      })
      .subscribe({
        next: (creado) => {
          this.toast.exito('Borrador guardado.');
          void this.router.navigate(['/partes', creado.id]);
        },
        error: () => {
          this.guardadoError = 'No se pudo guardar el borrador.';
          this.toast.error('No se pudo guardar el borrador.');
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

    const meta = this.construirMetadata();

    this.submitting = true;
    this.partesApi
      .crear({
        claveEmergencia: this.claveEmergencia.trim(),
        direccion: this.direccion.trim(),
        obacId: obac,
        fecha: fechaIso,
        estado: 'PENDIENTE',
        unidades: unidadesPayload,
        pacientes: this.parsePacientesPayload(),
        metadata: meta,
      })
      .subscribe({
        next: (creado) => {
          this.toast.exito('Parte registrado correctamente.');
          void this.router.navigate(['/partes', creado.id]);
        },
        error: () => {
          this.guardadoError = 'No se pudo registrar el parte.';
          this.toast.error('No se pudo registrar el parte.');
          this.submitting = false;
        },
      });
  }

}
