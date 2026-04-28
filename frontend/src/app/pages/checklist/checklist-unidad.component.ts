import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { AuthService } from '../../services/auth.service';
import { ChecklistsService } from '../../services/checklists.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { firmaEfectiva } from '../../utils/firma-resolver';
import { CHECKLIST_UNIDAD_TEMPLATES } from './checklist-unidad.templates';

type Material = {
  id: string;
  nombre: string;
  cantidadRequerida: number;
  cantidadActual: number;
};
type Ubicacion = { nombre: string; materiales: Material[] };

@Component({
  selector: 'app-checklist-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './checklist-unidad.component.html',
})
export class ChecklistUnidadComponent implements OnInit {
  @ViewChild('firmaCanvas') firmaCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly auth = inject(AuthService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly toast = inject(ToastService);

  unidad = 'R-1';
  /** Nombre comercial del carro (cabecera / barra móvil). */
  nombreCarro: string | null = null;
  loading = true;
  error: string | null = null;
  saving = false;
  savingBorrador = false;

  usuarios: UsuarioListaDto[] = [];
  cuarteleroId: number | '' = '';
  nombreInspector = '';
  grupoGuardia = '';
  observaciones = '';
  filtroMateriales = '';
  soloFaltantes = false;

  /** ISO fecha legible en cabecera (reemplaza el campo texto “firma”) */
  fechaCierreChecklist: string | null = null;
  private firmaInicialServidor: string | null = null;

  ubicaciones: Ubicacion[] = [];
  ubicacionesAbiertas: Record<string, boolean> = {};

  mensajeFlash: string | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  private ctx: CanvasRenderingContext2D | null = null;
  private dibujandoFirma = false;
  private ultimoX = 0;
  private ultimoY = 0;
  private firmaCanvasInicializado = false;
  private nombreOriginalMaterial = new Map<string, string>();

  ngOnInit(): void {
    this.unidad = this.route.snapshot.paramMap.get('unidad') ?? 'R-1';
    forkJoin({
      unidadData: this.checklistsApi.obtenerChecklistUnidad(this.unidad),
      plantillaData: this.checklistsApi.obtenerPlantillaUnidad(this.unidad),
      usuarios: this.usuariosApi.listar(),
    }).subscribe({
      next: ({ unidadData, plantillaData, usuarios }) => {
        this.usuarios = usuarios;
        const c = unidadData.carro;
        this.nombreCarro = c ? (c.nombre?.trim() || c.nomenclatura?.trim() || null) : null;
        const checklist = unidadData.checklist;
        if (checklist?.cuarteleroId) {
          this.cuarteleroId = checklist.cuarteleroId;
        } else if (usuarios.length > 0) {
          this.cuarteleroId = usuarios[0].id;
        }
        const baseTemplate = this.defaultUbicaciones(this.unidad);
        const detalle = (checklist?.detalle as { ubicaciones?: Ubicacion[] } | null)?.ubicaciones;
        const plantilla = plantillaData?.ubicaciones?.length
          ? this.normalizarDetalle(
              plantillaData.ubicaciones.map((u) => ({
                nombre: u.nombre,
                materiales: u.materiales.map((m) => ({
                  id: crypto.randomUUID(),
                  nombre: m.nombre,
                  cantidadRequerida: m.cantidadRequerida,
                  cantidadActual: 0,
                })),
              })),
            )
          : [];
        const detalleNormalizado = detalle?.length ? this.normalizarDetalle(detalle) : [];
        this.ubicaciones = this.mezclarConBase(baseTemplate, plantilla, detalleNormalizado);
        this.ubicacionesAbiertas = Object.fromEntries(this.ubicaciones.map((u, idx) => [u.nombre, idx < 2]));
        this.nombreInspector = checklist?.inspector ?? '';
        this.grupoGuardia = checklist?.grupoGuardia ?? '';
        this.observaciones = checklist?.observaciones ?? '';
        if (checklist?.firmaOficial) {
          this.firmaInicialServidor = checklist.firmaOficial;
          this.fechaCierreChecklist = checklist.fecha;
        }
        this.loading = false;
        setTimeout(() => {
          this.inicializarCanvasFirma();
          this.restaurarFirmaDesdeServidor(this.firmaInicialServidor);
        }, 0);
      },
      error: () => {
        this.error = 'No se pudo cargar el checklist de la unidad.';
        this.toast.error('No se pudo cargar el checklist de la unidad.');
        this.loading = false;
      },
    });
  }

  get puedeEditarPlantilla(): boolean {
    const rol = this.auth.usuarioActual?.rol?.toUpperCase() ?? '';
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
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

  private normalizarDetalle(detalle: Ubicacion[]): Ubicacion[] {
    return detalle.map((u) => ({
      nombre: u.nombre,
      materiales: (u.materiales ?? []).map((m) => ({
        id: m.id || crypto.randomUUID(),
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

  /**
   * Conserva SIEMPRE la base de compartimientos por unidad y superpone plantilla/detalle encima.
   * Evita que checklists viejos con solo "Cabina" oculten el inventario completo.
   */
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
              nombre: mat.nombre,
              cantidadRequerida: cantReq,
              cantidadActual: cantAct,
            });
            idxMat.set(keyMat, baseUb.materiales.length - 1);
          } else {
            const baseMat = baseUb.materiales[matIdx];
            baseUb.materiales[matIdx] = {
              ...baseMat,
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

  private mapPointer(clientX: number, clientY: number): [number, number] {
    const canvas = this.firmaCanvas?.nativeElement;
    if (!canvas) return [0, 0];
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    return [(clientX - r.left) * sx, (clientY - r.top) * sy];
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

  estadoMaterial(m: Material): 'OK' | 'BAJO' | 'CRITICO' {
    if (m.cantidadActual >= m.cantidadRequerida) return 'OK';
    if (m.cantidadActual <= 0) return 'CRITICO';
    return 'BAJO';
  }

  esPendiente(m: Material): boolean {
    return this.estadoMaterial(m) !== 'OK';
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

  /** vuelve a pintar la firma guardada si existe */
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

  /** Canvas del formulario o firma cargada en el perfil del OBAC. */
  firmaResueltaObac(): string {
    return firmaEfectiva(this.obtenerDataUrlFirma(), this.firmaPerfilCuartelero());
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
    if (!materiales.every((m) => this.materialOk(m))) {
      return 'Completa todos los materiales (nombre y cantidad actual mayor o igual a la requerida).';
    }
    if (!this.firmaResueltaObac()) {
      return 'La firma del OBAC es obligatoria (dibújala o usa la firma del perfil del responsable).';
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
    this.ubicaciones[ubicacionIdx]?.materiales.push({
      id: crypto.randomUUID(),
      nombre: '',
      cantidadRequerida: 1,
      cantidadActual: 0,
    });
    this.toast.info('Fila de material agregada. Completa nombre y cantidades.');
  }

  eliminarMaterial(ubicacionIdx: number, materialIdx: number): void {
    if (!window.confirm('¿Seguro que deseas eliminar este material del checklist? Esta acción no se puede deshacer.')) return;
    this.ubicaciones[ubicacionIdx]?.materiales.splice(materialIdx, 1);
    this.toast.exito('Material eliminado del checklist.');
  }

  registrarNombreOriginal(material: Material): void {
    this.nombreOriginalMaterial.set(material.id, material.nombre ?? '');
  }

  confirmarCambioNombre(material: Material): void {
    const original = this.nombreOriginalMaterial.get(material.id) ?? '';
    const actual = material.nombre ?? '';
    if (original.trim() === actual.trim()) {
      return;
    }
    if (!original.trim()) {
      // Si estaba vacío, no forzamos confirmación de primera carga/escritura.
      return;
    }
    const ok = window.confirm(`Vas a cambiar el nombre del material:\n\n"${original}"\n\npor\n\n"${actual || '(vacío)'}"\n\n¿Confirmas este cambio?`);
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
      (acc, u) => acc + u.materiales.filter((m) => this.estadoMaterial(m) === 'BAJO').length,
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
    if (estado === 'OK') return 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200';
    if (estado === 'BAJO') return 'border-amber-500/50 bg-amber-500/20 text-amber-200';
    return 'border-red-500/50 bg-red-500/20 text-red-200';
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
    return null;
  }

  guardar(): void {
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
    if (!window.confirm(confirmTexto)) {
      return;
    }
    const firma = this.firmaResueltaObac();
    const obacId = this.cuarteleroId;
    if (obacId === '') {
      return;
    }
    this.error = null;
    this.saving = true;
    this.checklistsApi
      .guardarChecklistUnidad(this.unidad, {
        cuarteleroId: obacId,
        inspector: this.nombreInspector,
        grupoGuardia: this.grupoGuardia,
        firmaOficial: firma,
        observaciones: this.observaciones,
        totalItems: this.totalItems(),
        itemsOk: this.itemsOk(),
        detalle: { ubicaciones: this.ubicaciones, borrador: false },
      })
      .subscribe({
        next: (reg) => {
          this.saving = false;
          this.fechaCierreChecklist = reg.fecha;
          const estado =
            reg.estadoOperativoCarro === false
              ? 'Unidad marcada como NO operativa hasta corregir faltantes.'
              : 'Unidad marcada como operativa.';
          this.toast.exito(`Checklist de unidad guardado. ${estado}`);
          void this.router.navigate(['/checklist']);
        },
        error: () => {
          this.error = 'No se pudo guardar checklist.';
          this.toast.error('No se pudo guardar el checklist.');
          this.saving = false;
        },
      });
  }

  /** Guarda avance sin exigir firma (marcado como borrador en el detalle). */
  guardarBorrador(): void {
    if (this.cuarteleroId === '') {
      this.error = 'Selecciona un oficial responsable (OBAC) para asociar el borrador.';
      return;
    }
    const obacBorrador = this.cuarteleroId;
    this.error = null;
    this.savingBorrador = true;
    const firma = this.firmaResueltaObac();
    this.checklistsApi
      .guardarChecklistUnidad(this.unidad, {
        cuarteleroId: obacBorrador,
        inspector: this.nombreInspector,
        grupoGuardia: this.grupoGuardia,
        firmaOficial: firma || null,
        observaciones: this.observaciones,
        totalItems: this.totalItems(),
        itemsOk: this.itemsOk(),
        detalle: { ubicaciones: this.ubicaciones, borrador: true },
      })
      .subscribe({
        next: (reg) => {
          this.savingBorrador = false;
          if (reg.fecha) {
            this.fechaCierreChecklist = reg.fecha;
          }
          this.flash('Borrador guardado. Puedes continuar editando o completar firma y guardar el checklist.');
          this.toast.exito('Borrador del checklist guardado.');
        },
        error: () => {
          this.error = 'No se pudo guardar el borrador.';
          this.toast.error('No se pudo guardar el borrador.');
          this.savingBorrador = false;
        },
      });
  }

  guardarPlantillaUnidad(): void {
    if (!this.puedeEditarPlantilla) {
      this.toast.error('No tienes permisos para editar plantilla.');
      return;
    }
    const ubicaciones = this.ubicaciones
      .map((u) => ({
        nombre: String(u.nombre ?? '').trim(),
        materiales: u.materiales
          .map((m) => ({
            nombre: String(m.nombre ?? '').trim(),
            cantidadRequerida: Math.max(0, Math.round(Number(m.cantidadRequerida ?? 0))),
          }))
          .filter((m) => m.nombre.length > 0),
      }))
      .filter((u) => u.nombre.length > 0 && u.materiales.length > 0);
    if (ubicaciones.length === 0) {
      this.toast.error('La plantilla debe tener compartimientos y materiales.');
      return;
    }
    this.checklistsApi.guardarPlantillaUnidad(this.unidad, { ubicaciones }).subscribe({
      next: () => {
        this.toast.exito('Plantilla de checklist guardada.');
      },
      error: () => {
        this.toast.error('No se pudo guardar la plantilla.');
      },
    });
  }

  descargarPdf(): void {
    if (!this.checklistCompletoParaPdf()) {
      this.flash('Termina el checklist (materiales OK y firma OBAC) para generar el PDF.');
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
      firmaOficial: this.firmaResueltaObac(),
      fechaRegistro: this.fechaCierreChecklist ?? undefined,
      observaciones: this.observaciones,
      totalItems: this.totalItems(),
      itemsOk: this.itemsOk(),
      materiales,
    });
  }
}
