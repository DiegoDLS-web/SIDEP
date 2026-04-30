import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ChecklistRegistroDto } from '../../models/checklist.dto';
import type { CarroDto } from '../../models/carro.dto';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { CarrosService } from '../../services/carros.service';
import { AuthService } from '../../services/auth.service';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { firmaEfectiva } from '../../utils/firma-resolver';
import type { EstadoChecklist } from '../../models/checklist.dto';
import { calcularEstadoChecklist, etiquetaEstadoChecklist } from '../../utils/checklist-estado';

export type EraEquipo = {
  numero: number;
  marca: string;
  tipo: string;
  ubicacion: string;
  codigoMascara: string;
  mascaraLimpia: string;
  mascaraBolsaGenero: string;
  mascaraCondicion: string;
  presion: string;
  presionMayor2000: string;
  cilindroCondicion: string;
  codigoCilindro: string;
  codigoArnes: string;
  arnesLimpio: string;
  arnesCorreasSueltas: string;
  arnesFuga: string;
  arnesModuloDigital: string;
  arnesModuloAnalogo: string;
  arnesAlarma: string;
  arnesCondicion: string;
  /** Compatibilidad PDF / resumen */
  estado: string;
};

export type CilindroRecambio = {
  numero: number;
  tipo: string;
  presionAire: string;
  presionMayor2000: string;
  condicionGeneral: string;
  codigoCilindro: string;
  estado: string;
};

function cilindroRecambioVacio(num: number, tipo = 'G1'): CilindroRecambio {
  return {
    numero: num,
    tipo,
    presionAire: '',
    presionMayor2000: '',
    condicionGeneral: '',
    codigoCilindro: '',
    estado: '',
  };
}

function eraEquipoVacio(num: number): EraEquipo {
  return {
    numero: num,
    marca: 'MSA',
    tipo: 'M7',
    ubicacion: 'Cabina',
    codigoMascara: '',
    mascaraLimpia: '',
    mascaraBolsaGenero: '',
    mascaraCondicion: '',
    presion: '',
    presionMayor2000: '',
    cilindroCondicion: '',
    codigoCilindro: '',
    codigoArnes: '',
    arnesLimpio: '',
    arnesCorreasSueltas: '',
    arnesFuga: '',
    arnesModuloDigital: '',
    arnesModuloAnalogo: '',
    arnesAlarma: '',
    arnesCondicion: '',
    estado: '',
  };
}

type EraPreset = { equipos: EraEquipo[]; recambios: CilindroRecambio[] };

function crearEquipoPreset(num: number, codigoBase: string, ubicacion: string): EraEquipo {
  const e = eraEquipoVacio(num);
  e.ubicacion = ubicacion;
  e.codigoMascara = codigoBase;
  e.codigoArnes = codigoBase;
  e.codigoCilindro = codigoBase;
  return e;
}

function crearRecambioPreset(num: number, codigo: string): CilindroRecambio {
  const r = cilindroRecambioVacio(num, 'G1');
  r.codigoCilindro = codigo;
  return r;
}

const ERA_PRESETS_UNIDAD: Record<string, EraPreset> = {
  'R-1': {
    equipos: [
      crearEquipoPreset(1, 'R1-1', 'Cabina'),
      crearEquipoPreset(2, 'R1-2', 'Cabina'),
      crearEquipoPreset(3, 'R1-3', 'Cabina'),
      crearEquipoPreset(4, 'R1-4', 'Cabina'),
    ],
    recambios: [
      crearRecambioPreset(1, 'OJ-199397'),
      crearRecambioPreset(2, 'OJ-198825'),
      crearRecambioPreset(3, 'R1-RC-3'),
    ],
  },
  'BX-1': {
    equipos: [
      crearEquipoPreset(1, 'BX1-1', 'Cabina'),
      crearEquipoPreset(2, 'BX1-2', 'Cabina'),
      crearEquipoPreset(3, 'BX1-3', 'Cabina'),
      crearEquipoPreset(4, 'BX1-4', 'Cabina'),
    ],
    recambios: [crearRecambioPreset(1, 'ACU-611333'), crearRecambioPreset(2, 'AGD-103950')],
  },
  'B-1': {
    equipos: [
      crearEquipoPreset(1, 'B1-1', 'Cabina'),
      crearEquipoPreset(2, 'B1-2', 'Cabina'),
      crearEquipoPreset(3, 'B1-3', 'Cabina'),
      crearEquipoPreset(4, 'B1-4', 'Cabina'),
      crearEquipoPreset(5, 'B1-5', 'Cortina 4'),
      crearEquipoPreset(6, 'B1-6', 'Cortina 4'),
      crearEquipoPreset(7, 'B1-7', 'Cortina 4'),
      crearEquipoPreset(8, 'B1-8', 'Cortina 4'),
    ],
    recambios: [
      crearRecambioPreset(1, 'B1-RC-1'),
      crearRecambioPreset(2, 'B1-RC-2'),
      crearRecambioPreset(3, 'B1-RC-3'),
      crearRecambioPreset(4, 'B1-RC-4'),
      crearRecambioPreset(5, 'B1-RC-5'),
    ],
  },
};

