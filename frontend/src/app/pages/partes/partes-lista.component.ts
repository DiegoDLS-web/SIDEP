import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import type { ParteEmergenciaDto } from '../../models/parte.dto';
import { PartesExportService } from '../../services/partes-export.service';
import type { PartesMetricasResp } from '../../services/partes.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { SidCardComponent } from '../../shared/sid-card.component';
import { SidEmptyStateComponent } from '../../shared/sid-empty-state.component';
import { SidScrollRevealDirective } from '../../shared/sid-scroll-reveal.directive';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { mensajeApiError } from '../../utils/api-error.util';
import { CLAVES_COMPANIA_SERVICIOS, CLAVES_OPERATIVAS, etiquetaClave } from './partes.constants';
import { ParteVistaSoloLecturaComponent } from './parte-vista-solo-lectura.component';

@Component({
  selector: 'app-partes-lista',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SidepIconsModule,
    ParteVistaSoloLecturaComponent,
    SidScrollRevealDirective,
    SidCardComponent,
    SidEmptyStateComponent,
  ],
  templateUrl: './partes-lista.component.html',
})
export class PartesListaComponent implements OnInit {
  private readonly partesApi = inject(PartesService);
  private readonly exportador = inject(PartesExportService);
  private readonly toast = inject(ToastService);

  readonly clavesOperativasFiltro = CLAVES_OPERATIVAS;
  readonly clavesCompaniaFiltro = CLAVES_COMPANIA_SERVICIOS;

  partes: ParteEmergenciaDto[] = [];
  metricas: PartesMetricasResp | null = null;
  totalFiltrado = 0;
  totalPagesPartes = 1;
  loading = true;
  error: string | null = null;

  filtroTipo = 'todos';
  filtroDireccion = '';
  filtroFecha = '';
  filtroPeriodo: 'todos' | 'hoy' | 'semana' | 'mes' = 'todos';

  paginaPartes = 1;
  readonly tamanioPaginaPartes = 10;

  vistaModalAbierta = false;
  vistaModalCargando = false;
  vistaModalError: string | null = null;
  vistaModalParte: ParteEmergenciaDto | null = null;

  ngOnInit(): void {
    forkJoin({
      metricas: this.partesApi.metricas(),
      pagina: this.partesApi.listarPagina({
        page: 1,
        pageSize: this.tamanioPaginaPartes,
        ...this.filtrosApi(),
      }),
    }).subscribe({
      next: ({ metricas, pagina }) => {
        this.metricas = metricas;
        this.partes = pagina.items;
        this.totalFiltrado = pagina.total;
        this.totalPagesPartes = pagina.totalPages;
        this.paginaPartes = pagina.page;
        this.loading = false;
        this.error = null;
      },
      error: (err) => {
        this.loading = false;
        this.error = mensajeApiError(err, 'No se pudieron cargar los partes. Verifica la conexión o el backend.');
      },
    });
  }

  etiquetaClave = etiquetaClave;

  private filtrosApi(): { tipo?: string; q?: string; desde?: string; hasta?: string } {
    const o: { tipo?: string; q?: string; desde?: string; hasta?: string } = {};
    if (this.filtroTipo !== 'todos') {
      o.tipo = this.filtroTipo;
    }
    const q = this.filtroDireccion.trim();
    if (q) {
      o.q = q;
    }
    const r = this.rangoFechasParaApi();
    if (r.desde) {
      o.desde = r.desde;
    }
    if (r.hasta) {
      o.hasta = r.hasta;
    }
    return o;
  }

