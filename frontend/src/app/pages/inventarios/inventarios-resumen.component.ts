import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import type { InventarioItemDto, InventarioMetricasDto } from '../../models/inventarios.dto';
import { CATEGORIAS_INVENTARIO, TALLAS_BOTA, TALLAS_ROPA } from '../../models/inventarios.dto';
import { InventariosService } from '../../services/inventarios.service';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { mensajeApiError } from '../../utils/api-error.util';
import { exportarExcelSidep } from '../../utils/excel-export.util';
import type { UsuarioListaDto } from '../../models/usuario.dto';
import { SidepIconsModule } from '../../shared/sidep-icons.module';

@Component({
  selector: 'app-inventarios-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './inventarios-resumen.component.html',
})
export class InventariosResumenComponent implements OnInit {
  private readonly api = inject(InventariosService);
  private readonly usuarios = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly pdf = inject(PdfExportService);
  private readonly buscar$ = new Subject<void>();

  loading = true;
  exportandoPdf = false;
  error: string | null = null;
  items: InventarioItemDto[] = [];
  metricas: InventarioMetricasDto | null = null;
  total = 0;
  page = 1;
  pageSize = 50;
  totalPaginas = 1;

  busqueda = '';
  filtroVoluntario = '';
  bodegaActiva = 'TODAS';
  categoriaActiva = 'TODAS';

  bodegas: Array<{ codigo: string; nombre: string }> = [
    { codigo: 'TODAS', nombre: 'Todas' },
    { codigo: 'RESCATE', nombre: 'Bodega Rescate' },
    { codigo: 'AGUA', nombre: 'Bodega Agua' },
    { codigo: 'UNIFORMES', nombre: 'Bodega Uniformes' },
  ];
  readonly categorias = ['TODAS', ...CATEGORIAS_INVENTARIO];
  readonly tallasBota = TALLAS_BOTA;
  readonly tallasRopa = TALLAS_ROPA;

  voluntarios: UsuarioListaDto[] = [];
  asignandoItemId: number | null = null;
  rutAsignacion = '';

  get puedeGestionar(): boolean {
    const rol = this.auth.usuarioActual?.rol?.trim().toUpperCase();
    return rol === 'ADMIN' || rol === 'CAPITAN' || rol === 'TENIENTE';
  }

  ngOnInit(): void {
    this.usuarios.voluntariosParaSelect().subscribe((v) => (this.voluntarios = v));
    this.buscar$.pipe(debounceTime(300)).subscribe(() => this.cargar(1));
    this.cargar(1);
  }

