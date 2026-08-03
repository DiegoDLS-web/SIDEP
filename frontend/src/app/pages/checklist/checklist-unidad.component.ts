import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { AuthService } from '../../services/auth.service';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ToastService } from '../../services/toast.service';
import { BorradorLocalService } from '../../services/borrador-local.service';
import { AutosaveLocal } from '../../utils/autosave-local.helper';
import { CambioEstadoDialogService } from '../../services/cambio-estado-dialog.service';
import { solicitarMotivoCambioEstado } from '../../utils/cambio-estado.util';
import { UsuariosService } from '../../services/usuarios.service';
import { InventariosService } from '../../services/inventarios.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { SignaturePadComponent } from '../../shared/signature-pad.component';
import { firmaEfectiva } from '../../utils/firma-resolver';
import { filtrarUsuariosChecklist } from '../../utils/usuarios-checklist.util';
import { mensajeApiError } from '../../utils/api-error.util';
import { confirmarDescartarCambios } from '../../utils/confirmar-descartar.util';
import { crearControlEdicionPendiente } from '../../utils/edicion-pendiente.util';
import {
  MAX_CANTIDAD_CHECKLIST,
  mensajeCantidadChecklistInvalida,
  normalizarCantidadChecklist,
  reiniciarCantidadesActualesUbicaciones,
} from '../../utils/checklist-cantidad.util';
import type { ComponenteConEdicionPendiente } from '../../guards/edicion-pendiente.guard';
import { registrarEdicionPendienteGlobal } from '../../utils/registrar-edicion-pendiente-global.util';
import { CHECKLIST_UNIDAD_TEMPLATES } from './checklist-unidad.templates';
import { SidEdicionPendienteBannerComponent } from '../../shared/sid-edicion-pendiente-banner.component';
import { SidPlantillaEdicionBannerComponent } from '../../shared/sid-plantilla-edicion-banner.component';
import { nombreListaSoloPersona } from '../usuarios/usuario-registro.constants';
import type { EstadoChecklist } from '../../models/checklist.dto';
import { calcularEstadoChecklist, etiquetaEstadoChecklist } from '../../utils/checklist-estado';
import {
  formatearFechaBorradorLocal,
  manejarErrorGuardadoConBorradorLocal,
} from '../../utils/borrador-local.util';

type Material = {
  id: string;
  materialId?: number;
  inventarioId?: string;
  nombre: string;
  cantidadRequerida: number;
  cantidadActual: number;
};
type Ubicacion = { nombre: string; materiales: Material[] };