  /** Rango ISO para filtro por fecha exacta (dd/MM/yyyy) o por período rápido. */
  private rangoFechasParaApi(): { desde?: string; hasta?: string } {
    const fd = this.filtroFecha.trim();
    if (fd) {
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(fd);
      if (m) {
        const d = Number(m[1]);
        const mo = Number(m[2]);
        const y = Number(m[3]);
        const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
        const end = new Date(y, mo - 1, d, 23, 59, 59, 999);
        return { desde: start.toISOString(), hasta: end.toISOString() };
      }
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (this.filtroPeriodo === 'hoy') {
      const end = new Date(hoy);
      end.setHours(23, 59, 59, 999);
      return { desde: hoy.toISOString(), hasta: end.toISOString() };
    }
    if (this.filtroPeriodo === 'semana') {
      const desde = new Date(hoy);
      desde.setDate(desde.getDate() - 7);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { desde: desde.toISOString(), hasta: end.toISOString() };
    }
    if (this.filtroPeriodo === 'mes') {
      const desde = new Date(hoy);
      desde.setMonth(desde.getMonth() - 1);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { desde: desde.toISOString(), hasta: end.toISOString() };
    }
    return {};
  }

  alCambiarFiltroPartes(): void {
    this.paginaPartes = 1;
    this.recargarPagina();
  }

  private recargarPagina(): void {
    this.partesApi
      .listarPagina({
        page: this.paginaPartes,
        pageSize: this.tamanioPaginaPartes,
        ...this.filtrosApi(),
      })
      .subscribe({
        next: (pagina) => {
          this.partes = pagina.items;
          this.totalFiltrado = pagina.total;
          this.totalPagesPartes = pagina.totalPages;
          this.paginaPartes = pagina.page;
          this.error = null;
        },
        error: (err) => {
          this.error = mensajeApiError(err, 'No se pudo actualizar el listado.');
        },
      });
  }

  totalPaginasPartes(): number {
    return this.totalPagesPartes;
  }

  filtradosPaginados(): ParteEmergenciaDto[] {
    return this.partes;
  }

  cambiarPaginaPartes(delta: number): void {
    const next = this.paginaPartes + delta;
    const total = this.totalPaginasPartes();
    this.paginaPartes = Math.min(Math.max(next, 1), total);
    this.recargarPagina();
  }

  splitFechaHora(fechaIso: string): { fecha: string; hora: string } {
    return splitFechaHoraEsCl(fechaIso);
  }

  estadoClase(estado: string): string {
    const e = estado.toUpperCase();
    if (e === 'COMPLETADO') {
      return 'bg-green-600/20 text-green-400';
    }
    if (e === 'PENDIENTE') {
      return 'bg-yellow-600/20 text-yellow-400';
    }
    if (e === 'BORRADOR') {
      return 'bg-slate-600/30 text-slate-300';
    }
    return 'bg-gray-600/20 text-gray-300';
  }

  statsAnio(): number {
    return this.metricas?.enAnioActual ?? 0;
  }

  statsMes(): number {
    return this.metricas?.enMesActual ?? 0;
  }

  totalSistema(): number {
    return this.metricas?.totalSistema ?? 0;
  }

  exportarExcel(): void {
    const cap = 2000;
    const pageSize = Math.min(cap, Math.max(this.totalFiltrado, this.tamanioPaginaPartes));
    this.partesApi
      .listarPagina({
        page: 1,
        pageSize,
        ...this.filtrosApi(),
      })
      .subscribe({
        next: (pagina) => {
          if (this.totalFiltrado > pagina.items.length) {
            this.toast.info(`Se exportan ${pagina.items.length} de ${this.totalFiltrado} registros (máx. ${cap} por archivo).`);
          }
          this.exportador.exportarExcelListado(pagina.items);
        },
        error: (err) => {
          this.toast.error(mensajeApiError(err, 'No se pudo preparar la exportación.'));
        },
      });
  }

  exportarPdfParte(parte: ParteEmergenciaDto): void {
    this.exportador.exportarPdf(parte);
  }

  abrirVistaSoloLectura(parte: ParteEmergenciaDto): void {
    this.vistaModalAbierta = true;
    this.vistaModalCargando = true;
    this.vistaModalError = null;
    this.vistaModalParte = null;
    this.partesApi.obtener(parte.id).subscribe({
      next: (p) => {
        this.vistaModalCargando = false;
        this.vistaModalParte = p;
      },
      error: (err) => {
        this.vistaModalCargando = false;
        this.vistaModalError = mensajeApiError(err, 'No se pudo cargar el parte completo.');
        this.toast.error('No se pudo cargar el parte.');
      },
    });
  }

  cerrarVistaModal(): void {
    this.vistaModalAbierta = false;
    this.vistaModalCargando = false;
    this.vistaModalError = null;
    this.vistaModalParte = null;
  }

  @HostListener('document:keydown.escape')
  onEscapeCerrarVistaModal(): void {
    if (this.vistaModalAbierta) {
      this.cerrarVistaModal();
    }
  }
}
