import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { BolsosTraumaService } from '../../services/bolsos-trauma.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ToastService } from '../../services/toast.service';
import { UsuariosService } from '../../services/usuarios.service';
import { SignaturePadComponent } from '../../shared/signature-pad.component';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { firmaEfectiva } from '../../utils/firma-resolver';

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

/** Plantilla por bolso: cuatro bolsillos con ítems de referencia. */
function plantillaBolso(numero: number): Bolso {
  return {
    numero,
    ubicaciones: [
      {
        nombre: 'Bolsillo Principal',
        materiales: [
          nuevoMaterial('Kit de cánulas', 1, 2, 2),
          nuevoMaterial('Vendas elásticas 10cm', 4, 6, 5),
          nuevoMaterial('Gasas estériles', 8, 10, 10),
          nuevoMaterial('Guantes de nitrilo (pares)', 10, 15, 12),
        ],
      },
      {
        nombre: 'Bolsillo Delantero',
        materiales: [
          nuevoMaterial('Tijeras de trauma', 1, 2, 2),
          nuevoMaterial('Linterna pupilar', 1, 1, 1),
          nuevoMaterial('Termómetro digital', 1, 1, 1),
        ],
      },
      {
        nombre: 'Bolsillo Superior',
        materiales: [
          nuevoMaterial('Mascarilla RCP', 1, 2, 2),
          nuevoMaterial('Collar cervical ajustable', 1, 2, 1),
        ],
      },
      {
        nombre: 'Bolsillo Posterior',
        materiales: [
          nuevoMaterial('Manta térmica', 2, 4, 3),
          nuevoMaterial('Torniquete de emergencia', 1, 2, 2),
        ],
      },
    ],
  };
}

function defaultBolsos(unidad: string): Bolso[] {
  const cantidad = unidad === 'R-1' ? 3 : unidad === 'BX-1' ? 2 : 1;
  return Array.from({ length: cantidad }, (_, i) => plantillaBolso(i + 1));
}