@Component({
  selector: 'app-checklist-era',
  standalone: true,
  imports: [CommonModule, FormsModule, SidepIconsModule],
  templateUrl: './checklist-era.component.html',
})
export class ChecklistEraComponent implements OnInit {
  @ViewChild('firmaCanvas') firmaCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly carrosApi = inject(CarrosService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly toast = inject(ToastService);
  readonly optSiNo = ['', 'Si', 'No'];
  readonly optOperativo = ['', 'Operativo', 'No Operativo'];
  readonly optBueno = ['', 'Bueno', 'Regular', 'Malo'];

  carros: CarroDto[] = [];
  usuarios: UsuarioListaDto[] = [];
  loading = true;
  error: string | null = null;
  saving = false;
  savingBorrador = false;
  mensajeFlash: string | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  historialEra: ChecklistRegistroDto[] = [];
  historialLoading = false;
  historialGeneral: ChecklistRegistroDto[] = [];
  historialGeneralLoading = false;
  historialGeneralError: string | null = null;
  filtroUnidad = '';
  filtroDesde = '';
  filtroHasta = '';
  mostrarRegistro = false;
  paginaHistorial = 1;
  readonly tamanioPaginaHistorial = 10;

  unidad = 'R-1';
  cuarteleroId: number | '' = '';
  inspector = '';
  grupoGuardia = '';
  /** Fecha planificada de inspección (YYYY-MM-DD). */
  fechaInspeccion = '';
  observaciones = '';

  /** ISO fecha/hora en “Fecha de cierre / firma” (al trazar la firma OBAC). */
  fechaCierreChecklist: string | null = null;
  private firmaInicialServidor: string | null = null;

  private ctx: CanvasRenderingContext2D | null = null;
  private dibujandoFirma = false;
  private ultimoX = 0;
  private ultimoY = 0;
  private firmaCanvasInicializado = false;

  equipos: EraEquipo[] = [eraEquipoVacio(1)];
  recambios: CilindroRecambio[] = [cilindroRecambioVacio(1, 'G1')];
  seccionesAbiertas: Record<string, boolean> = {};
  editandoPlantilla = false;
  guardandoPlantilla = false;
  private snapshotPlantillaEra: { equipos: EraEquipo[]; recambios: CilindroRecambio[] } | null = null;

  ngOnInit(): void {
    Promise.all([this.carrosApi.listar().toPromise(), this.usuariosApi.listar().toPromise()])
      .then(([carros, usuarios]) => {
        this.carros = carros ?? [];
        this.usuarios = usuarios ?? [];
        if (this.carros.length > 0) {
          const pref = this.carros.find((c) => c.nomenclatura === 'R-1') ?? this.carros[0];
          this.unidad = pref.nomenclatura;
          this.aplicarPlantillaDesdeServidorOPresetParaUnidad(this.unidad);
        }
        this.cuarteleroId = '';
        this.fechaInspeccion = '';
        this.loading = false;
        this.refrescarHistorialEra();
        this.cargarHistorialGeneral();
        setTimeout(() => {
          this.inicializarCanvasFirma();
          this.restaurarFirmaDesdeServidor(this.firmaInicialServidor);
        }, 0);
      })
      .catch(() => {
        this.error = 'No se pudieron cargar carros/usuarios para checklist ERA.';
        this.loading = false;
        setTimeout(() => this.inicializarCanvasFirma(), 0);
      });
  }

  carrosOrdenados(): CarroDto[] {
    const order = ['R-1', 'BX-1', 'B-1'];
    return [...this.carros].sort((a, b) => {
      const ia = order.indexOf(a.nomenclatura);
      const ib = order.indexOf(b.nomenclatura);
      if (ia === -1 && ib === -1) return a.nomenclatura.localeCompare(b.nomenclatura);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  get puedeEditarPlantilla(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase() ?? '';
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  activarEdicionPlantilla(): void {
    if (!this.puedeEditarPlantilla) return;
    this.snapshotPlantillaEra = {
      equipos: this.clonarListaEquipos(),
      recambios: this.clonarListaRecambios(),
    };
    this.editandoPlantilla = true;
  }

  cancelarEdicionPlantilla(): void {
    if (this.snapshotPlantillaEra) {
      this.equipos = this.clonarListaEquiposDesde(this.snapshotPlantillaEra.equipos);
      this.recambios = this.clonarListaRecambiosDesde(this.snapshotPlantillaEra.recambios);
    }
    this.snapshotPlantillaEra = null;
    this.editandoPlantilla = false;
  }

  guardarPlantillaEra(): void {
    if (!this.puedeEditarPlantilla || this.guardandoPlantilla) return;
    const plantilla = {
      equipos: this.equipos.map((e) => ({ ...e })),
      recambios: this.recambios.map((r) => ({ ...r })),
    };
    this.guardandoPlantilla = true;
    this.checklistsApi.guardarPlantilla('ERA', this.unidad, plantilla).subscribe({
      next: (ok) => {
        this.guardandoPlantilla = false;
        if (!ok) {
          this.toast.error('No se pudo guardar plantilla ERA.');
          return;
        }
        this.editandoPlantilla = false;
        this.snapshotPlantillaEra = null;
        this.toast.exito('Plantilla ERA guardada.');
      },
      error: () => {
        this.guardandoPlantilla = false;
        this.toast.error('No se pudo guardar plantilla ERA.');
      },
    });
  }

  private clonarListaEquipos(): EraEquipo[] {
    return this.equipos.map((e) => ({ ...e }));
  }

  private clonarListaRecambios(): CilindroRecambio[] {
    return this.recambios.map((r) => ({ ...r }));
  }

  private clonarListaEquiposDesde(src: EraEquipo[]): EraEquipo[] {
    return src.map((e) => ({ ...e }));
  }

  private clonarListaRecambiosDesde(src: CilindroRecambio[]): CilindroRecambio[] {
    return src.map((r) => ({ ...r }));
  }

  private aplicarPlantillaServidorOEraSiValida(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const o = raw as { equipos?: unknown; recambios?: unknown };
    if (!Array.isArray(o.equipos) || o.equipos.length === 0) return false;
    this.equipos = o.equipos.map((row, idx) => {
      const base = eraEquipoVacio(idx + 1);
      const patch =
        row && typeof row === 'object' && !Array.isArray(row)
          ? (row as Partial<EraEquipo>)
          : undefined;
      return { ...base, ...(patch ?? {}) };
    });
    const recRaw = Array.isArray(o.recambios) ? o.recambios : [];
    if (recRaw.length === 0) {
      this.recambios = [cilindroRecambioVacio(1, 'G1')];
    } else {
      this.recambios = recRaw.map((row, idx) => {
        const base = cilindroRecambioVacio(idx + 1, 'G1');
        const patch =
          row && typeof row === 'object' && !Array.isArray(row)
            ? (row as Partial<CilindroRecambio>)
            : undefined;
        return { ...base, ...(patch ?? {}) };
      });
    }
    return true;
  }

  private abrirTodosLosPanelesEquipos(): void {
    this.seccionesAbiertas = {};
    for (let i = 0; i < this.equipos.length; i += 1) {
      this.abrirSeccionesEquipo(i);
    }
  }

  private limpiarCapturaRegistroEra(): void {
    this.inspector = '';
    this.grupoGuardia = '';
    this.cuarteleroId = '';
    this.fechaInspeccion = '';
    this.observaciones = '';
    this.fechaCierreChecklist = null;
    this.firmaInicialServidor = null;
    this.limpiarFirma();
  }

  private aplicarPlantillaDesdeServidorOPresetParaUnidad(unidad: string): void {
    this.checklistsApi.obtenerPlantilla('ERA', unidad).subscribe({
      next: (raw) => {
        const aplicada = this.aplicarPlantillaServidorOEraSiValida(raw);
        if (!aplicada) {
          this.aplicarPresetUnidadSinApi(unidad);
        } else {
          this.abrirTodosLosPanelesEquipos();
        }
      },
      error: () => {
        this.aplicarPresetUnidadSinApi(unidad);
      },
    });
  }

  /**
   * Preset sólo desde código local (fallback si no hay plantilla en servidor).
   * No reabre paneles aquí (lo hace aplicarPlantillaDesdeServidorOPresetParaUnidad o el llamador si aplica).
   */
  private aplicarPresetUnidadSinApi(unidad: string): void {
    const preset = ERA_PRESETS_UNIDAD[unidad] ?? ERA_PRESETS_UNIDAD['R-1'];
    this.equipos = preset.equipos.map((e, i) => ({
      ...e,
      numero: i + 1,
    }));
    this.recambios = preset.recambios.map((r, i) => ({
      ...r,
      numero: i + 1,
    }));
    this.abrirTodosLosPanelesEquipos();
  }

  seleccionarUnidad(nomenclatura: string): void {
    this.unidad = nomenclatura;
    this.mostrarRegistro = true;
    this.editandoPlantilla = false;
    this.snapshotPlantillaEra = null;
    this.limpiarCapturaRegistroEra();
    this.aplicarPlantillaDesdeServidorOPresetParaUnidad(this.unidad);
    setTimeout(() => this.inicializarCanvasFirma(), 0);
    this.refrescarHistorialEra();
  }

  volverSeleccionUnidad(): void {
    this.mostrarRegistro = false;
  }

  nombreCarroActual(): string {
    const c = this.carros.find((x) => x.nomenclatura === this.unidad);
    return (c?.nombre ?? '').trim() || c?.patente || '—';
  }

  statsEra(): {
    unidades: number;
    operativos: number;
    noOperativos: number;
    equiposPorUnidad: number;
    registros: number;
  } {
    const ultimaPorUnidad = new Map<string, ChecklistRegistroDto>();
    for (const row of [...this.historialGeneral].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())) {
      const key = row.carro?.nomenclatura ?? '';
      if (!key || ultimaPorUnidad.has(key)) continue;
      ultimaPorUnidad.set(key, row);
    }
    let operativos = 0;
    let noOperativos = 0;
    let totalEquipos = 0;
    for (const row of ultimaPorUnidad.values()) {
      const total = Number(row.totalItems) || 0;
      const ok = Number(row.itemsOk) || 0;
      if (total > 0 && ok >= total) operativos += 1;
      else noOperativos += 1;
      const det = (row.detalle ?? {}) as { equipos?: unknown[] };
      totalEquipos += Array.isArray(det.equipos) ? det.equipos.length : 0;
    }
    const unidadesConRegistro = ultimaPorUnidad.size;
    const equiposPorUnidad = unidadesConRegistro > 0 ? Number((totalEquipos / unidadesConRegistro).toFixed(1)) : 0;
    return {
      unidades: this.carros.length,
      operativos,
      noOperativos,
      equiposPorUnidad,
      registros: this.historialGeneral.length,
    };
  }

  resumenUnidadEra(carro: CarroDto): {
    unidad: string;
    nombre: string;
    completitud: number;
    estado: EstadoChecklist;
    ultimaFecha: string | null;
    ultimaInspector: string;
    ultimaObac: string;
    faltantes: number;
  } {
    const rows = this.historialGeneral
      .filter((h) => h.carro?.nomenclatura === carro.nomenclatura)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const ultimo = rows[0];
    const total = Number(ultimo?.totalItems) || 0;
    const ok = Number(ultimo?.itemsOk) || 0;
    const faltantes = Math.max(total - ok, 0);
    const completitud = total > 0 ? Math.round((ok / total) * 100) : 0;
    const estado: EstadoChecklist =
      (ultimo?.estadoChecklist as EstadoChecklist | undefined) ??
      calcularEstadoChecklist(total, ok, ultimo?.observaciones ?? null);
    return {
      unidad: carro.nomenclatura,
      nombre: (carro.nombre ?? '').trim() || carro.patente || 'Sin nombre',
      completitud,
      estado,
      ultimaFecha: ultimo?.fecha ?? null,
      ultimaInspector: ultimo?.inspector ?? '—',
      ultimaObac: ultimo?.cuartelero?.nombre ?? '—',
      faltantes,
    };
  }

  fechasFormateadaCierreFirma(): string {
    if (!this.fechaCierreChecklist) return '—';
    const d = new Date(this.fechaCierreChecklist);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL');
  }

  private inicializarCanvasFirma(): void {
    if (this.firmaCanvasInicializado) return;
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.pintarFondoFirma();
    canvas.addEventListener('mousedown', (e) => {
      const [x, y] = this.mapPointer(e.clientX, e.clientY);
      this.inicioTrazo(x, y);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (e.buttons !== 1) return;
      const [x, y] = this.mapPointer(e.clientX, e.clientY);
      this.moverTrazo(x, y);
    });
    canvas.addEventListener('mouseup', () => this.finTrazo());
    canvas.addEventListener('mouseleave', () => this.finTrazo());
    canvas.addEventListener(
      'touchstart',
      (ev) => {
        ev.preventDefault();
        const t = ev.changedTouches[0];
        const [x, y] = this.mapPointer(t.clientX, t.clientY);
        this.inicioTrazo(x, y);
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchmove',
      (ev) => {
        ev.preventDefault();
        if (!this.dibujandoFirma) return;
        const t = ev.changedTouches[0];
        const [x, y] = this.mapPointer(t.clientX, t.clientY);
        this.moverTrazo(x, y);
      },
      { passive: false },
    );
    canvas.addEventListener('touchend', () => this.finTrazo());
    this.firmaCanvasInicializado = true;
  }

  private mapPointer(clientX: number, clientY: number): [number, number] {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) return [0, 0];
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    return [(clientX - r.left) * sx, (clientY - r.top) * sy];
  }

  private pintarFondoFirma(): void {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private inicioTrazo(x: number, y: number): void {
    if (!this.ctx) return;
    this.dibujandoFirma = true;
    this.ultimoX = x;
    this.ultimoY = y;
  }

  private moverTrazo(x: number, y: number): void {
    if (!this.dibujandoFirma || !this.ctx) return;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(this.ultimoX, this.ultimoY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ultimoX = x;
    this.ultimoY = y;
  }

  private finTrazo(): void {
    if (!this.dibujandoFirma) return;
    this.dibujandoFirma = false;
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas || !this.ctx) return;
    if (!this.canvasEstaVacio()) {
      this.fechaCierreChecklist = new Date().toISOString();
    }
  }

  limpiarFirma(): void {
    this.pintarFondoFirma();
    this.firmaInicialServidor = null;
    this.fechaCierreChecklist = null;
  }

  private restaurarFirmaDesdeServidor(dataUrl: string | null): void {
    const canvas = this.firmaCanvas?.nativeElement;
    const ctx = this.ctx;
    if (!canvas || !ctx || !dataUrl?.startsWith('data:image')) return;
    const img = new Image();
    img.onload = () => {
      this.pintarFondoFirma();
      try {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } catch {
        /* ignore */
      }
    };
    img.src = dataUrl;
  }

  private canvasEstaVacio(): boolean {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) return true;
    const ctx = this.ctx ?? canvas.getContext('2d');
    if (!ctx) return true;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dark = [10, 10, 10];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== dark[0] || data[i + 1] !== dark[1] || data[i + 2] !== dark[2]) {
        return false;
      }
    }
    return true;
  }

  obtenerDataUrlFirma(): string {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas || this.canvasEstaVacio()) return '';
    return canvas.toDataURL('image/png');
  }

  private firmaPerfilCuartelero(): string {
    if (this.cuarteleroId === '') {
      return '';
    }
    const u = this.usuarios.find((x) => x.id === this.cuarteleroId);
    return u?.firmaImagen?.trim() ?? '';
  }

  firmaResueltaObac(): string {
    return firmaEfectiva(this.obtenerDataUrlFirma(), this.firmaPerfilCuartelero());
  }

  private refrescarHistorialEra(): void {
    if (!this.unidad.trim()) return;
    this.historialLoading = true;
    this.checklistsApi.historialEraUnidad(this.unidad).subscribe({
      next: (rows) => {
        this.historialEra = rows ?? [];
        this.historialLoading = false;
      },
      error: () => {
        this.historialEra = [];
        this.historialLoading = false;
      },
    });
  }

  cargarHistorialGeneral(): void {
    this.historialGeneralLoading = true;
    this.historialGeneralError = null;
    this.checklistsApi.listarChecklistEra().subscribe({
      next: (rows) => {
        this.historialGeneral = rows ?? [];
        this.paginaHistorial = 1;
        this.historialGeneralLoading = false;
      },
      error: () => {
        this.historialGeneral = [];
        this.historialGeneralLoading = false;
        this.historialGeneralError = 'No se pudo cargar el historial ERA.';
      },
    });
  }

  historialGeneralFiltrado(): ChecklistRegistroDto[] {
    return this.historialGeneral.filter((h) => {
      const unidad = h.carro?.nomenclatura ?? '';
      if (this.filtroUnidad && unidad !== this.filtroUnidad) {
        return false;
      }
      const ts = new Date(h.fecha).getTime();
      if (Number.isNaN(ts)) {
        return false;
      }
      if (this.filtroDesde) {
        const desdeTs = new Date(`${this.filtroDesde}T00:00:00`).getTime();
        if (!Number.isNaN(desdeTs) && ts < desdeTs) return false;
      }
      if (this.filtroHasta) {
        const hastaTs = new Date(`${this.filtroHasta}T23:59:59`).getTime();
        if (!Number.isNaN(hastaTs) && ts > hastaTs) return false;
      }
      return true;
    });
  }

  totalPaginasHistorial(): number {
    return Math.max(1, Math.ceil(this.historialGeneralFiltrado().length / this.tamanioPaginaHistorial));
  }

  historialGeneralPaginado(): ChecklistRegistroDto[] {
    const inicio = (this.paginaHistorial - 1) * this.tamanioPaginaHistorial;
    return this.historialGeneralFiltrado().slice(inicio, inicio + this.tamanioPaginaHistorial);
  }

  cambiarPaginaHistorial(delta: number): void {
    const next = this.paginaHistorial + delta;
    const total = this.totalPaginasHistorial();
    this.paginaHistorial = Math.min(Math.max(next, 1), total);
  }

  aplicarFiltrosHistorialEra(): void {
    this.paginaHistorial = 1;
  }

  fechaHoraHist(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString('es-CL')} ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  }