  cargar(page = this.page): void {
    this.loading = true;
    this.error = null;
    this.page = page;
    this.api
      .listarItems({
        q: this.busqueda,
        bodega: this.bodegaActiva,
        categoria: this.categoriaActiva,
        voluntario: this.filtroVoluntario,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (data) => {
          this.items = data.items;
          this.metricas = data.metricas;
          this.total = data.total;
          this.totalPaginas = Math.max(1, Math.ceil(data.total / data.pageSize));
          this.loading = false;
          if (data.total === 0 && !this.busqueda && this.bodegaActiva === 'TODAS') {
            this.error = 'Sin ítems importados. Ejecuta el script de importación de la planilla Excel en el servidor.';
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = mensajeApiError(err, 'No se pudo cargar el inventario.');
        },
      });
  }

  onBuscarChange(): void {
    this.buscar$.next();
  }

  setBodega(codigo: string): void {
    this.bodegaActiva = codigo;
    this.cargar(1);
  }

  setCategoria(cat: string): void {
    this.categoriaActiva = cat;
    this.cargar(1);
  }

  ajustar(item: InventarioItemDto, delta: number): void {
    if (!this.puedeGestionar) return;
    this.api.ajustarCantidadItem(item.id, delta).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        if (this.metricas) this.recargarMetricas();
        this.toast.exito(delta > 0 ? 'Stock aumentado.' : 'Stock reducido.');
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo ajustar el stock.')),
    });
  }

  guardarTalla(item: InventarioItemDto, talla: string): void {
    if (!this.puedeGestionar) return;
    this.api.actualizarMetaItem(item.id, { talla: talla || null }).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.toast.exito(`Talla ${actualizado.talla ?? '—'} guardada.`);
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo guardar la talla.')),
    });
  }

  private recargarMetricas(): void {
    this.api.listarItems({ page: 1, pageSize: 1 }).subscribe({
      next: (d) => (this.metricas = d.metricas),
    });
  }

  abrirAsignacion(item: InventarioItemDto): void {
    if (!this.puedeGestionar || !item.esEppAsignable) return;
    if (item.cantidadDisponible < 1) {
      this.toast.error(
        `No se puede asignar: no hay unidades disponibles (total ${item.cantidad}, asignadas ${item.cantidadAsignada}).`,
      );
      return;
    }
    if (item.sistemaTalla && !item.talla) {
      this.toast.error('Indica la talla del ítem antes de asignar (botas 35–46; ropa/gorras XS–XXL).');
      return;
    }
    this.asignandoItemId = item.id;
    this.rutAsignacion = '';
  }

  cancelarAsignacion(): void {
    this.asignandoItemId = null;
    this.rutAsignacion = '';
  }

  confirmarAsignacion(item: InventarioItemDto): void {
    if (!this.rutAsignacion.trim()) {
      this.toast.error('Selecciona un voluntario.');
      return;
    }
    this.api.asignarEpp(item.id, this.rutAsignacion.trim()).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.cancelarAsignacion();
        this.toast.exito('EPP asignado al voluntario.');
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo asignar.')),
    });
  }

  quitarAsignacion(item: InventarioItemDto, asignacionId: string): void {
    if (!this.puedeGestionar) return;
    this.api.quitarAsignacionEpp(asignacionId).subscribe({
      next: (actualizado) => {
        Object.assign(item, actualizado);
        this.toast.exito('Asignación eliminada. La unidad vuelve a disponibles en bodega.');
      },
      error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo quitar la asignación.')),
    });
  }

  exportarExcel(): void {
    this.api
      .exportarItems({
        q: this.busqueda,
        bodega: this.bodegaActiva,
        categoria: this.categoriaActiva,
        voluntario: this.filtroVoluntario,
      })
      .subscribe({
        next: (filas) => {
          exportarExcelSidep({
            titulo: 'Inventario institucional',
            meta: [`Total filas: ${filas.length}`],
            columnas: [
              'Código',
              'Artículo',
              'Talla',
              'Tipo EPP',
              'Categoría',
              'Bodega',
              'Total',
              'Asignados',
              'Disponibles',
              'Stock mín.',
              'Estado stock',
              'Asignado a',
              'Marca',
              'Modelo',
            ],
            filas: filas.map((f) => [
              f.codigo,
              f.nombre,
              f.talla ?? '',
              f.tipoEppEtiqueta ?? '',
              f.categoria ?? '',
              f.bodegaNombre,
              f.cantidad,
              f.cantidadAsignada,
              f.cantidadDisponible,
              f.stockMinimo,
              f.estadoStock,
              f.asignaciones.map((a) => a.usuarioNombre).join('; ') || '—',
              f.marca ?? '',
              f.modelo ?? '',
            ]),
            nombreArchivo: `inventario_sidep_${new Date().toISOString().slice(0, 10)}.xlsx`,
            anchosCols: [12, 32, 8, 16, 12, 16, 8, 10, 10, 10, 12, 28, 12, 12],
          });
        },
        error: (err) => this.toast.error(mensajeApiError(err, 'No se pudo exportar.')),
      });
  }

  exportarPdfBodegas(): void {
    if (this.exportandoPdf) return;
    this.exportandoPdf = true;
    this.api
      .exportarItems({
        q: this.busqueda,
        bodega: this.bodegaActiva,
        categoria: this.categoriaActiva,
        voluntario: this.filtroVoluntario,
      })
      .subscribe({
        next: async (filas) => {
          try {
            const porBodega = new Map<string, InventarioItemDto[]>();
            for (const f of filas) {
              const key = f.bodegaCodigo || 'SIN_BODEGA';
              const list = porBodega.get(key) ?? [];
              list.push(f);
              porBodega.set(key, list);
            }

            if (!porBodega.size) {
              this.toast.error('No hay ítems para exportar.');
              return;
            }

            for (const [, items] of porBodega) {
              const bodegaNombre = items[0]?.bodegaNombre ?? 'Bodega';
              const totalUnidades = items.reduce((a, i) => a + i.cantidad, 0);
              const asignadas = items.reduce((a, i) => a + i.cantidadAsignada, 0);
              const disponibles = items.reduce((a, i) => a + i.cantidadDisponible, 0);

              await this.pdf.exportarHistorialTabla({
                titulo: `Inventario — ${bodegaNombre}`,
                subtitulo: 'Inventario completo de bodega · 1ª Compañía Santa Juana',
                landscape: true,
                segmentosNombre: ['Inventario', bodegaNombre],
                resumen: [
                  `Ítems: ${items.length} · Total unidades: ${totalUnidades} · Asignadas: ${asignadas} · Disponibles en bodega: ${disponibles}`,
                ],
                columnas: [
                  'Código',
                  'Artículo',
                  'Talla',
                  'Categoría',
                  'Total',
                  'Asign.',
                  'Disp.',
                  'Estado',
                  'Asignado a',
                ],
                filas: items.map((f) => [
                  f.codigo,
                  f.nombre,
                  f.talla ?? '—',
                  f.categoria ?? '—',
                  String(f.cantidad),
                  String(f.cantidadAsignada),
                  String(f.cantidadDisponible),
                  f.estadoStock,
                  f.asignaciones.map((a) => a.usuarioNombre).join('; ') || '—',
                ]),
              });
            }

            this.toast.exito(
              porBodega.size === 1
                ? 'PDF de inventario generado.'
                : `Se generaron ${porBodega.size} PDFs (uno por bodega).`,
            );
          } catch {
            this.toast.error('No se pudo generar el PDF.');
          } finally {
            this.exportandoPdf = false;
          }
        },
        error: (err) => {
          this.exportandoPdf = false;
          this.toast.error(mensajeApiError(err, 'No se pudo exportar PDF.'));
        },
      });
  }

  tallasPara(item: InventarioItemDto): string[] {
    if (item.sistemaTalla === 'BOTA') return this.tallasBota;
    if (item.sistemaTalla === 'ROPA') return [...this.tallasRopa];
    return [];
  }

  puedeAsignarMas(item: InventarioItemDto): boolean {
    return item.esEppAsignable && item.cantidadDisponible > 0;
  }

  etiquetaAsignado(item: InventarioItemDto): string {
    if (!item.asignaciones.length) return '—';
    return item.asignaciones.map((a) => a.usuarioNombre).join(', ');
  }

  clasesEstado(estado: string): string {
    if (estado === 'CRITICO') return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
    if (estado === 'BAJO') return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30';
    return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
  }

  irPagina(p: number): void {
    if (p < 1 || p > this.totalPaginas) return;
    this.cargar(p);
  }
}