@Component({
  selector: 'app-bolso-trauma-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, SignaturePadComponent],
  templateUrl: './bolso-trauma-registro.component.html',
})
export class BolsoTraumaRegistroComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bolsosApi = inject(BolsosTraumaService);
  private readonly usuariosApi = inject(UsuariosService);
  private readonly pdf = inject(PdfExportService);
  private readonly toast = inject(ToastService);

  unidad = 'R-1';
  nombreCarro = '';
  bolsoNumero = 1;
  usuarios: UsuarioListaDto[] = [];
  cuarteleroId: number | '' = '';
  nombreInspector = '';
  grupoGuardia = '';
  /** Fecha planificada de inspección (YYYY-MM-DD). */
  fechaInspeccion = '';
  observaciones = '';
  /** Firma OBAC (PNG data URL). */
  firmaDataUrl = '';
  /** ISO fecha/hora mostrada en “Fecha de cierre / firma” al firmar. */
  fechaCierreChecklist: string | null = null;

  bolsos: Bolso[] = [];

  loading = true;
  saving = false;
  savingBorrador = false;
  error: string | null = null;
  mensajeFlash: string | null = null;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.unidad = this.route.snapshot.paramMap.get('unidad') ?? 'R-1';
    const q = Number(this.route.snapshot.queryParamMap.get('bolso') ?? '1');
    this.bolsoNumero = Number.isFinite(q) && q > 0 ? q : 1;
    const hoy = new Date().toISOString().slice(0, 10);
    this.fechaInspeccion = hoy;

    forkJoin({
      data: this.bolsosApi.obtenerUnidad(this.unidad),
      usuarios: this.usuariosApi.listar(),
    }).subscribe({
      next: ({ data, usuarios }) => {
        this.usuarios = usuarios;
        this.nombreCarro = (data.carro.nombre ?? '').trim() || '—';

        const checklist = data.checklist;
        const detalle = checklist?.detalle as {
          bolsos?: Bolso[];
          fecha?: string;
          fechaInspeccion?: string;
          bolsoNumero?: number;
        } | null;

        if (detalle?.bolsos?.length) {
          this.bolsos = detalle.bolsos;
        } else {
          this.bolsos = defaultBolsos(this.unidad);
        }

        if (checklist?.inspector) this.nombreInspector = checklist.inspector;
        if (checklist?.grupoGuardia) this.grupoGuardia = checklist.grupoGuardia;
        if (checklist?.observaciones) this.observaciones = checklist.observaciones;
        if (checklist?.cuarteleroId && usuarios.some((u) => u.id === checklist.cuarteleroId)) {
          this.cuarteleroId = checklist.cuarteleroId;
        } else if (usuarios.length > 0) {
          this.cuarteleroId = usuarios[0].id;
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

        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el registro del bolso de trauma.';
        this.loading = false;
      },
    });
  }

  get bolsoActual(): Bolso {
    const b = this.bolsos.find((x) => x.numero === this.bolsoNumero);
    if (b) {
      if (b.ubicaciones.length === 0) {
        b.ubicaciones = plantillaBolso(this.bolsoNumero).ubicaciones;
      }
      return b;
    }
    const nuevo: Bolso = { numero: this.bolsoNumero, ubicaciones: plantillaBolso(this.bolsoNumero).ubicaciones };
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

  onFirmaChange(dataUrl: string): void {
    this.firmaDataUrl = dataUrl;
    if (dataUrl?.startsWith('data:image')) {
      this.fechaCierreChecklist = new Date().toISOString();
    } else {
      this.fechaCierreChecklist = null;
    }
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

  eliminarMaterial(ubicacionIndex: number, materialIndex: number): void {
    if (!window.confirm('¿Eliminar este material del bolso?')) {
      return;
    }
    this.bolsoActual.ubicaciones[ubicacionIndex]?.materiales.splice(materialIndex, 1);
    this.toast.exito('Material eliminado.');
  }

  totalMateriales(): number {
    return this.bolsoActual.ubicaciones.reduce((acc, u) => acc + u.materiales.length, 0);
  }

  materialesMinimosOk(): number {
    return this.bolsoActual.ubicaciones.reduce(
      (acc, u) => acc + u.materiales.filter((m) => m.cantidadActual >= m.cantidadMinima).length,
      0,
    );
  }

  materialesOptimosOk(): number {
    return this.bolsoActual.ubicaciones.reduce(
      (acc, u) => acc + u.materiales.filter((m) => m.cantidadActual >= m.cantidadOptima).length,
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
      return 'Selecciona un oficial responsable (OBAC).';
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
    const flat = this.bolsos.flatMap((b) => b.ubicaciones.flatMap((u) => u.materiales));
    if (flat.length === 0) {
      return 'No hay materiales registrados en los bolsos.';
    }
    for (const m of flat) {
      if (!m.nombre.trim()) {
        return 'Todo material debe tener nombre indicado.';
      }
      if (m.cantidadActual < m.cantidadMinima) {
        return 'Completa todos los materiales: cantidad actual debe ser al menos el mínimo en todos los bolsos.';
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
        this.flash('Debes firmar en el área OBAC o tener firma en el perfil del responsable.');
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
          if (reg?.fecha) this.fechaCierreChecklist = reg.fecha;
          this.flash('Borrador guardado.');
          this.toast.exito('Borrador de bolso trauma guardado.');
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
      this.flash('Completa inspector, fecha, firma OBAC e ítems para generar el PDF.');
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
      firmaOficial: this.firmaResueltaObac(),
      fechaRegistro: this.fechaCierreChecklist ?? undefined,
      observaciones: this.observaciones,
      totalItems: this.totalMateriales(),
      itemsOk: this.materialesMinimosOk(),
      materiales,
    });
  }
}