  fechaHoraCard(iso: string | null | undefined): { fecha: string; hora: string } {
    if (!iso) return { fecha: '—', hora: '—' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { fecha: '—', hora: '—' };
    return {
      fecha: d.toLocaleDateString('es-CL'),
      hora: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  etiquetaEstadoEra(h: ChecklistRegistroDto): 'COMPLETADO' | 'PENDIENTE' | 'CON_OBSERVACION' {
    if (h.estadoChecklist) return h.estadoChecklist;
    return calcularEstadoChecklist(h.totalItems, h.itemsOk, h.observaciones);
  }

  etiquetaEstadoEraTexto(h: ChecklistRegistroDto): string {
    return etiquetaEstadoChecklist(this.etiquetaEstadoEra(h));
  }

  claseEstadoEra(h: ChecklistRegistroDto): string {
    const estado = this.etiquetaEstadoEra(h);
    if (estado === 'COMPLETADO') return 'sid-status-chip-ok';
    if (estado === 'CON_OBSERVACION') return 'sid-status-chip-warn';
    return 'sid-status-chip-neutral';
  }

  porcentajeCumplimiento(h: ChecklistRegistroDto): string {
    const total = Number(h.totalItems) || 0;
    const ok = Number(h.itemsOk) || 0;
    if (total <= 0) return '—';
    return `${ok}/${total} (${Math.round((ok / total) * 100)}%)`;
  }

  ultimaRevisionGeneralTexto(): string {
    if (this.historialGeneral.length === 0) return '—';
    const ultima = [...this.historialGeneral].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )[0];
    if (!ultima?.fecha) return '—';
    const d = new Date(ultima.fecha);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-CL');
  }

  editarRegistroEra(h: ChecklistRegistroDto): void {
    this.mostrarRegistro = true;
    this.editandoPlantilla = false;
    this.snapshotPlantillaEra = null;
    this.unidad = h.carro.nomenclatura || this.unidad;
    this.inspector = h.inspector ?? '';
    this.grupoGuardia = h.grupoGuardia ?? '';
    this.observaciones = h.observaciones ?? '';
    const det = (h.detalle ?? {}) as {
      fechaInspeccion?: string;
      equipos?: EraEquipo[];
      cilindrosRecambio?: CilindroRecambio[];
    };
    if (det.fechaInspeccion) {
      this.fechaInspeccion = String(det.fechaInspeccion).slice(0, 10);
    }
    if (Array.isArray(det.equipos) && det.equipos.length > 0) {
      this.equipos = det.equipos;
    }
    if (Array.isArray(det.cilindrosRecambio) && det.cilindrosRecambio.length > 0) {
      this.recambios = det.cilindrosRecambio;
    }
    if (h.firmaOficial?.startsWith('data:image')) {
      this.firmaInicialServidor = h.firmaOficial;
      setTimeout(() => this.restaurarFirmaDesdeServidor(this.firmaInicialServidor), 0);
    }
    setTimeout(() => this.inicializarCanvasFirma(), 0);
    this.flash(`Registro ${h.id} cargado para edición.`);
  }

  descargarRegistroEraPdf(h: ChecklistRegistroDto): void {
    const det = (h.detalle ?? {}) as {
      fechaInspeccion?: string;
      equipos?: EraEquipo[];
      cilindrosRecambio?: CilindroRecambio[];
    };
    this.pdfExport.exportarChecklistEra({
      unidad: h.carro.nomenclatura || this.unidad,
      nombreCarro: h.carro.nombre || this.nombreCarroActual(),
      fechaInspeccion: det.fechaInspeccion || h.fecha.slice(0, 10),
      inspector: h.inspector ?? '',
      grupoGuardia: h.grupoGuardia ?? '',
      responsable: h.cuartelero.nombre ?? '',
      firmaOficial: h.firmaOficial ?? '',
      observaciones: h.observaciones ?? '',
      equipos: Array.isArray(det.equipos) ? det.equipos : this.equipos,
      recambios: Array.isArray(det.cilindrosRecambio) ? det.cilindrosRecambio : this.recambios,
    });
  }

  agregarEquipo(): void {
    if (!this.editandoPlantilla) return;
    const index = this.equipos.length;
    this.equipos.push(eraEquipoVacio(index + 1));
    this.abrirSeccionesEquipo(index);
  }

  agregarRecambio(): void {
    if (!this.editandoPlantilla) return;
    this.recambios.push(cilindroRecambioVacio(this.recambios.length + 1, 'G1'));
  }

  private claveSeccion(index: number, seccion: string): string {
    return `${index}:${seccion}`;
  }

  private abrirSeccionesEquipo(index: number): void {
    for (const s of ['mascara', 'regulador', 'cilindro', 'arnes', 'prueba']) {
      this.seccionesAbiertas[this.claveSeccion(index, s)] = true;
    }
  }

  seccionAbierta(index: number, seccion: string): boolean {
    return this.seccionesAbiertas[this.claveSeccion(index, seccion)] ?? true;
  }

  toggleSeccion(index: number, seccion: string): void {
    const key = this.claveSeccion(index, seccion);
    this.seccionesAbiertas[key] = !this.seccionAbierta(index, seccion);
  }

  etiquetaEstadoEquipo(e: EraEquipo): 'Operativo' | 'Observación' | 'Crítico' {
    if (e.arnesCondicion !== 'Operativo' || e.cilindroCondicion !== 'Operativo' || e.mascaraCondicion !== 'Operativo') {
      return 'Crítico';
    }
    if (e.arnesModuloDigital === 'Regular' || e.arnesModuloAnalogo === 'Regular' || e.arnesAlarma === 'Regular') {
      return 'Observación';
    }
    return 'Operativo';
  }

  claseEstadoEquipo(e: EraEquipo): string {
    const estado = this.etiquetaEstadoEquipo(e);
    if (estado === 'Operativo') return 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200';
    if (estado === 'Observación') return 'border-amber-500/50 bg-amber-500/20 text-amber-200';
    return 'border-red-500/50 bg-red-500/20 text-red-200';
  }

  validarEraCompleto(): string | null {
    if (this.cuarteleroId === '') {
      return 'Selecciona un oficial responsable (OBAC).';
    }
    if (!this.inspector.trim()) {
      return 'Indica el nombre del inspector o clave.';
    }
    if (!this.grupoGuardia.trim()) {
      return 'Selecciona el grupo de guardia.';
    }
    if (!this.fechaInspeccion) {
      return 'Indica la fecha de inspección.';
    }
    if (!this.firmaResueltaObac()) {
      return 'La firma del OBAC es obligatoria (dibújala o usa la firma del perfil del responsable).';
    }
    if (this.equipos.length === 0) {
      return 'Debe existir al menos un equipo ERA.';
    }
    for (const e of this.equipos) {
      if (
        !e.marca.trim() ||
        !e.tipo.trim() ||
        !e.codigoMascara.trim() ||
        !e.codigoArnes.trim() ||
        !e.presion.trim() ||
        !e.codigoCilindro.trim() ||
        !e.mascaraLimpia.trim() ||
        !e.mascaraBolsaGenero.trim() ||
        !e.mascaraCondicion.trim() ||
        !e.presionMayor2000.trim() ||
        !e.cilindroCondicion.trim() ||
        !e.arnesLimpio.trim() ||
        !e.arnesCorreasSueltas.trim() ||
        !e.arnesFuga.trim() ||
        !e.arnesModuloDigital.trim() ||
        !e.arnesModuloAnalogo.trim() ||
        !e.arnesAlarma.trim() ||
        !e.arnesCondicion.trim()
      ) {
        return `Completa todos los campos del ERA ${e.numero} (incluye selecciones de estado/condición).`;
      }
    }
    if (this.recambios.length === 0) {
      return 'Debe existir al menos un cilindro de recambio.';
    }
    for (const c of this.recambios) {
      if (
        !c.presionAire.trim() ||
        !c.codigoCilindro.trim() ||
        !c.tipo.trim() ||
        !c.presionMayor2000.trim() ||
        !c.condicionGeneral.trim()
      ) {
        return `Completa cilindro de recambio ${c.numero}: tipo, presión, código y estado.`;
      }
    }
    return null;
  }

  /** PDF solo con checklist listo (datos mínimos + firma). */
  eraListoParaPdf(): boolean {
    return this.validarEraCompleto() === null;
  }

  private flash(msg: string): void {
    this.mensajeFlash = msg;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.mensajeFlash = null;
      this.flashTimer = null;
    }, 3800);
  }

