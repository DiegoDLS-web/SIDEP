import { CommonModule, formatDate } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type {
  BolsoTraumaHistorialDto,
  BolsoTraumaRegistroDto,
  BolsoTraumaSelectorUnidadDto,
} from '../../models/bolso-trauma.dto';
import { BolsosTraumaService } from '../../services/bolsos-trauma.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-bolso-trauma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './bolso-trauma.component.html',
})
export class BolsoTraumaComponent implements OnInit {
  private readonly bolsosApi = inject(BolsosTraumaService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly router = inject(Router);

  unidades: BolsoTraumaSelectorUnidadDto[] = [];
  historial: BolsoTraumaHistorialDto[] = [];
  loading = true;
  error: string | null = null;
  historialError: string | null = null;
  loadingHistorial = true;
  filtroUnidad = '';
  filtroDesde = '';
  filtroHasta = '';
  /** Filtro local sobre el resultado cargado (no requiere nueva petición). */
  filtroEstado: 'TODOS' | 'BORRADOR' | 'CERRADO' = 'TODOS';
  filtroInspectorObac = '';

  detalleRegistro: BolsoTraumaRegistroDto | null = null;
  loadingDetalle = false;
  descargandoRegistroId: number | null = null;
  paginaHistorial = 1;
  readonly tamanioPaginaHistorial = 10;

  ngOnInit(): void {
    this.bolsosApi.selector().subscribe({
      next: (data) => {
        this.unidades = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el control de bolsos de trauma.';
        this.loading = false;
      },
    });

    this.cargarHistorial();
  }

  fechaHora(iso: string | null | undefined): { fecha: string; hora: string } {
    if (!iso) return { fecha: '—', hora: '—' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { fecha: '—', hora: '—' };
    return {
      fecha: formatDate(d, 'dd/MM/yyyy', 'es-CL'),
      hora: formatDate(d, 'HH:mm', 'es-CL'),
    };
  }

  promedioCompletitud(unidad: BolsoTraumaSelectorUnidadDto): number {
    if (unidad.bolsos.length === 0) return 0;
    const sum = unidad.bolsos.reduce((acc, b) => acc + b.completitud, 0);
    return Math.round(sum / unidad.bolsos.length);
  }

  totalItemsFaltantes(unidad: BolsoTraumaSelectorUnidadDto): number {
    return unidad.bolsos.reduce((acc, b) => acc + b.itemsFaltantes, 0);
  }

  stats() {
    const totalBolsos = this.unidades.reduce((acc, u) => acc + u.cantidadBolsos, 0);
    const completos = this.unidades.reduce(
      (acc, u) => acc + u.bolsos.filter((b) => b.status === 'complete').length,
      0,
    );
    return {
      totalBolsos,
      completos,
      incompletos: Math.max(totalBolsos - completos, 0),
    };
  }

  cargarHistorial(): void {
    this.loadingHistorial = true;
    this.historialError = null;
    this.bolsosApi
      .historial({
        unidad: this.filtroUnidad || undefined,
        desde: this.filtroDesde || undefined,
        hasta: this.filtroHasta || undefined,
      })
      .subscribe({
        next: (data) => {
          this.historial = data;
          this.paginaHistorial = 1;
          this.loadingHistorial = false;
        },
        error: () => {
          this.historialError = 'No se pudo cargar historial de registros.';
          this.loadingHistorial = false;
        },
      });
  }

  fechaHoraHist(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${formatDate(d, 'dd/MM/yyyy HH:mm', 'es-CL')}`;
  }

  abrirDetalle(h: BolsoTraumaHistorialDto): void {
    this.detalleRegistro = null;
    this.loadingDetalle = true;
    this.bolsosApi.obtenerHistorialPorId(h.id).subscribe({
      next: (row) => {
        this.detalleRegistro = row;
        this.loadingDetalle = false;
      },
      error: () => {
        this.loadingDetalle = false;
        this.detalleRegistro = null;
      },
    });
  }

  editarRegistro(h: BolsoTraumaHistorialDto): void {
    void this.router.navigate(['/bolso-trauma', h.unidad], {
      queryParams: h.bolsoNumero ? { bolso: h.bolsoNumero } : {},
    });
  }

  descargarRegistroPdf(h: BolsoTraumaHistorialDto): void {
    this.descargandoRegistroId = h.id;
    this.bolsosApi.obtenerHistorialPorId(h.id).subscribe({
      next: (reg) => {
        const materiales = this.filasDetalleMateriales(reg).map((row) => ({
          ubicacion: row.ubicacion,
          material: row.nombre,
          requerida: row.opt,
          actual: row.act,
          estado: row.act >= row.min ? 'OK' : 'Falta',
        }));
        const unidad = reg.carro.nomenclatura || h.unidad;
        this.pdfExport.exportarChecklistUnidad({
          unidad,
          inspector: reg.inspector ?? '',
          grupoGuardia: reg.grupoGuardia ?? '',
          responsable: reg.cuartelero.nombre ?? h.responsable,
          firmaOficial: reg.firmaOficial ?? '',
          fechaRegistro: reg.fecha,
          observaciones: reg.observaciones ?? '',
          totalItems: reg.totalItems ?? materiales.length,
          itemsOk: reg.itemsOk ?? materiales.filter((m) => m.estado === 'OK').length,
          materiales,
        });
        this.descargandoRegistroId = null;
      },
      error: () => {
        this.descargandoRegistroId = null;
      },
    });
  }

  cerrarDetalle(): void {
    this.detalleRegistro = null;
  }

  etiquetaEstado(h: BolsoTraumaHistorialDto): string {
    return h.borrador === true ? 'Borrador' : 'Cerrado';
  }

  exportarHistorialPdf(): void {
    const filas = this.historialFiltrado();
    if (filas.length === 0) {
      return;
    }
    this.pdfExport.exportarHistorialBolsoTrauma({ registros: filas });
  }

  historialFiltrado(): BolsoTraumaHistorialDto[] {
    const txt = this.filtroInspectorObac.trim().toLowerCase();
    return this.historial.filter((h) => {
      if (this.filtroEstado === 'BORRADOR' && h.borrador !== true) {
        return false;
      }
      if (this.filtroEstado === 'CERRADO' && h.borrador === true) {
        return false;
      }
      if (!txt) {
        return true;
      }
      return (
        (h.inspector ?? '').toLowerCase().includes(txt) ||
        (h.responsable ?? '').toLowerCase().includes(txt)
      );
    });
  }

  aplicarFiltrosLocalesHistorial(): void {
    this.paginaHistorial = 1;
  }

  totalPaginasHistorial(): number {
    return Math.max(1, Math.ceil(this.historialFiltrado().length / this.tamanioPaginaHistorial));
  }

  historialPaginado(): BolsoTraumaHistorialDto[] {
    const filas = this.historialFiltrado();
    const inicio = (this.paginaHistorial - 1) * this.tamanioPaginaHistorial;
    return filas.slice(inicio, inicio + this.tamanioPaginaHistorial);
  }

  cambiarPaginaHistorial(delta: number): void {
    const next = this.paginaHistorial + delta;
    const total = this.totalPaginasHistorial();
    this.paginaHistorial = Math.min(Math.max(next, 1), total);
  }

  filasDetalleMateriales(reg: BolsoTraumaRegistroDto): { bolso: number; ubicacion: string; nombre: string; min: number; opt: number; act: number }[] {
    const det = reg.detalle as {
      bolsos?: Array<{
        numero?: number;
        ubicaciones?: Array<{ nombre: string; materiales?: Array<{ nombre?: string; cantidadMinima?: number; cantidadOptima?: number; cantidadActual?: number }> }>;
      }>;
    } | null;
    const bolsos = det?.bolsos ?? [];
    const out: { bolso: number; ubicacion: string; nombre: string; min: number; opt: number; act: number }[] = [];
    for (let bi = 0; bi < bolsos.length; bi++) {
      const b = bolsos[bi];
      const n = b.numero ?? bi + 1;
      for (const u of b.ubicaciones ?? []) {
        for (const m of u.materiales ?? []) {
          out.push({
            bolso: n,
            ubicacion: u.nombre,
            nombre: m.nombre ?? '—',
            min: m.cantidadMinima ?? 0,
            opt: m.cantidadOptima ?? 0,
            act: m.cantidadActual ?? 0,
          });
        }
      }
    }
    return out;
  }
}