@Component({
  selector: 'app-checklist-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent, SidEdicionPendienteBannerComponent, SidPlantillaEdicionBannerComponent],
  templateUrl: './checklist-unidad.component.html',
})
export class ChecklistUnidadComponent implements OnInit, OnDestroy, ComponenteConEdicionPendiente {
  readonly nombreListaSoloPersona = nombreListaSoloPersona;
  readonly etiquetaEstadoChecklist = etiquetaEstadoChecklist;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly auth = inject(AuthService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly toast = inject(ToastService);
  private readonly borradorLocal = inject(BorradorLocalService);
  private readonly cambioEstadoDialog = inject(CambioEstadoDialogService);
  private readonly inventariosApi = inject(InventariosService);
  private autosaveLocal?: AutosaveLocal;

  stockBodega: Record<string, { disponible: number; bodega: string }> = {};

  constructor() {
    const destroyRef = inject(DestroyRef);
    registrarEdicionPendienteGlobal(destroyRef, () => this.tieneEdicionPendiente());
  }

  unidad = 'R-1';
  carroId = '';
  fuenteInventario: 'material_por_carro' | 'plantilla' | 'plantilla_local' = 'plantilla_local';
  nombreCarro: string | null = null;
  loading = true;
  error: string | null = null;
  saving = false;
  savingBorrador = false;

  usuarios: UsuarioListaDto[] = [];
  cuarteleroId: string = '';
  nombreInspector = '';
  grupoGuardia = '';
  observaciones = '';
  filtroMateriales = '';
  soloFaltantes = false;

  fechaCierreChecklist: string | null = null;
  firmaObacValor = '';
  firmaInspectorValor = '';
  estadoChecklistSeleccionado: EstadoChecklist = 'PENDIENTE';
  estadoChecklistUi: EstadoChecklist = 'PENDIENTE';

  ubicaciones: Ubicacion[] = [];
  ubicacionesAbiertas: Record<string, boolean> = {};
  editandoPlantilla = false;
  guardandoPlantilla = false;
  motivoEdicionPlantilla = '';
  private plantillaUbicacionesBackup: Ubicacion[] | null = null;

  mensajeFlash: string | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private nombreOriginalMaterial = new Map<string, string>();
  private registroHistorialId: string | null = null;
  private esRegistroNuevo = true;

  private readonly controlEdicion = crearControlEdicionPendiente(() => ({
    cuarteleroId: this.cuarteleroId,
    nombreInspector: this.nombreInspector,
    grupoGuardia: this.grupoGuardia,
    observaciones: this.observaciones,
    ubicaciones: this.ubicaciones,
    firmaObacValor: this.firmaObacValor,
    firmaInspectorValor: this.firmaInspectorValor,
  }));

  tieneEdicionPendiente(): boolean {
    if (this.loading || this.saving || this.savingBorrador) return false;
    if (this.editandoPlantilla && this.plantillaTieneCambiosSinGuardar()) return true;
    return this.controlEdicion.tieneCambios();
  }

  checklistTieneCambios(): boolean {
    if (this.editandoPlantilla) return this.plantillaTieneCambiosSinGuardar();
    return this.controlEdicion.tieneCambios();
  }

  get puedeEditarEstadoChecklist(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase() ?? '';
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  estadoChecklistSugerido(): EstadoChecklist {
    return calcularEstadoChecklist(this.totalItems(), this.itemsOk(), this.observaciones);
  }

  etiquetaEstadoChecklistSeleccionado(): string {
    return etiquetaEstadoChecklist(this.estadoChecklistSeleccionado);
  }

  ngOnInit(): void {
    this.autosaveLocal = new AutosaveLocal(
      this.borradorLocal,
      'checklist-unidad',
      () => this.unidad,
      () => this.payloadBorradorLocal(),
      { habilitado: () => !this.loading && !this.saving && this.esRegistroNuevo },
    );

    this.unidad = this.route.snapshot.paramMap.get('unidad') ?? 'R-1';
    this.registroHistorialId = this.route.snapshot.queryParamMap.get('registro');
    this.esRegistroNuevo = !this.registroHistorialId;

    const registroHistorial$ = this.registroHistorialId
      ? this.checklistsApi.historialUnidad(this.unidad).pipe(
          map((list) => list.find((r) => String(r.id) === this.registroHistorialId) ?? null),
          catchError(() => of(null)),
        )
      : of(null);

    forkJoin({
      unidadData: this.checklistsApi.obtenerChecklistUnidad(this.unidad).pipe(
        catchError(() =>
          of({
            unidad: this.unidad,
            carro: { id: '', nomenclatura: this.unidad, nombre: `Unidad ${this.unidad}` },
            checklist: null,
          }),
        ),
      ),
      plantillaData: this.checklistsApi.obtenerPlantillaUnidad(this.unidad).pipe(
        catchError(() => of({ ubicaciones: [] })),
      ),
      usuarios: this.usuariosApi.voluntariosParaSelect().pipe(catchError(() => of([] as UsuarioListaDto[]))),
      registroHistorial: registroHistorial$,
    }).subscribe({
      next: ({ unidadData, plantillaData, usuarios, registroHistorial }: any) => {
        this.usuarios = filtrarUsuariosChecklist(usuarios?.length ? usuarios : this.usuariosDesdeSesion());
        const c = unidadData.carro;
        this.carroId = c?.id ? String(c.id) : '';
        this.nombreCarro = c ? (c.nombre?.trim() || c.nomenclatura?.trim() || null) : null;
        const checklist = registroHistorial ?? (this.esRegistroNuevo ? null : unidadData.checklist);
        if (checklist?.cuarteleroId) {
          this.cuarteleroId = String(checklist.cuarteleroId);
        } else if (!this.esRegistroNuevo && this.usuarios.length > 0) {
          this.cuarteleroId = this.usuarios[0].id;
        } else {
          this.cuarteleroId = '';
        }
        const baseTemplate = this.defaultUbicaciones(this.unidad);
        const detalleRaw = (checklist?.detalle as { ubicaciones?: Ubicacion[] } | null)?.ubicaciones;
        const detalleNormalizado =
          this.esRegistroNuevo || !detalleRaw?.length ? [] : this.normalizarDetalle(detalleRaw);

        const plantilla = plantillaData?.ubicaciones?.length
          ? this.normalizarDetalle(
              plantillaData.ubicaciones.map((u: any) => ({
                nombre: u.nombre,
                materiales: u.materiales.map((m: any) => ({
                  id: crypto.randomUUID(),
                  materialId: m.materialId,
                  inventarioId: m.inventarioId,
                  nombre: m.nombre,
                  cantidadRequerida: m.cantidadRequerida,
                  cantidadActual: 0,
                })),
              })),
            )
          : [];

        const resolverUbicaciones = (inventario: Ubicacion[], detalle: Ubicacion[]) => {
          const base = this.resolverUbicacionesIniciales(inventario, plantilla, baseTemplate, detalle);
          return this.esRegistroNuevo ? reiniciarCantidadesActualesUbicaciones(base) : base;
        };

        if (this.carroId) {
          this.checklistsApi.obtenerInventarioChecklistCarro(this.carroId).subscribe({
            next: (inventarioData) => {
              const inventario =
                inventarioData.ubicaciones?.length > 0
                  ? this.normalizarDetalle(
                      inventarioData.ubicaciones.map((u: any) => ({
                        nombre: u.nombre,
                        materiales: (u.materiales ?? []).map((m: any) => ({
                          id: m.inventarioId ?? m.id ?? crypto.randomUUID(),
                          materialId: m.materialId,
                          inventarioId: m.inventarioId ?? m.id,
                          nombre: m.nombre,
                          cantidadRequerida: m.cantidadRequerida,
                          cantidadActual: 0,
                        })),
                      })),
                    )
                  : [];
              this.fuenteInventario =
                inventarioData.fuente === 'material_por_carro'
                  ? 'material_por_carro'
                  : plantilla.length > 0
                    ? 'plantilla'
                    : 'plantilla_local';
              this.ubicaciones = resolverUbicaciones(inventario, detalleNormalizado);
              this.finalizarCarga(checklist);
            },
            error: () => {
              this.fuenteInventario = plantilla.length > 0 ? 'plantilla' : 'plantilla_local';
              this.ubicaciones = resolverUbicaciones([], detalleNormalizado);
              this.finalizarCarga(checklist);
            },
          });
        } else {
          this.fuenteInventario = plantilla.length > 0 ? 'plantilla' : 'plantilla_local';
          this.ubicaciones = resolverUbicaciones([], detalleNormalizado);
          this.finalizarCarga(checklist);
        }
      },
      error: () => {
        this.error = 'No se pudo cargar el checklist de la unidad.';
        this.toast.error('No se pudo cargar el checklist de la unidad.');
        this.loading = false;
      },
    });
  }

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

  get puedeEditarPlantilla(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase() ?? '';
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  activarEdicionPlantilla(): void {
    if (!this.puedeEditarPlantilla) return;
    this.error = null;
    this.motivoEdicionPlantilla = '';
    this.plantillaUbicacionesBackup = this.clonarUbicaciones(this.ubicaciones);
    this.editandoPlantilla = true;
    this.toast.info('Modo edición de plantilla activado. Guarda los cambios con «Guardar plantilla».');
  }

  cancelarEdicionPlantilla(): void {
    void this.intentarCancelarEdicionPlantilla();
  }

  private serializarPlantillaUbicaciones(ubicaciones: Ubicacion[]): string {
    return JSON.stringify(
      ubicaciones.map((u) => ({
        nombre: u.nombre,
        materiales: u.materiales.map((m) => ({
          nombre: m.nombre,
          cantidadRequerida: normalizarCantidadChecklist(m.cantidadRequerida),
          materialId: m.materialId,
        })),
      })),
    );
  }

  private plantillaTieneCambiosSinGuardar(): boolean {
    if (this.plantillaUbicacionesBackup == null) return false;
    return (
      this.serializarPlantillaUbicaciones(this.ubicaciones) !==
      this.serializarPlantillaUbicaciones(this.plantillaUbicacionesBackup)
    );
  }

  async intentarCancelarEdicionPlantilla(): Promise<void> {
    const ok = await confirmarDescartarCambios(this.confirmDialog, this.plantillaTieneCambiosSinGuardar(), {
      title: 'Salir de edición de plantilla',
      message: 'Hay cambios en la plantilla del checklist sin guardar. ¿Deseas descartarlos?',
    });
    if (!ok) return;
    if (this.plantillaUbicacionesBackup != null) {
      this.ubicaciones = this.clonarUbicaciones(this.plantillaUbicacionesBackup);
    }
    this.plantillaUbicacionesBackup = null;
    this.motivoEdicionPlantilla = '';
    this.editandoPlantilla = false;
  }

  resumenEdicionPlantillaLinea(): string {
    const u = this.auth.usuarioActual?.nombre?.trim() || 'Usuario';
    const cuando = new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
    return `Plantilla · editado por ${u} · ${cuando}`;
  }

  private finalizarCarga(checklist: {
    inspector?: string;
    grupoGuardia?: string;
    observaciones?: string;
    firmaOficial?: string;
    firmaInspector?: string;
    fecha?: string;
    estadoChecklist?: EstadoChecklist;
    totalItems?: number | null;
    itemsOk?: number | null;
  } | null): void {
    this.ubicacionesAbiertas = Object.fromEntries(this.ubicaciones.map((u, idx) => [u.nombre, idx < 2]));
    if (this.esRegistroNuevo) {
      this.limpiarCamposRegistroCaptura();
    } else {
      this.nombreInspector = checklist?.inspector ?? '';
      this.grupoGuardia = checklist?.grupoGuardia ?? '';
      this.observaciones = checklist?.observaciones ?? '';
      if (checklist?.firmaOficial?.startsWith('data:image')) {
        this.firmaObacValor = checklist.firmaOficial;
        this.fechaCierreChecklist = checklist.fecha ?? null;
      }
      const fInsp = checklist?.firmaInspector?.trim();
      if (fInsp?.startsWith('data:image')) {
        this.firmaInspectorValor = fInsp;
      }
      this.estadoChecklistSeleccionado =
        checklist?.estadoChecklist ??
        calcularEstadoChecklist(
          checklist?.totalItems ?? this.totalItems(),
          checklist?.itemsOk ?? this.itemsOk(),
          checklist?.observaciones ?? null,
        );
      this.estadoChecklistUi = this.estadoChecklistSeleccionado;
    }
    this.controlEdicion.marcarLimpio();
    this.loading = false;
    this.cargarStockBodegaChecklist();
    void this.ofrecerRestaurarBorradorLocal();
  }

  private cargarStockBodegaChecklist(): void {
    const nombres = [
      ...new Set(
        this.ubicaciones.flatMap((u) => u.materiales.map((m) => m.nombre.trim()).filter(Boolean)),
      ),
    ].slice(0, 80);
    if (!nombres.length) {
      this.stockBodega = {};
      return;
    }
    this.inventariosApi.stockPorNombres(nombres).subscribe({
      next: (mapa) => {
        this.stockBodega = Object.fromEntries(
          Object.entries(mapa).map(([k, v]) => [k, { disponible: v.disponible, bodega: v.bodega }]),
        );
      },
      error: () => {
        this.stockBodega = {};
      },
    });
  }

  stockBodegaMaterial(nombre: string): { disponible: number; bodega: string } | null {
    const key = nombre.trim();
    if (!key) return null;
    return this.stockBodega[key] ?? null;
  }

  private limpiarCamposRegistroCaptura(): void {
    this.nombreInspector = '';
    this.grupoGuardia = '';
    this.observaciones = '';
    this.cuarteleroId = '';
    this.firmaObacValor = '';
    this.firmaInspectorValor = '';
    this.fechaCierreChecklist = null;
    this.estadoChecklistSeleccionado = calcularEstadoChecklist(this.totalItems(), this.itemsOk(), '');
    this.estadoChecklistUi = this.estadoChecklistSeleccionado;
  }

  private payloadBorradorLocal() {
    return {
      cuarteleroId: this.cuarteleroId,
      nombreInspector: this.nombreInspector,
      grupoGuardia: this.grupoGuardia,
      observaciones: this.observaciones,
      ubicaciones: this.ubicaciones,
      firmaObacValor: this.firmaObacValor,
      firmaInspectorValor: this.firmaInspectorValor,
      estadoChecklistSeleccionado: this.estadoChecklistSeleccionado,
    };
  }

  ngOnDestroy(): void {
    this.autosaveLocal?.destruir();
  }

  programarAutosaveLocal(): void {
    this.autosaveLocal?.programar();
  }

  private async ofrecerRestaurarBorradorLocal(): Promise<void> {
    const saved = this.borradorLocal.obtener<ReturnType<ChecklistUnidadComponent['payloadBorradorLocal']>>(
      'checklist-unidad',
      this.unidad,
    );
    if (!saved) return;
    const ok = await this.confirmDialog.abrir({
      title: 'Borrador sin conexión',
      message: `Hay un borrador guardado en este dispositivo (${formatearFechaBorradorLocal(saved.meta.guardadoEn)}). ¿Restaurarlo?`,
      confirmText: 'Restaurar',
      cancelText: 'Descartar',
    });
    if (!ok) {
      this.borradorLocal.eliminar('checklist-unidad', this.unidad);
      return;
    }
    const p = saved.payload;
    this.cuarteleroId = p.cuarteleroId ?? this.cuarteleroId;
    this.nombreInspector = p.nombreInspector ?? '';
    this.grupoGuardia = p.grupoGuardia ?? '';
    this.observaciones = p.observaciones ?? '';
    this.ubicaciones = p.ubicaciones ?? this.ubicaciones;
    this.firmaObacValor = p.firmaObacValor ?? '';
    this.firmaInspectorValor = p.firmaInspectorValor ?? '';
    this.estadoChecklistSeleccionado = p.estadoChecklistSeleccionado ?? this.estadoChecklistSeleccionado;
    this.toast.exito('Borrador local restaurado. Recuerda sincronizarlo con el servidor.');
    this.controlEdicion.marcarLimpio();
  }

  async cambiarEstadoChecklistSeleccionado(nuevo: EstadoChecklist): Promise<void> {
    const anterior = this.estadoChecklistSeleccionado;
    if (nuevo === anterior) {
      this.estadoChecklistUi = anterior;
      return;
    }
    const confirmacion = await solicitarMotivoCambioEstado(this.cambioEstadoDialog, {
      title: 'Cambiar estado del checklist',
      message: `Unidad ${this.unidad}. El cambio manual queda registrado.`,
      estadoAnterior: etiquetaEstadoChecklist(anterior),
      estadoNuevo: etiquetaEstadoChecklist(nuevo),
    });
    if (!confirmacion) {
      this.estadoChecklistUi = anterior;
      return;
    }
    this.estadoChecklistSeleccionado = nuevo;
    this.estadoChecklistUi = nuevo;
  }

  private resolverUbicacionesIniciales(
    inventario: Ubicacion[],
    plantilla: Ubicacion[],
    base: Ubicacion[],
    detalle: Ubicacion[],
  ): Ubicacion[] {
    if (inventario.length > 0) {
      return this.mezclarConBase(inventario, [], detalle);
    }
    let resultado = this.clonarUbicaciones(base);
    if (plantilla.length > 0) {
      resultado = this.mezclarConBase(resultado, plantilla, []);
    }
    if (detalle.length > 0) {
      resultado = this.mezclarConBase(resultado, [], detalle);
    }
    return resultado;
  }

  etiquetaFuenteInventario(): string {
    if (this.fuenteInventario === 'material_por_carro') {
      return 'Cantidades objetivo desde inventario (material_por_carro)';
    }
    if (this.fuenteInventario === 'plantilla') {
      return 'Cantidades desde plantilla guardada (sincroniza inventario al editar plantilla)';
    }
    return 'Cantidades desde plantilla local (sin inventario en BD)';
  }

  private normalizarDetalle(detalle: Ubicacion[]): Ubicacion[] {
    return detalle.map((u) => ({
      nombre: u.nombre,
      materiales: (u.materiales ?? []).map((m) => ({
        id: m.id || crypto.randomUUID(),
        materialId: m.materialId,
        inventarioId: m.inventarioId,
        nombre: m.nombre,
        cantidadRequerida: m.cantidadRequerida,
        cantidadActual: m.cantidadActual,
      })),
    }));
  }

  private keyNombre(value: string): string {
    return value.trim().toLowerCase();
  }

  private clonarUbicaciones(src: Ubicacion[]): Ubicacion[] {
    return src.map((u) => ({
      nombre: u.nombre,
      materiales: u.materiales.map((m) => ({ ...m })),
    }));
  }

  private mezclarConBase(base: Ubicacion[], plantilla: Ubicacion[], detalle: Ubicacion[]): Ubicacion[] {
    const aplicar = (semilla: Ubicacion[], sobreescritura: Ubicacion[]): Ubicacion[] => {
      const resultado = this.clonarUbicaciones(semilla);
      const idxUbic = new Map(resultado.map((u, i) => [this.keyNombre(u.nombre), i]));

      for (const ub of sobreescritura) {
        const keyUb = this.keyNombre(ub.nombre);
        const idx = idxUbic.get(keyUb);
        if (idx === undefined) {
          resultado.push({
            nombre: ub.nombre,
            materiales: ub.materiales.map((m) => ({
              id: m.id || crypto.randomUUID(),
              nombre: m.nombre,
              cantidadRequerida: Math.max(0, Number(m.cantidadRequerida ?? 0)),
              cantidadActual: Math.max(0, Number(m.cantidadActual ?? 0)),
            })),
          });
          idxUbic.set(keyUb, resultado.length - 1);
          continue;
        }

        const baseUb = resultado[idx];
        const idxMat = new Map(baseUb.materiales.map((m, i) => [this.keyNombre(m.nombre), i]));
        for (const mat of ub.materiales) {
          const keyMat = this.keyNombre(mat.nombre);
          const matIdx = idxMat.get(keyMat);
          const cantReq = Math.max(0, Number(mat.cantidadRequerida ?? 0));
          const cantAct = Math.max(0, Number(mat.cantidadActual ?? 0));
          if (matIdx === undefined) {
            baseUb.materiales.push({
              id: mat.id || crypto.randomUUID(),
              materialId: mat.materialId,
              inventarioId: mat.inventarioId,
              nombre: mat.nombre,
              cantidadRequerida: cantReq,
              cantidadActual: cantAct,
            });
            idxMat.set(keyMat, baseUb.materiales.length - 1);
          } else {
            const baseMat = baseUb.materiales[matIdx];
            baseUb.materiales[matIdx] = {
              ...baseMat,
              materialId: mat.materialId ?? baseMat.materialId,
              inventarioId: mat.inventarioId ?? baseMat.inventarioId,
              nombre: mat.nombre || baseMat.nombre,
              cantidadRequerida: cantReq || baseMat.cantidadRequerida,
              cantidadActual: cantAct,
            };
          }
        }
      }
      return resultado;
    };

    let resultado = this.clonarUbicaciones(base);
    if (plantilla.length > 0) resultado = aplicar(resultado, plantilla);
    if (detalle.length > 0) resultado = aplicar(resultado, detalle);
    return resultado;
  }

  defaultUbicaciones(unidad: string): Ubicacion[] {
    const base = CHECKLIST_UNIDAD_TEMPLATES[unidad] ?? CHECKLIST_UNIDAD_TEMPLATES['R-1'];
    return base.map((ubicacion) => ({
      nombre: ubicacion.nombre,
      materiales: ubicacion.materiales.map((material) => ({
        id: crypto.randomUUID(),
        nombre: material.nombre,
        cantidadRequerida: material.cantidadRequerida,
        cantidadActual: 0,
      })),
    }));
  }

  materialOk(m: Material): boolean {
    return m.nombre.trim().length > 0 && m.cantidadActual >= m.cantidadRequerida;
  }

  estadoMaterial(m: Material): 'CRITICO' | 'MINIMO' | 'OPTIMO' {
    if (m.cantidadActual <= 0) return 'CRITICO';
    if (m.cantidadActual >= m.cantidadRequerida) return 'OPTIMO';
    return 'MINIMO';
  }

  etiquetaEstadoMaterial(m: Material): string {
    const e = this.estadoMaterial(m);
    if (e === 'OPTIMO') return 'Óptimo';
    if (e === 'MINIMO') return 'Mínimo';
    return 'Crítico';
  }

  esPendiente(m: Material): boolean {
    return this.estadoMaterial(m) !== 'OPTIMO';
  }

  toggleUbicacion(nombre: string): void {
    this.ubicacionesAbiertas[nombre] = !this.ubicacionesAbiertas[nombre];
  }

  ubicacionAbierta(nombre: string): boolean {
    return this.ubicacionesAbiertas[nombre] ?? false;
  }

  materialesVisibles(ubicacion: Ubicacion): Material[] {
    const filtro = this.filtroMateriales.trim().toLowerCase();
    return ubicacion.materiales.filter((material) => {
      const coincideTexto =
        !filtro ||
        material.nombre.toLowerCase().includes(filtro) ||
        ubicacion.nombre.toLowerCase().includes(filtro);
      const coincideEstado = !this.soloFaltantes || this.esPendiente(material);
      return coincideTexto && coincideEstado;
    });
  }

  faltantesPorUbicacion(ubicacion: Ubicacion): number {
    return ubicacion.materiales.filter((material) => !this.materialOk(material)).length;
  }

  fechasFormateadaCabecera(): string {
    if (!this.fechaCierreChecklist) return '—';
    const d = new Date(this.fechaCierreChecklist);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL');
  }

  tituloChecklist(): string {
    const n = (this.nombreCarro ?? '').trim();
    if (!n || n === this.unidad) return this.unidad;
    return `${this.unidad} · ${n}`;
  }

  nombreObacSeleccionado(): string {
    if (this.cuarteleroId === '') return '—';
    const u = this.usuarios.find((x) => x.id === this.cuarteleroId);
    return u?.nombre?.trim() || '—';
  }

  onFirmaObacChange(valor: string): void {
    this.firmaObacValor = valor;
    if (valor.startsWith('data:image')) {
      this.fechaCierreChecklist = new Date().toISOString();
    } else if (!this.firmaPerfilCuartelero()) {
      this.fechaCierreChecklist = null;
    }
  }

  onFirmaInspectorChange(valor: string): void {
    this.firmaInspectorValor = valor;
  }

  private firmaPerfilCuartelero(): string {
    if (this.cuarteleroId === '') {
      return '';
    }
    const u = this.usuarios.find((x) => x.id === this.cuarteleroId);
    return u?.firmaImagen?.trim() ?? '';
  }

  firmaObacDibujada(): boolean {
    return this.firmaObacValor.trim().startsWith('data:image');
  }

  firmaResueltaObac(): string {
    return firmaEfectiva(this.firmaObacValor, this.firmaPerfilCuartelero());
  }

  firmaResueltaInspector(): string {
    return this.firmaInspectorValor.trim();
  }

  onCantidadActualChange(material: Material, valor: unknown): void {
    material.cantidadActual = normalizarCantidadChecklist(valor);
  }

  onCantidadRequeridaChange(material: Material, valor: unknown): void {
    material.cantidadRequerida = normalizarCantidadChecklist(valor);
  }

  private validarCantidadesMateriales(materiales: Material[]): string | null {
    for (const m of materiales) {
      if (!m.nombre.trim()) {
        return 'Todo material debe tener nombre indicado.';
      }
      const actual = mensajeCantidadChecklistInvalida(m.cantidadActual);
      if (actual) return actual;
      const req = mensajeCantidadChecklistInvalida(m.cantidadRequerida);
      if (req) return req;
    }
    return null;
  }

  validarChecklistCompleto(): string | null {
    if (this.cuarteleroId === '') {
      return 'Selecciona un oficial responsable (OBAC).';
    }
    if (!this.nombreInspector.trim()) {
      return 'Indica el nombre del inspector o clave.';
    }
    if (!this.grupoGuardia.trim()) {
      return 'Selecciona el grupo de guardia.';
    }
    const materiales = this.ubicaciones.flatMap((u) => u.materiales);
    if (materiales.length === 0) {
      return 'No hay materiales en el checklist.';
    }
    const cantidades = this.validarCantidadesMateriales(materiales);
    if (cantidades) return cantidades;
    if (!this.firmaResueltaObac()) {
      return 'La firma del OBAC es obligatoria (dibújala o usa la firma del perfil del responsable).';
    }
    if (!this.firmaResueltaInspector()) {
      return 'La firma del inspector es obligatoria (área «Firma del inspector»).';
    }
    return null;
  }

  checklistCompletoParaPdf(): boolean {
    return this.validarChecklistCompleto() === null;
  }

  private flash(msg: string): void {
    this.mensajeFlash = msg;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.mensajeFlash = null;
      this.flashTimer = null;
    }, 3200);
  }

  agregarMaterial(ubicacionIdx: number): void {
    if (!this.editandoPlantilla) return;
    this.ubicaciones[ubicacionIdx]?.materiales.push({
      id: crypto.randomUUID(),
      nombre: '',
      cantidadRequerida: 1,
      cantidadActual: 0,
    });
    this.toast.info('Fila de material agregada. Completa nombre y cantidades.');
  }

  async eliminarMaterial(ubicacionIdx: number, materialIdx: number): Promise<void> {
    if (!this.editandoPlantilla) return;
    const ok = await this.confirmDialog.abrir({
      title: 'Eliminar material',
      message: '¿Seguro que deseas eliminar este material del checklist? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    this.ubicaciones[ubicacionIdx]?.materiales.splice(materialIdx, 1);
    this.toast.exito('Material eliminado del checklist.');
  }

  registrarNombreOriginal(material: Material): void {
    this.nombreOriginalMaterial.set(material.id, material.nombre ?? '');
  }

  async confirmarCambioNombre(material: Material): Promise<void> {
    const original = this.nombreOriginalMaterial.get(material.id) ?? '';
    const actual = material.nombre ?? '';
    if (original.trim() === actual.trim()) {
      return;
    }
    if (!original.trim()) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      title: 'Confirmar cambio',
      message: `Vas a cambiar el nombre del material "${original}" por "${actual || '(vacío)'}".`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
    });
    if (!ok) {
      material.nombre = original;
      this.toast.info('Se mantuvo el nombre original del material.');
      return;
    }
    this.nombreOriginalMaterial.set(material.id, actual);
  }

  totalItems(): number {
    return this.ubicaciones.reduce((acc, u) => acc + u.materiales.length, 0);
  }

  itemsOk(): number {
    return this.ubicaciones.reduce(
      (acc, u) => acc + u.materiales.filter((m) => this.materialOk(m)).length,
      0,
    );
  }

  itemsBajo(): number {
    return this.ubicaciones.reduce(
      (acc, u) => acc + u.materiales.filter((m) => this.estadoMaterial(m) === 'MINIMO').length,
      0,
    );
  }

  itemsCriticos(): number {
    return this.ubicaciones.reduce(
      (acc, u) => acc + u.materiales.filter((m) => this.estadoMaterial(m) === 'CRITICO').length,
      0,
    );
  }

  porcentajeCompletado(): number {
    const total = this.totalItems();
    if (!total) return 0;
    return Math.round((this.itemsOk() / total) * 100);
  }

  estadoUnidadSemaforo(): 'VERDE' | 'AMARILLO' | 'ROJO' {
    if (this.itemsCriticos() > 0) return 'ROJO';
    if (this.totalItems() - this.itemsOk() > 0) return 'AMARILLO';
    return 'VERDE';
  }

  claseSemaforoUnidad(): string {
    const estado = this.estadoUnidadSemaforo();
    if (estado === 'VERDE') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (estado === 'AMARILLO') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-red-500/20 text-red-300 border-red-500/40';
  }

  etiquetaSemaforoUnidad(): string {
    const estado = this.estadoUnidadSemaforo();
    if (estado === 'VERDE') return 'Unidad operativa';
    if (estado === 'AMARILLO') return 'Unidad en observación';
    return 'Unidad crítica';
  }

  estadoFinalCarroOperativo(): boolean {
    return this.totalItems() <= 0 || this.itemsOk() >= this.totalItems();
  }

  estadoFinalCarroTexto(): string {
    return this.estadoFinalCarroOperativo() ? 'Operativo' : 'No operativo';
  }

  claseEstadoFinalCarro(): string {
    return this.estadoFinalCarroOperativo()
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
      : 'border-red-500/40 bg-red-500/15 text-red-200';
  }

  claseBadgeEstadoMaterial(m: Material): string {
    const estado = this.estadoMaterial(m);
    if (estado === 'OPTIMO') return 'border-sky-500/50 bg-sky-500/20 text-sky-100';
    if (estado === 'MINIMO') return 'border-emerald-500/50 bg-emerald-500/20 text-emerald-100';
    return 'border-red-500/50 bg-red-500/20 text-red-100';
  }

  marcarOk(m: Material): void {
    m.cantidadActual = Math.max(0, m.cantidadRequerida);
  }

  faltaUno(m: Material): void {
    m.cantidadActual = Math.max(0, m.cantidadRequerida - 1);
  }

  sinStock(m: Material): void {
    m.cantidadActual = 0;
  }

  private validarCamposBaseCierre(): string | null {
    if (this.cuarteleroId === '') {
      return 'Selecciona un oficial responsable (OBAC).';
    }
    if (!this.nombreInspector.trim()) {
      return 'Indica el nombre del inspector o clave.';
    }
    if (!this.grupoGuardia.trim()) {
      return 'Selecciona el grupo de guardia.';
    }
    const materiales = this.ubicaciones.flatMap((u) => u.materiales);
    if (materiales.length === 0) {
      return 'No hay materiales en el checklist.';
    }
    if (!this.firmaResueltaObac()) {
      return 'La firma del OBAC es obligatoria (dibújala o usa la firma del perfil del responsable).';
    }
    if (!this.firmaResueltaInspector()) {
      return 'La firma del inspector es obligatoria (área «Firma del inspector»).';
    }
    return null;
  }

  async guardar(): Promise<void> {
    const v = this.validarCamposBaseCierre();
    if (v) {
      this.error = v;
      if (v.includes('firma')) {
        this.flash('Debes firmar en el área OBAC o tener firma en el perfil del responsable.');
      }
      return;
    }
    const faltantes = this.totalItems() - this.itemsOk();
    const criticos = this.itemsCriticos();
    const resumen = [
      `Resumen de cierre ${this.unidad}:`,
      `- Completado: ${this.porcentajeCompletado()}%`,
      `- Faltantes: ${faltantes}`,
      `- Críticos: ${criticos}`,
      `- Última revisión: ${this.fechasFormateadaCabecera()}`,
    ].join('\n');
    const confirmTexto =
      criticos > 0
        ? `${resumen}\n\nHay faltantes críticos. ¿Confirmas guardar igualmente?`
        : `${resumen}\n\n¿Confirmas guardar checklist?`;
    const ok = await this.confirmDialog.abrir({
      title: 'Cerrar checklist',
      message: confirmTexto,
      confirmText: 'Guardar',
      cancelText: 'Cancelar',
    });
    if (!ok) {
      return;
    }
    const firma = this.firmaResueltaObac();
    const firmaInspector = this.firmaResueltaInspector();
    const obacId = this.cuarteleroId;
    if (obacId === '') {
      return;
    }
    this.error = null;
    this.saving = true;
    const syncBody: Record<string, unknown> = {
      cuarteleroId: obacId,
      inspector: this.nombreInspector,
      grupoGuardia: this.grupoGuardia,
      firmaOficial: firma,
      firmaInspector,
      observaciones: this.observaciones,
      totalItems: this.totalItems(),
      itemsOk: this.itemsOk(),
      estadoChecklist: this.estadoChecklistSeleccionado,
      detalle: {
        ubicaciones: this.ubicaciones,
        borrador: false,
        estadoChecklist: this.estadoChecklistSeleccionado,
      },
    };
    this.checklistsApi.guardarChecklistUnidad(this.unidad, syncBody).subscribe({
        next: () => {
          this.borradorLocal.eliminar('checklist-unidad', this.unidad);
          this.saving = false;
          this.controlEdicion.marcarLimpio();
          const estado =
            this.itemsCriticos() > 0
              ? 'Unidad marcada como NO operativa (faltantes críticos).'
              : this.itemsOk() < this.totalItems()
                ? 'Unidad en observación por inventario incompleto.'
                : 'Unidad marcada como operativa.';
          this.toast.exito(`Checklist de unidad guardado. ${estado}`);
          void this.router.navigate(['/checklist']);
        },
        error: (err) => {
          if (
            manejarErrorGuardadoConBorradorLocal(
              this.borradorLocal,
              this.toast,
              'checklist-unidad',
              this.unidad,
              this.payloadBorradorLocal(),
              err,
              {
                mensajeError: 'No se pudo guardar checklist.',
                syncRequest: { kind: 'checklist-unidad', unidad: this.unidad, body: syncBody },
                onGuardadoLocal: () => {
                  this.controlEdicion.marcarLimpio();
                },
              },
            )
          ) {
            this.error = null;
          } else {
            this.error = mensajeApiError(err, 'No se pudo guardar checklist.');
          }
          this.saving = false;
        },
      });
  }

  guardarBorrador(): void {
    if (this.cuarteleroId === '') {
      this.error = 'Selecciona un oficial responsable (OBAC) para asociar el borrador.';
      return;
    }
    const obacBorrador = this.cuarteleroId;
    this.error = null;
    this.savingBorrador = true;
    const firma = this.firmaResueltaObac();
    const firmaInspector = this.firmaResueltaInspector() || null;
    const syncBody: Record<string, unknown> = {
      cuarteleroId: obacBorrador,
      inspector: this.nombreInspector,
      grupoGuardia: this.grupoGuardia,
      firmaOficial: firma || null,
      firmaInspector,
      observaciones: this.observaciones,
      totalItems: this.totalItems(),
      itemsOk: this.itemsOk(),
      detalle: { ubicaciones: this.ubicaciones, borrador: true },
    };
    this.checklistsApi.guardarChecklistUnidad(this.unidad, syncBody).subscribe({
        next: (reg: any) => {
          this.borradorLocal.eliminar('checklist-unidad', this.unidad);
          this.savingBorrador = false;
          this.controlEdicion.marcarLimpio();
          if (reg.fecha) {
            this.fechaCierreChecklist = reg.fecha;
          }
          this.flash('Borrador guardado. Puedes continuar editando o completar firma y guardar el checklist.');
          this.toast.exito('Borrador del checklist guardado.');
          void this.router.navigate(['/checklist']);
        },
        error: (err) => {
          if (
            manejarErrorGuardadoConBorradorLocal(
              this.borradorLocal,
              this.toast,
              'checklist-unidad',
              this.unidad,
              this.payloadBorradorLocal(),
              err,
              {
                mensajeError: 'No se pudo guardar el borrador.',
                syncRequest: { kind: 'checklist-unidad', unidad: this.unidad, body: syncBody },
                onGuardadoLocal: () => {
                  this.controlEdicion.marcarLimpio();
                },
              },
            )
          ) {
            this.error = null;
          } else {
            this.error = 'No se pudo guardar el borrador.';
          }
          this.savingBorrador = false;
        },
      });
  }

  guardarPlantillaUnidad(): void {
    if (!this.puedeEditarPlantilla || this.guardandoPlantilla) {
      if (!this.puedeEditarPlantilla) this.toast.error('No tienes permisos para editar plantilla.');
      return;
    }
    const ubicaciones = this.ubicaciones
      .map((u) => ({
        nombre: String(u.nombre ?? '').trim(),
        materiales: u.materiales
          .map((m) => ({
            nombre: String(m.nombre ?? '').trim(),
            cantidadRequerida: Math.max(0, Math.round(Number(m.cantidadRequerida ?? 0))),
            materialId: m.materialId,
          }))
          .filter((m) => m.nombre.length > 0),
      }))
      .filter((u) => u.nombre.length > 0 && u.materiales.length > 0);
    if (ubicaciones.length === 0) {
      this.toast.error('La plantilla debe tener compartimientos y materiales.');
      return;
    }
    this.guardandoPlantilla = true;
    this.checklistsApi.guardarPlantillaUnidad(this.unidad, { ubicaciones }).subscribe({
      next: () => {
        this.guardandoPlantilla = false;
        this.editandoPlantilla = false;
        this.plantillaUbicacionesBackup = null;
        const extra = this.motivoEdicionPlantilla.trim();
        this.motivoEdicionPlantilla = '';
        this.controlEdicion.marcarLimpio();
        this.toast.exito(
          extra ? `Plantilla guardada. Motivo: ${extra}` : 'Plantilla guardada correctamente.',
        );
      },
      error: () => {
        this.guardandoPlantilla = false;
        this.toast.error('No se pudo guardar la plantilla.');
      },
    });
  }

  descargarPdf(): void {
    if (!this.checklistCompletoParaPdf()) {
      this.flash('Termina el checklist (materiales OK, firma inspector y firma OBAC) para generar el PDF.');
      return;
    }
    const responsable = this.usuarios.find((u) => u.id === this.cuarteleroId)?.nombre ?? '';
    const materiales = this.ubicaciones.flatMap((u) =>
      u.materiales.map((m) => ({
        ubicacion: u.nombre,
        material: m.nombre || '—',
        requerida: m.cantidadRequerida,
        actual: m.cantidadActual,
        estado: this.materialOk(m) ? 'OK' : 'Falta',
      })),
    );

    this.pdfExport.exportarChecklistUnidad({
      unidad: this.unidad,
      inspector: this.nombreInspector,
      grupoGuardia: this.grupoGuardia,
      responsable,
      firmaInspector: this.firmaResueltaInspector(),
      firmaOficial: this.firmaResueltaObac(),
      fechaRegistro: this.fechaCierreChecklist ?? undefined,
      observaciones: this.observaciones,
      totalItems: this.totalItems(),
      itemsOk: this.itemsOk(),
      materiales,
    });
  }
}