  guardar(): void {
    const v = this.validarEraCompleto();
    if (v) {
      this.error = v;
      if (v.includes('firma')) {
        this.flash('Debes firmar en el área OBAC o tener firma en el perfil del responsable.');
      }
      return;
    }
    const firma = this.firmaResueltaObac();
    if (!firma) {
      this.error = 'La firma del OBAC es obligatoria.';
      return;
    }
    const obacId = this.cuarteleroId;
    if (obacId === '') {
      return;
    }
    const total = this.equipos.length + this.recambios.length;
    const ok =
      this.equipos.filter((e) => e.arnesCondicion === 'Operativo').length +
      this.recambios.filter((r) => r.condicionGeneral === 'Operativo').length;
    this.error = null;
    this.saving = true;
    this.checklistsApi
      .guardarChecklistEra({
        unidad: this.unidad,
        cuarteleroId: obacId,
        inspector: this.inspector,
        grupoGuardia: this.grupoGuardia,
        firmaOficial: firma,
        observaciones: this.observaciones,
        totalItems: total,
        itemsOk: ok,
        detalle: {
          fechaInspeccion: this.fechaInspeccion,
          equipos: this.equipos,
          cilindrosRecambio: this.recambios,
          borrador: false,
        },
      })
      .subscribe({
        next: (reg) => {
          this.saving = false;
          this.error = null;
          if (reg?.fecha) {
            this.fechaCierreChecklist = reg.fecha;
          }
          this.refrescarHistorialEra();
          this.cargarHistorialGeneral();
          this.toast.exito('Checklist ERA guardado.');
        },
        error: () => {
          this.error = 'No se pudo guardar checklist ERA.';
          this.toast.error('No se pudo guardar el checklist ERA.');
          this.saving = false;
        },
      });
  }

