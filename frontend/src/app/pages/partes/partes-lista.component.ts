import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { ParteEmergenciaDto } from '../../models/parte.dto';
import { PartesExportService } from '../../services/partes-export.service';
import { PartesService } from '../../services/partes.service';
import { ToastService } from '../../services/toast.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { splitFechaHoraEsCl } from '../../shared/fecha-hora-split';
import { CLAVES_COMPANIA_SERVICIOS, CLAVES_OPERATIVAS, etiquetaClave } from './partes.constants';
import { ParteVistaSoloLecturaComponent } from './parte-vista-solo-lectura.component';

@Component({
  selector: 'app-partes-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule, ParteVistaSoloLecturaComponent],
  templateUrl: './partes-lista.component.html',
})
export class PartesListaComponent implements OnInit {
  private readonly partesApi = inject(PartesService);
  private readonly exportador = inject(PartesExportService);
  private readonly toast = inject(ToastService);

  readonly clavesOperativasFiltro = CLAVES_OPERATIVAS;
  readonly clavesCompaniaFiltro = CLAVES_COMPANIA_SERVICIOS;

  partes: ParteEmergenciaDto[] = [];
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
    this.partesApi.listar().subscribe({
      next: (data) => {
        this.partes = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los partes. Verifica que el backend esté en ejecución.';
        this.loading = false;
      },
    });
  }

  etiquetaClave = etiquetaClave;

  alCambiarFiltroPartes(): void {
    this.paginaPartes = 1;
  }

  totalPaginasPartes(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.tamanioPaginaPartes));
  }

  filtradosPaginados(): ParteEmergenciaDto[] {
    const f = this.filtrados;
    const i = (this.paginaPartes - 1) * this.tamanioPaginaPartes;
    return f.slice(i, i + this.tamanioPaginaPartes);
  }

  cambiarPaginaPartes(delta: number): void {
    const next = this.paginaPartes + delta;
    const total = this.totalPaginasPartes();
    this.paginaPartes = Math.min(Math.max(next, 1), total);
  }

  get filtrados(): ParteEmergenciaDto[] {
    return this.partes.filter((p) => {
      if (this.filtroTipo !== 'todos' && p.claveEmergencia !== this.filtroTipo) {
        return false;
      }
      if (this.filtroDireccion && !p.direccion.toLowerCase().includes(this.filtroDireccion.toLowerCase())) {
        return false;
      }
      const fd = this.splitFechaHora(p.fecha);
      if (this.filtroFecha && fd.fecha !== this.filtroFecha.trim()) {
        return false;
      }
      const d = new Date(p.fecha);
      if (Number.isNaN(d.getTime())) {
        return false;
      }
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (this.filtroPeriodo === 'hoy') {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        if (x.getTime() !== hoy.getTime()) {
          return false;
        }
      } else if (this.filtroPeriodo === 'semana') {
        const desde = new Date(hoy);
        desde.setDate(desde.getDate() - 7);
        if (d < desde) {
          return false;
        }
      } else if (this.filtroPeriodo === 'mes') {
        const desde = new Date(hoy);
        desde.setMonth(desde.getMonth() - 1);
        if (d < desde) {
          return false;
        }
      }
      return true;
    });
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
    const y = new Date().getFullYear();
    return this.partes.filter((p) => new Date(p.fecha).getFullYear() === y).length;
  }

  statsMes(): number {
    const now = new Date();
    return this.partes.filter((p) => {
      const d = new Date(p.fecha);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }

  exportarExcel(): void {
    this.exportador.exportarExcelListado(this.filtrados);
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
      error: () => {
        this.vistaModalCargando = false;
        this.vistaModalError = 'No se pudo cargar el parte completo.';
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
