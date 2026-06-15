import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
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
} from './asistencia-roster.constants';
import { etiquetaDirectorioVoluntario, nombreListaSoloPersona } from '../usuarios/usuario-registro.constants';
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
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent, SidDateInputComponent],
  templateUrl: './parte-nuevo.component.html',
})
export class ParteNuevoComponent implements OnInit {
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
  readonly catalogoEmergencias = inject(CatalogoTiposEmergenciaService);

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
    const parteIdRaw = this.route.snapshot.queryParamMap.get('editar');
    this.editandoParteId = parteIdRaw?.trim() ? parteIdRaw.trim() : null;
    
    const d = new Date();
    this.fechaDia = this.toDateInput(d);
    this.horaIncidente = this.toTimeInput(d);
    this.horaDelLlamado = this.toTimeInput(d);

    forkJoin({
      carros: this.carrosApi.listar(),
      usuarios: this.usuariosApi.listar(),
      licencias: this.licenciasApi.listarActivas(this.fechaDia),
      parteEdicion: this.editandoParteId != null ? this.partesApi.obtener(String(this.editandoParteId)) : of(null),
    }).subscribe({
      next: ({ carros, usuarios, licencias, parteEdicion }: any) => {
        this.carros = carros.data ? carros.data : carros; // Soporte por si Carros retorna success/data
        this.usuarios = usuarios;
        this.aplicarLicenciasActivas(licencias);
        this.reconstruirAsistenciaLayout();
        for (const r of this.radiosParteOpciones) {
          if (this.radiosDetalle[r.id] === undefined) {
            this.radiosDetalle[r.id] = '';
          }
        }
        if (parteEdicion) {
          // Si parteEdicion viene con .data (nuestro backend) o directo
          this.cargarParteEnFormulario(parteEdicion.data ? parteEdicion.data : parteEdicion);
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
    if (!this.fechaDia?.trim()) return;
    this.licenciasApi.listarActivas(this.fechaDia).subscribe({
      next: (rows) => this.aplicarLicenciasActivas(rows),
      error: () => this.aplicarLicenciasActivas([]),
    });
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

  private reconstruirAsistenciaLayout(): void { this.asistenciaLayoutVista = this.asistenciaLayout; }

  carrosDisponiblesParaUnidad(index: number): CarroDto[] {
    const usados = new Set<string>();
    for (let i = 0; i < this.unidades.length; i++) {
      if (i === index) continue;
      const id = this.unidades[i]?.carroId;
      if (id) usados.add(String(id));
    }
    return this.carros.filter((c) => !usados.has(String(c.id)));
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
    return this.usuarios.filter((u) => u.activo && !this.esAspirante(u)).sort((a, b) => {
      const da = this.debePriorizarAlFinalParaObac(a) ? 1 : 0;
      const db = this.debePriorizarAlFinalParaObac(b) ? 1 : 0;
      return da !== db ? da - db : a.nombre.localeCompare(b.nombre, 'es');
    });
  }

  private esAspirante(u: UsuarioListaDto): boolean { return (u.tipoVoluntario ?? '').trim().toUpperCase() === 'ASPIRANTE'; }
  get voluntariosConductores(): UsuarioListaDto[] { return this.usuarios.filter((u) => u.activo && u.autorizadoConducir === true).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')); }

  conductoresParaFila(indiceFila: number): UsuarioListaDto[] {
    const otros = new Set(this.unidades.map((fil, idx) => (idx === indiceFila ? '' : (fil.conductor ?? '').trim())).filter(Boolean));
    return this.voluntariosConductores.filter((v) => !otros.has(nombreListaSoloPersona(v)));
  }

  onConductorUnidadChange(indiceFila: number): void {
    const mio = (this.unidades[indiceFila]?.conductor ?? '').trim();
    if (!mio) return;
    this.unidades.forEach((u, j) => { if (j !== indiceFila && (u.conductor ?? '').trim() === mio) u.conductor = ''; });
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
    return !u.conductor.trim() || !u.hora6_0.trim() || !u.hora6_3.trim() || !u.hora6_9.trim() || !u.hora6_10.trim() || !u.kmSalida.trim() || !u.kmLlegada.trim();
  }

  private filaTieneBasuraSinCarro(u: FilaUnidad): boolean {
    if (u.carroId !== '') return false;
    return !!(u.conductor.trim() || u.hora6_0.trim() || u.hora6_3.trim() || u.hora6_9.trim() || u.hora6_10.trim() || u.kmSalida.trim() || u.kmLlegada.trim());
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
    return !this.asistenciaLayout.some(col => col.secciones.some(sec => this.itemsAsistenciaFiltrados(sec.items).length > 0));
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
    
    Object.keys(this.asistencia).forEach(k => { const v = (this.asistencia as any)[k]?.trim(); if (v) (out as any)[k] = v; });
    if (this.firmaEncargadoDatos.startsWith('data:image')) out.firmaEncargadoDatos = this.firmaEncargadoDatos;
    if (this.firmaObac.startsWith('data:image')) out.firmaObac = this.firmaObac;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  private construirMetadata(): ParteMetadataDto | undefined {
    const conductoresPorCarroId: Record<string, string> = {};
    this.unidades.forEach(u => { if (u.carroId !== '' && u.conductor.trim()) conductoresPorCarroId[String(u.carroId)] = u.conductor.trim(); });
    return {
      descripcionEmergencia: this.descripcionEmergencia.trim() || undefined,
      trabajoRealizado: this.trabajoRealizado.trim() || undefined,
      horaDelLlamado: this.horaDelLlamado.trim() || undefined,
      materialUtilizado: this.materialUtilizado.trim() || undefined,
      asistencia: this.compactAsistencia(),
      observaciones: this.observaciones.trim() || undefined,
      conductoresPorCarroId: Object.keys(conductoresPorCarroId).length > 0 ? conductoresPorCarroId : undefined,
    };
  }

  private parseUnidadesPayload(): any[] {
    const normHora = (s: string): string => {
      const t = (s || '').trim();
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
        kmSalida: Number.parseInt(u.kmSalida, 10) || 0,
        kmLlegada: Number.parseInt(u.kmLlegada, 10) || 0,
      }))
      .filter((u) => u.carroId && this.carros.some((c) => String(c.id) === u.carroId));
  }

  private parsePacientesPayload(): any[] {
    return this.pacientes.filter((p) => p.nombre.trim().length > 0).map((p) => ({
      nombre: p.nombre.trim(), triage: p.triage,
      edad: p.edad.trim() ? Number.parseInt(p.edad, 10) : undefined,
      rut: p.rut.trim() || undefined,
    }));
  }

  private resolverObacId(): string | null {
    if (typeof this.obacId === 'string' && this.obacId.trim().length > 0) {
      if (this.usuariosElegiblesObac.some((u) => u.id === this.obacId)) return this.obacId;
    }
    return null;
  }

  // ============================================================================
  // INTERCEPCIÓN RELACIONAL: Mapeo estricto del JSON Metadata a Tablas Relacionales
  // ============================================================================
  guardarBorrador(): void {
    this.guardadoError = null;
    const obac = this.resolverObacId();
    if (obac === null) {
      this.guardadoError = 'Selecciona OBAC en datos básicos.';
      return;
    }
    if (this.hayConductorRepetidoEnUnidades()) {
      this.guardadoError = 'Un conductor no puede estar en más de una unidad.';
      return;
    }
    
    this.submitting = true;
    const payload = {
      claveEmergencia: this.claveEmergencia.trim() || CLAVE_BORRADOR_DEFAULT,
      direccion: this.direccion.trim() || '— Borrador (sin dirección)',
      obacId: obac,
      fecha: this.buildFechaIso() ?? new Date().toISOString(),
      estado: 'BORRADOR',
      unidades: this.parseUnidadesPayload(),
      pacientes: this.parsePacientesPayload(),
      
      // Mapeo Desglosado para las Tablas de PostgreSQL
      descripcionEmergencia: this.descripcionEmergencia.trim() || null,
      trabajoRealizado: this.trabajoRealizado.trim() || null,
      materialUtilizado: this.materialUtilizado.trim() || null,
      observaciones: this.observaciones.trim() || null,
      
      vehiculosAfectados: this.vehiculos.filter(v => v.tipo.trim() || v.patente.trim()),
      apoyosExternos: this.apoyos.filter(a => a.tipo.trim() || a.nombre.trim()),
      otrasCompanias: this.otrasCompanias.filter(o => o.compania.trim() || o.unidad.trim()),
      
      metadata: this.construirMetadata(),
    } as any;

    const request$ = this.editandoParteId != null
      ? this.partesApi.actualizar(String(this.editandoParteId), payload)
      : this.partesApi.crear(payload);

    request$.subscribe({
      next: (registro) => {
        this.toast.exito('Borrador relacional guardado en PostgreSQL.');
        void this.router.navigate(['/partes', registro.id]);
      },
      error: () => {
        this.guardadoError = 'Error de conexión con la Base de Datos PostgreSQL.';
        this.toast.error(this.guardadoError);
        this.submitting = false;
      },
    });
  }

  guardarParte(): void {
    this.guardadoError = null;
    const obac = this.resolverObacId();
    if (obac === null || !this.claveEmergencia.trim() || !this.direccion.trim() || !this.descripcionEmergencia.trim() || !this.trabajoRealizado.trim() || !this.horaDelLlamado.trim()) {
      this.guardadoError = 'Por favor completa todos los campos básicos obligatorios.';
      return;
    }
    if (!Object.values(this.radiosSeleccion).some(Boolean) || !(this.asistencia.encargadoDatos ?? '').trim() || !(this.asistencia.oficial128 ?? '').trim() || !this.firmaEncargadoDatos || !this.firmaObac) {
      this.guardadoError = 'Faltan firmas o datos de cierre obligatorios.';
      this.pasoIdx = this.pasosVisibles.indexOf('obs');
      return;
    }
    const fechaIso = this.buildFechaIso();
    if (!fechaIso || this.unidadesFormularioInvalidasParaGuardar()) {
      this.guardadoError = 'Revisa los tiempos y datos de las unidades en despacho.';
      this.pasoIdx = this.pasosVisibles.indexOf('basicos');
      return;
    }

    this.submitting = true;
    const payload = {
      claveEmergencia: this.claveEmergencia.trim(),
      direccion: this.direccion.trim(),
      obacId: obac,
      fecha: fechaIso,
      estado: 'PENDIENTE',
      unidades: this.parseUnidadesPayload(),
      pacientes: this.parsePacientesPayload(),
      
      // Mapeo Relacional Directo (PostgreSQL Puro)
      descripcionEmergencia: this.descripcionEmergencia.trim(),
      trabajoRealizado: this.trabajoRealizado.trim(),
      materialUtilizado: this.materialUtilizado.trim() || null,
      observaciones: this.observaciones.trim() || null,
      
      vehiculosAfectados: this.vehiculos.filter(v => v.tipo.trim() || v.patente.trim()),
      apoyosExternos: this.apoyos.filter(a => a.tipo.trim() || a.nombre.trim()),
      otrasCompanias: this.otrasCompanias.filter(o => o.compania.trim() || o.unidad.trim()),

      metadata: this.construirMetadata(),
    } as any;

    const request$ = this.editandoParteId != null
      ? this.partesApi.actualizar(String(this.editandoParteId), payload)
      : this.partesApi.crear(payload);

    request$.subscribe({
      next: (registro) => {
        this.toast.exito('Parte relacional registrado con éxito en PostgreSQL.');
        void this.router.navigate(['/partes', registro.id]);
      },
      error: () => {
        this.guardadoError = 'Error al registrar el parte relacional.';
        this.toast.error(this.guardadoError);
        this.submitting = false;
      },
    });
  }

  // --- MÉTODOS DE RENDERIZADO Y CONTROL DE ARREGLOS RESTAURADOS ---

  private cargarParteEnFormulario(parte: any): void {
    this.claveEmergencia = parte.claveEmergencia ?? parte.fechaEmergencia ?? parte.codigoEmergencia ?? '';
    this.direccion = parte.direccion ?? '';
    this.estado = parte.estado ?? 'PENDIENTE';
    if (parte.fecha) {
      const fp = new Date(parte.fecha);
      this.fechaDia = this.toDateInput(fp);
      this.horaIncidente = this.toTimeInput(fp);
    }
    this.obacId = parte.obacId || null;

    // Soporte bidireccional (Lee desde tablas relacionales o desde metadata legado)
    this.descripcionEmergencia = parte.descripcionEmergencia ?? parte.metadata?.descripcionEmergencia ?? '';
    this.trabajoRealizado = parte.trabajoRealizado ?? parte.metadata?.trabajoRealizado ?? '';
    this.materialUtilizado = parte.materialUtilizado ?? parte.metadata?.materialUtilizado ?? '';
    this.observaciones = parte.observaciones ?? parte.metadata?.observaciones ?? '';
    this.horaDelLlamado = parte.metadata?.horaDelLlamado ?? '';

    const asis = parte.metadata?.asistencia ?? {};
    this.asistencia = {
      comandoIncidenteCi: asis.comandoIncidenteCi ?? '',
      comandoIncidenteJs: asis.comandoIncidenteJs ?? '',
      comandoIncidenteJo: asis.comandoIncidenteJo ?? '',
      otraCompaniaNombre: asis.otraCompaniaNombre ?? '',
      otraCompaniaNombreCompania: asis.otraCompaniaNombreCompania ?? '',
      otraCompaniaUnidad: asis.otraCompaniaUnidad ?? '',
      oficial128: asis.oficial128 ?? '',
      encargadoDatos: asis.encargadoDatos ?? '',
      nombreObac: asis.nombreObac ?? '',
    };

    this.firmaEncargadoDatos = asis.firmaEncargadoDatos ?? '';
    this.firmaObac = asis.firmaObac ?? '';
    this.asistenciaPorContexto = asis.asistenciaPorContexto ?? this.asistenciaPorContexto;
    
    // Obtenemos las unidades del backend nuevo o viejo
    const origUnidades = parte.unidades ?? parte.carrosAsistentes ?? [];
    this.unidades = origUnidades.map((u: any) => ({
      carroId: u.carroId,
      conductor: parte.metadata?.conductoresPorCarroId?.[String(u.carroId)] ?? '',
      hora6_0: u.hora6_0 ?? '', hora6_3: u.hora6_3 ?? '',
      hora6_9: u.hora6_9 ?? '', hora6_10: u.hora6_10 ?? '',
      kmSalida: String(u.kmSalida ?? ''), kmLlegada: String(u.kmLlegada ?? ''),
    }));
    if (this.unidades.length === 0) this.agregarUnidad();

    this.pacientes = (parte.pacientes || []).map((p: any) => ({
      nombre: p.nombre ?? '', edad: p.edad ? String(p.edad) : '', rut: p.rut ?? '', triage: p.triage ?? 'VERDE'
    }));

    this.vehiculos = (parte.vehiculosAfectados || parte.metadata?.vehiculos || []).map((v: any) => ({
      tipo: v.tipo ?? '', patente: v.patente ?? '', marca: v.marca ?? '', conductor: v.conductor ?? '', rut: v.rut ?? ''
    }));

    this.apoyos = (parte.apoyosExternos || parte.metadata?.apoyoExterno || []).map((a: any) => ({
      tipo: a.tipo ?? 'SAMU', nombre: a.nombre ?? '', cargo: a.cargo ?? '', patente: a.patente ?? '', conductor: a.conductor ?? ''
    }));

    this.otrasCompanias = (parte.otrasCompanias || asis.otrasCompanias || []).map((o: any) => ({
      obac: o.obac ?? '', compania: o.compania ?? '', unidad: o.unidad ?? ''
    }));
  }
}