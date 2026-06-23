import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { BolsosTraumaService } from '../../services/bolsos-trauma.service';
import { ChecklistsService } from '../../services/checklists.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { SignaturePadComponent } from '../../shared/signature-pad.component';
import { SidDateInputComponent } from '../../shared/sid-date-input.component';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { firmaEfectiva } from '../../utils/firma-resolver';
import { filtrarUsuariosChecklist } from '../../utils/usuarios-checklist.util';
import { confirmarDescartarCambios } from '../../utils/confirmar-descartar.util';
import { crearControlEdicionPendiente } from '../../utils/edicion-pendiente.util';
import type { ComponenteConEdicionPendiente } from '../../guards/edicion-pendiente.guard';
import { registrarEdicionPendienteGlobal } from '../../utils/registrar-edicion-pendiente-global.util';
import { ubicacionesPlantillaTraumaOficial } from './trauma-plantilla-oficial';
import { SidEdicionPendienteBannerComponent } from '../../shared/sid-edicion-pendiente-banner.component';
import { nombreListaSoloPersona } from '../usuarios/usuario-registro.constants';

type MaterialItem = {
  id: string;
  nombre: string;
  cantidadMinima: number;
  cantidadOptima: number;
  cantidadActual: number;
};
type Ubicacion = { nombre: string; materiales: MaterialItem[] };
type Bolso = { numero: number; ubicaciones: Ubicacion[] };

function nuevoMaterial(
  nombre: string,
  min: number,
  opt: number,
  actual: number,
): MaterialItem {
  return {
    id: crypto.randomUUID(),
    nombre,
    cantidadMinima: min,
    cantidadOptima: opt,
    cantidadActual: actual,
  };
}

/** Plantilla según checklist Excel R-1 (mismos mínimos/óptimos en todas las unidades). */
function bolsoPlantillaOficial(numero: number): Bolso {
  return {
    numero,
    ubicaciones: ubicacionesPlantillaTraumaOficial().map((u) => ({
      nombre: u.nombre,
      materiales: u.materiales.map((m) =>
        nuevoMaterial(m.nombre, m.cantidadMinima, m.cantidadOptima, 0),
      ),
    })),
  };
}

/** Misma política que el selector del backend (`bolsos-trauma`). R-1, B-1 y BX-1 comparten catálogo de 3 bolsos. */
function cantidadBolsosPorUnidad(unidad: string): number {
  if (unidad === 'R-1' || unidad === 'B-1' || unidad === 'BX-1') return 3;
  return 1;
}

function defaultBolsos(unidad: string): Bolso[] {
  const cantidad = cantidadBolsosPorUnidad(unidad);
  return Array.from({ length: cantidad }, (_, i) => bolsoPlantillaOficial(i + 1));
}

/** Alinea filas guardadas/plantilla con la cantidad de bolsos de la nomenclatura (R-1/B-1/BX-1→3, resto→1). */
function ajustarBolsosACantidadUnidad(bolsos: Bolso[], unidad: string): Bolso[] {
  const n = cantidadBolsosPorUnidad(unidad);
  const out: Bolso[] = [];
  for (let i = 0; i < n; i++) {
    const b = bolsos[i];
    out.push(b ? { ...b, numero: i + 1 } : bolsoPlantillaOficial(i + 1));
  }
  return out;
}