  guardarBorrador(): void {
    if (this.cuarteleroId === '') {
      this.error = 'Selecciona oficial responsable (OBAC) para el borrador.';
      return;
    }
    const obacBorrador = this.cuarteleroId;
    this.error = null;
    this.savingBorrador = true;
    const total = this.equipos.length + this.recambios.length;
    const ok =
      this.equipos.filter((e) => e.arnesCondicion === 'Operativo').length +
      this.recambios.filter((r) => r.condicionGeneral === 'Operativo').length;
    const firma = this.firmaResueltaObac();
    this.checklistsApi
      .guardarChecklistEra({
        unidad: this.unidad,
        cuarteleroId: obacBorrador,
        inspector: this.inspector,
        grupoGuardia: this.grupoGuardia,
        firmaOficial: firma || null,
        observaciones: this.observaciones,
        totalItems: total,
        itemsOk: ok,
        detalle: {
          fechaInspeccion: this.fechaInspeccion,
          equipos: this.equipos,
          cilindrosRecambio: this.recambios,
          borrador: true,
        },
      })
      .subscribe({
        next: (reg) => {
          this.savingBorrador = false;
          this.error = null;
          if (reg?.fecha) {
            this.fechaCierreChecklist = reg.fecha;
          }
          this.refrescarHistorialEra();
          this.cargarHistorialGeneral();
          this.flash('Borrador guardado.');
          this.toast.exito('Borrador ERA guardado.');
        },
        error: () => {
          this.error = 'No se pudo guardar el borrador.';
          this.toast.error('No se pudo guardar el borrador.');
          this.savingBorrador = false;
        },
      });
  }

  descargarPdf(): void {
    if (!this.eraListoParaPdf()) {
      this.flash('Completa inspector, fecha, firma OBAC y equipos ERA para generar el PDF.');
      return;
    }
    const responsable = this.usuarios.find((u) => u.id === this.cuarteleroId)?.nombre ?? '';
    this.pdfExport.exportarChecklistEra({
      unidad: this.unidad,
      nombreCarro: this.nombreCarroActual(),
      fechaInspeccion: this.fechaInspeccion,
      inspector: this.inspector,
      grupoGuardia: this.grupoGuardia,
      responsable,
      firmaOficial: this.firmaResueltaObac(),
      observaciones: this.observaciones,
      equipos: this.equipos,
      recambios: this.recambios,
    });
  }
}