function keyTraumaNombre(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** R-1, B-1 y BX-1 deben listar siempre la misma plantilla oficial (p. ej. B-1 no queda con menos ítems por checklists viejos). */
function unidadConCatalogoTraumaCompleto(unidad: string): boolean {
  return unidad === 'R-1' || unidad === 'B-1' || unidad === 'BX-1';
}

/**
 * Reescribe compartimientos y materiales según `bolsoPlantillaOficial`, conservando cantidad actual
 * cuando coincide el nombre (tras normalizar).
 */
function fusionarBolsosConPlantillaCanon(bolsos: Bolso[], unidad: string): Bolso[] {
  const n = cantidadBolsosPorUnidad(unidad);
  const out: Bolso[] = [];
  for (let i = 0; i < n; i++) {
    const numero = i + 1;
    const ref = bolsoPlantillaOficial(numero);
    const viejo = bolsos[i];
    const ubicaciones: Ubicacion[] = ref.ubicaciones.map((tplU) => {
      const viejaU = viejo?.ubicaciones.find(
        (u) => keyTraumaNombre(u.nombre) === keyTraumaNombre(tplU.nombre),
      );
      const materiales: MaterialItem[] = tplU.materiales.map((tm) => {
        const viejoM = viejaU?.materiales.find(
          (m) => keyTraumaNombre(m.nombre) === keyTraumaNombre(tm.nombre),
        );
        const act = viejoM?.cantidadActual;
        return {
          id: viejoM?.id ?? crypto.randomUUID(),
          nombre: tm.nombre,
          cantidadMinima: tm.cantidadMinima,
          cantidadOptima: tm.cantidadOptima,
          cantidadActual:
            typeof act === 'number' && Number.isFinite(act) ? Math.max(0, Math.round(act)) : 0,
        };
      });
      return { nombre: tplU.nombre, materiales };
    });
    out.push({ numero, ubicaciones });
  }
  return out;
}

@Component({
  selector: 'app-bolso-trauma-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent, SidDateInputComponent, SidEdicionPendienteBannerComponent],
  templateUrl: './bolso-trauma-registro.component.html',
})
export class BolsoTraumaRegistroComponent implements OnInit, ComponenteConEdicionPendiente {
  readonly nombreListaSoloPersona = nombreListaSoloPersona;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bolsosApi = inject(BolsosTraumaService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly pdf = inject(PdfExportService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  constructor() {
    const destroyRef = inject(DestroyRef);
    registrarEdicionPendienteGlobal(destroyRef, () => this.tieneEdicionPendiente());
  }

  unidad = 'R-1';
  nombreCarro = '';
  bolsoNumero = 1;
  usuarios: UsuarioListaDto[] = [];
  cuarteleroId: string = '';
  nombreInspector = '';
  grupoGuardia = '';
  /** Fecha planificada de inspección (YYYY-MM-DD). */
  fechaInspeccion = '';
  observaciones = '';
  /** Firma OBAC (PNG data URL). */
  firmaDataUrl = '';
  /** Firma del inspector (PNG data URL). */
  firmaInspectorDataUrl = '';
  /** ISO fecha/hora mostrada en “Fecha de cierre / firma” al firmar. */
  fechaCierreChecklist: string | null = null;

  bolsos: Bolso[] = [];

  loading = true;
  saving = false;
  savingBorrador = false;
  error: string | null = null;
  mensajeFlash: string | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  editandoPlantilla = false;
  guardandoPlantilla = false;
  motivoEdicionPlantilla = '';
  private snapshotPlantillaBolso: Bolso[] | null = null;
  /** Acordeón por compartimiento (índice); true = expandido. */
  private ubicacionesExpandidas: Record<number, boolean> = {};

  private readonly controlEdicion = crearControlEdicionPendiente(() => ({
    cuarteleroId: this.cuarteleroId,
    nombreInspector: this.nombreInspector,
    grupoGuardia: this.grupoGuardia,
    fechaInspeccion: this.fechaInspeccion,
    observaciones: this.observaciones,
    bolsos: this.bolsos,
    firmaDataUrl: this.firmaDataUrl,
    firmaInspectorDataUrl: this.firmaInspectorDataUrl,
  }));

  tieneEdicionPendiente(): boolean {
    if (this.loading || this.saving || this.savingBorrador) return false;
    if (this.editandoPlantilla && this.plantillaBolsoTieneCambios()) return true;
    return this.controlEdicion.tieneCambios();
  }

  registroTieneCambios(): boolean {
    if (this.editandoPlantilla) return this.plantillaBolsoTieneCambios();
    return this.controlEdicion.tieneCambios();
  }

  ngOnInit(): void {
    this.unidad = this.route.snapshot.paramMap.get('unidad') ?? 'R-1';
    const q = Number(this.route.snapshot.queryParamMap.get('bolso') ?? '1');
    this.bolsoNumero = Number.isFinite(q) && q > 0 ? q : 1;
    const hoy = new Date().toISOString().slice(0, 10);
    this.fechaInspeccion = hoy;

    forkJoin({
      data: this.bolsosApi.obtenerUnidad(this.unidad).pipe(
        catchError(() => of({ carro: { nombre: `Unidad ${this.unidad}` }, checklist: null })),
      ),
      usuarios: this.usuariosApi.voluntariosParaSelect().pipe(
        catchError(() => of(this.usuariosDesdeSesion())),
      ),
      plantilla: (this.checklistsApi as any).obtenerPlantilla('TRAUMA', this.unidad).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ data, usuarios, plantilla }) => {
        this.usuarios = filtrarUsuariosChecklist(usuarios?.length ? usuarios : this.usuariosDesdeSesion());
        this.nombreCarro = (data?.carro?.nombre ?? '').trim() || `Unidad ${this.unidad}`;

        const checklist = data?.checklist;
        const detalle = checklist?.detalle as {
          bolsos?: Bolso[];
          fecha?: string;
          fechaInspeccion?: string;
          bolsoNumero?: number;
        } | null;

        const plantillaBolsos = this.parsePlantillaBolsos(plantilla);
        if (detalle?.bolsos?.length) {
          this.bolsos = ajustarBolsosACantidadUnidad(detalle.bolsos, this.unidad);
        } else if (plantillaBolsos?.length) {
          this.bolsos = ajustarBolsosACantidadUnidad(plantillaBolsos, this.unidad);
        } else {
          this.bolsos = defaultBolsos(this.unidad);
        }

        if (unidadConCatalogoTraumaCompleto(this.unidad)) {
          this.bolsos = fusionarBolsosConPlantillaCanon(this.bolsos, this.unidad);
        }

        if (checklist?.inspector) this.nombreInspector = checklist.inspector;
        if (checklist?.grupoGuardia) this.grupoGuardia = checklist.grupoGuardia;
        if (checklist?.observaciones) this.observaciones = checklist.observaciones;
        if (checklist?.cuarteleroId) {
          const id = String(checklist.cuarteleroId);
          const match = this.usuarios.find((u) => u.id === id || u.rut === id);
          this.cuarteleroId = match?.id ?? id;
        } else if (this.usuarios.length > 0) {
          const id = this.usuarios[0].id;
          const match = this.usuarios.find((u) => u.id === id || u.rut === id);
          this.cuarteleroId = match?.id ?? id;
        }

        if (!this.nombreInspector.trim()) {
          const perfil = this.auth.usuarioActual;
          const nom = perfil?.nombre?.trim() ?? '';
          const clave = (perfil as { claveNomina?: string })?.claveNomina?.trim() ?? '';
          this.nombreInspector = nom && clave ? `${nom} / ${clave}` : nom;
        }

        const fi = detalle?.fechaInspeccion ?? detalle?.fecha;
        if (fi && /^\d{4}-\d{2}-\d{2}/.test(fi)) {
          this.fechaInspeccion = fi.slice(0, 10);
        }

        const fFirma = checklist?.firmaOficial?.trim();
        if (fFirma?.startsWith('data:image')) {
          this.firmaDataUrl = fFirma;
          this.fechaCierreChecklist = checklist?.fecha ?? null;
        }
        const fInsp = checklist?.firmaInspector?.trim();
        if (fInsp?.startsWith('data:image')) {
          this.firmaInspectorDataUrl = fInsp;
        }

        this.controlEdicion.marcarLimpio();
        this.loading = false;
      },
      error: () => {
        this.usuarios = [];
        this.bolsos = defaultBolsos(this.unidad);
        this.error = 'No se pudo cargar el registro del bolso de trauma.';
        this.loading = false;
      },
    });
  }

  /** Si la API de usuarios falla, permite al menos seleccionar al usuario de la sesión. */
  private usuariosDesdeSesion(): UsuarioListaDto[] {
    const u = this.auth.usuarioActual;
    if (!u?.rut) return [];
    const nombre = (u.nombre ?? '').trim() || 'Usuario de sesión';
    const ahora = new Date().toISOString();
    return [
      {
        id: u.rut,
        rut: u.rut,
        nombre,
        rol: u.rol ?? 'VOLUNTARIOS',
        email: null,
        telefono: null,
        activo: true,
        nombres: nombre,
        apellidoPaterno: null,
        apellidoMaterno: null,
        nacionalidad: null,
        grupoSanguineo: null,
        direccion: null,
        region: null,
        comuna: null,
        actividad: null,
        fechaNacimiento: null,
        fechaIngreso: null,
        tipoVoluntario: null,
        cuerpoBombero: null,
        compania: null,
        estadoVoluntario: null,
        cargoOficialidad: null,
        observacionesRegistro: null,
        firmaImagen: null,
        createdAt: ahora,
        updatedAt: ahora,
      },
    ];
  }

  get bolsoActual(): Bolso {
    const b = this.bolsos.find((x) => x.numero === this.bolsoNumero);
    if (b) {
      if (b.ubicaciones.length === 0) {
        b.ubicaciones = bolsoPlantillaOficial(this.bolsoNumero).ubicaciones;
      }
      return b;
    }
    const nuevo: Bolso = { numero: this.bolsoNumero, ubicaciones: bolsoPlantillaOficial(this.bolsoNumero).ubicaciones };
    this.bolsos.push(nuevo);
    return nuevo;
  }

  fechasFormateadaCierreFirma(): string {
    if (!this.fechaCierreChecklist) return '—';
    const d = new Date(this.fechaCierreChecklist);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL');
  }

  private firmaPerfilCuartelero(): string {
    if (this.cuarteleroId === '') {
      return '';
    }
    return this.usuarios.find((u) => u.id === this.cuarteleroId)?.firmaImagen?.trim() ?? '';
  }

  /** Firma del pad o imagen cargada en el perfil del OBAC. */
  firmaResueltaObac(): string {
    return firmaEfectiva(this.firmaDataUrl, this.firmaPerfilCuartelero());
  }

  firmaResueltaInspector(): string {
    return (this.firmaInspectorDataUrl || '').trim();
  }

  onFirmaChange(dataUrl: string): void {
    this.firmaDataUrl = dataUrl;
    if (dataUrl?.startsWith('data:image')) {
      this.fechaCierreChecklist = new Date().toISOString();
    } else {
      this.fechaCierreChecklist = null;
    }
  }

  onFirmaInspectorChange(dataUrl: string): void {
    this.firmaInspectorDataUrl = dataUrl;
  }

  agregarMaterial(ubicacionIndex: number): void {
    this.bolsoActual.ubicaciones[ubicacionIndex]?.materiales.push({
      id: crypto.randomUUID(),
      nombre: '',
      cantidadMinima: 1,
      cantidadOptima: 1,
      cantidadActual: 0,
    });
  }

  get puedeEditarPlantilla(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  activarEdicionPlantilla(): void {
    this.motivoEdicionPlantilla = '';
    this.snapshotPlantillaBolso = JSON.parse(JSON.stringify(this.bolsos)) as Bolso[];
    this.editandoPlantilla = true;
  }

  cancelarEdicionPlantilla(): void {
    void this.intentarCancelarEdicionPlantilla();
  }

  private plantillaBolsoTieneCambios(): boolean {
    if (!this.snapshotPlantillaBolso) return false;
    return JSON.stringify(this.bolsos) !== JSON.stringify(this.snapshotPlantillaBolso);
  }

  async intentarCancelarEdicionPlantilla(): Promise<void> {
    const ok = await confirmarDescartarCambios(this.confirmDialog, this.plantillaBolsoTieneCambios(), {
      title: 'Salir de edición de plantilla',
      message: 'Hay cambios en la plantilla del bolso sin guardar. ¿Deseas descartarlos?',
    });
    if (!ok) return;
    if (this.snapshotPlantillaBolso) {
      this.bolsos = JSON.parse(JSON.stringify(this.snapshotPlantillaBolso)) as Bolso[];
    }
    this.snapshotPlantillaBolso = null;
    this.motivoEdicionPlantilla = '';
    this.editandoPlantilla = false;
  }

  resumenEdicionPlantillaLinea(): string {
    const u = this.auth.usuarioActual?.nombre?.trim() || 'Usuario';
    const cuando = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    return `Plantilla · editado por ${u} · ${cuando}`;
  }

  guardarPlantillaTrauma(): void {
    if (!this.puedeEditarPlantilla || this.guardandoPlantilla) return;
    this.guardandoPlantilla = true;
    const ref = this.bolsos.find((b) => b.numero === this.bolsoNumero) ?? this.bolsos[0] ?? bolsoPlantillaOficial(1);
    const ubicTpl = ref.ubicaciones.map((u) => ({
      nombre: u.nombre,
      materiales: u.materiales.map((m) => ({
        nombre: m.nombre,
        cantidadMinima: m.cantidadMinima,
        cantidadOptima: m.cantidadOptima,
      })),
    }));
    /** Catálogo R-1 (3 bolsos idénticos) para uso en todas las nomenclaturas. */
    const plantilla = {
      bolsos: [1, 2, 3].map((numero) => ({
        numero,
        ubicaciones: ubicTpl.map((u) => ({
          nombre: u.nombre,
          materiales: u.materiales.map((m) => ({ ...m })),
        })),
      })),
    };
    (this.checklistsApi as any).guardarPlantilla('TRAUMA', this.unidad, plantilla).subscribe({
      next: (ok : any) => {
        this.guardandoPlantilla = false;
        if (!ok) {
          this.toast.error('No se pudo guardar plantilla de trauma.');
          return;
        }
        this.editandoPlantilla = false;
        const extra = this.motivoEdicionPlantilla.trim();
        this.motivoEdicionPlantilla = '';
        this.toast.exito(extra ? `Plantilla de trauma guardada. Motivo: ${extra}` : 'Plantilla de trauma guardada.');
      },
      error: () => {
        this.guardandoPlantilla = false;
        this.toast.error('No se pudo guardar plantilla de trauma.');
      },
    });
  }

  private parsePlantillaBolsos(raw: unknown): Bolso[] | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const bolsos = (raw as { bolsos?: unknown }).bolsos;
    if (!Array.isArray(bolsos)) return null;
    const out: Bolso[] = [];
    for (const b of bolsos) {
      if (!b || typeof b !== 'object' || Array.isArray(b)) continue;
      const numero = Number((b as { numero?: unknown }).numero ?? 0);
      const ubRaw = (b as { ubicaciones?: unknown }).ubicaciones;
      if (!Number.isFinite(numero) || numero <= 0 || !Array.isArray(ubRaw)) continue;
      const ubicaciones: Ubicacion[] = [];
      for (const u of ubRaw) {
        if (!u || typeof u !== 'object' || Array.isArray(u)) continue;
        const nombre = String((u as { nombre?: unknown }).nombre ?? '').trim();
        const matsRaw = (u as { materiales?: unknown }).materiales;
        const materiales: MaterialItem[] = [];
        if (Array.isArray(matsRaw)) {
          for (const m of matsRaw) {
            if (!m || typeof m !== 'object' || Array.isArray(m)) continue;
            const mn = String((m as { nombre?: unknown }).nombre ?? '').trim();
            if (!mn) continue;
            const min = Number((m as { cantidadMinima?: unknown }).cantidadMinima ?? 0);
            const opt = Number((m as { cantidadOptima?: unknown }).cantidadOptima ?? 0);
            const minInt = Number.isFinite(min) && min >= 0 ? Math.round(min) : 0;
            const optInt = Number.isFinite(opt) && opt >= 0 ? Math.round(opt) : minInt;
            materiales.push({
              id: crypto.randomUUID(),
              nombre: mn,
              cantidadMinima: minInt,
              cantidadOptima: optInt,
              cantidadActual: 0,
            });
          }
        }
        if (!nombre) continue;
        ubicaciones.push({ nombre, materiales });
      }
      out.push({ numero: Math.round(numero), ubicaciones });
    }
    return out;
  }

  async eliminarMaterial(ubicacionIndex: number, materialIndex: number): Promise<void> {
    const ok = await this.confirmDialog.abrir({
      title: 'Eliminar material',
      message: '¿Eliminar este material del bolso?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) {
      return;
    }
    this.bolsoActual.ubicaciones[ubicacionIndex]?.materiales.splice(materialIndex, 1);
    this.toast.exito('Material eliminado.');
  }

  totalMateriales(): number {
    return this.bolsoActual.ubicaciones.reduce((acc, u) => acc + u.materiales.length, 0);
  }

  /** Resumen tipo «conformes / críticos» por compartimiento (según cantidad mínima). */
  materialesConMinimoCubierto(u: Ubicacion): number {
    return u.materiales.filter((m) => m.cantidadActual >= m.cantidadMinima).length;
  }

  materialesBajoMinimo(u: Ubicacion): number {
    return u.materiales.filter((m) => m.cantidadActual < m.cantidadMinima).length;
  }

  totalMaterialesBajoMinimoEsteBolso(): number {
    return this.bolsoActual.ubicaciones.reduce((acc, u) => acc + this.materialesBajoMinimo(u), 0);
  }

  esUbAbierta(ui: number): boolean {
    return this.ubicacionesExpandidas[ui] !== false;
  }

  toggleUbAccordion(ui: number): void {
    this.ubicacionesExpandidas[ui] = !this.esUbAbierta(ui);
  }

  materialesMinimosOk(): number {
    return this.bolsoActual.ubicaciones.reduce(
      (acc, u) => acc + u.materiales.filter((m) => m.cantidadActual >= m.cantidadMinima).length,
      0,
    );
  }

  private totalesTodosLosBolsos(): { total: number; ok: number } {
    const flat = this.bolsos.flatMap((b) => b.ubicaciones.flatMap((u) => u.materiales));
    const total = flat.length;
    const ok = flat.filter((m) => m.cantidadActual >= m.cantidadMinima).length;
    return { total, ok };
  }

  validarBolsoCompleto(): string | null {
    if (this.cuarteleroId === '') {
      return 'Selecciona un voluntario responsable (OBAC).';
    }
    if (!this.nombreInspector.trim()) {
      return 'Indica el nombre del inspector o clave.';
    }
    if (!this.grupoGuardia.trim()) {
      return 'Selecciona el grupo de guardia.';
    }
    if (!this.fechaInspeccion) {
      return 'Indica la fecha de inspección.';
    }
    if (!this.firmaResueltaObac()) {
      return 'La firma del OBAC es obligatoria (firma en pantalla o en el perfil del responsable).';
    }
    if (!this.firmaResueltaInspector()) {
      return 'La firma del inspector es obligatoria.';
    }
    const flat = this.bolsoActual.ubicaciones.flatMap((u) => u.materiales);
    if (flat.length === 0) {
      return 'No hay materiales registrados en el bolso seleccionado.';
    }
    for (const m of flat) {
      if (!m.nombre.trim()) {
        return 'Todo material debe tener nombre indicado.';
      }
      if (m.cantidadActual < m.cantidadMinima) {
        return `Completa todos los materiales del bolso ${this.bolsoNumero}: la cantidad actual debe ser al menos el mínimo.`;
      }
    }
    return null;
  }

  checklistCompletoParaPdf(): boolean {
    return this.validarBolsoCompleto() === null;
  }

  private flash(msg: string): void {
    this.mensajeFlash = msg;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.mensajeFlash = null;
      this.flashTimer = null;
    }, 3800);
  }

  guardarFinal(): void {
    const v = this.validarBolsoCompleto();
    if (v) {
      this.error = v;
      if (v.includes('firma')) {
        this.flash(
          'Debes completar la firma del inspector y la del OBAC (o la firma en el perfil del responsable).',
        );
      }
      return;
    }
    const obacId = this.cuarteleroId;
    if (obacId === '') {
      return;
    }
    const { total, ok } = this.totalesTodosLosBolsos();
    this.error = null;
    this.saving = true;
    this.bolsosApi
      .guardar(this.unidad, {
        cuarteleroId: obacId,
        inspector: this.nombreInspector,
        grupoGuardia: this.grupoGuardia,
        firmaOficial: this.firmaResueltaObac(),
        firmaInspector: this.firmaResueltaInspector(),
        observaciones: this.observaciones,
        totalItems: total,
        itemsOk: ok,
        detalle: {
          bolsos: this.bolsos,
          fechaInspeccion: this.fechaInspeccion,
          bolsoNumero: this.bolsoNumero,
          borrador: false,
        },
      })
      .subscribe({
        next: (reg) => {
          this.saving = false;
          this.controlEdicion.marcarLimpio();
          if (reg?.fecha) this.fechaCierreChecklist = reg.fecha;
          this.toast.exito('Checklist de bolso trauma guardado.');
          void this.router.navigate(['/bolso-trauma']);
        },
        error: () => {
          this.error = 'No se pudo guardar el checklist de bolso trauma.';
          this.toast.error('No se pudo guardar el checklist de bolso trauma.');
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
    const { total, ok } = this.totalesTodosLosBolsos();
    this.error = null;
    this.savingBorrador = true;
    this.bolsosApi
      .guardar(this.unidad, {
        cuarteleroId: obacBorrador,
        inspector: this.nombreInspector,
        grupoGuardia: this.grupoGuardia,
        firmaOficial: this.firmaResueltaObac() || undefined,
        firmaInspector: this.firmaResueltaInspector() || undefined,
        observaciones: this.observaciones,
        totalItems: total,
        itemsOk: ok,
        detalle: {
          bolsos: this.bolsos,
          fechaInspeccion: this.fechaInspeccion,
          bolsoNumero: this.bolsoNumero,
          borrador: true,
        },
      })
      .subscribe({
        next: (reg) => {
          this.savingBorrador = false;
          this.controlEdicion.marcarLimpio();
          if (reg?.fecha) this.fechaCierreChecklist = reg.fecha;
          this.flash('Borrador guardado.');
          this.toast.exito('Borrador de bolso trauma guardado.');
          void this.router.navigate(['/bolso-trauma']);
        },
        error: () => {
          this.error = 'No se pudo guardar el borrador.';
          this.toast.error('No se pudo guardar el borrador.');
          this.savingBorrador = false;
        },
      });
  }

  descargarPdf(): void {
    if (!this.checklistCompletoParaPdf()) {
      this.flash('Completa inspector, fecha, firmas del inspector y OBAC e ítems para generar el PDF.');
      return;
    }
    const responsable = this.usuarios.find((u) => u.id === this.cuarteleroId)?.nombre ?? '';
    const materiales = this.bolsoActual.ubicaciones.flatMap((u) =>
      u.materiales.map((m) => ({
        ubicacion: `${u.nombre} (Bolso ${this.bolsoNumero})`,
        material: m.nombre,
        requerida: m.cantidadMinima,
        actual: m.cantidadActual,
        estado: m.cantidadActual >= m.cantidadMinima ? 'OK' : 'Falta',
      })),
    );
    this.pdf.exportarChecklistUnidad({
      unidad: `${this.unidad} · Bolso ${this.bolsoNumero}`,
      inspector: this.nombreInspector,
      grupoGuardia: this.grupoGuardia,
      responsable,
      firmaInspector: this.firmaResueltaInspector(),
      firmaOficial: this.firmaResueltaObac(),
      fechaRegistro: this.fechaCierreChecklist ?? undefined,
      observaciones: this.observaciones,
      totalItems: this.totalMateriales(),
      itemsOk: this.materialesMinimosOk(),
      materiales,
    });
  }
}
