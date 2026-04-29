import { CommonModule, formatDate } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import type { CarroDto } from '../../models/carro.dto';
import type { DashboardResumenDto } from '../../models/dashboard.dto';

type UnidadDashboard = DashboardResumenDto['unidadesSemaforo'][number];
import { CarrosService } from '../../services/carros.service';
import { DashboardService } from '../../services/dashboard.service';
import { ReportesService } from '../../services/reportes.service';
import { SidepIconsModule } from '../../shared/sidep-icons.module';
import { CLAVES_EMERGENCIA } from '../partes/partes.constants';
import type { CuadroHonorDto } from '../../models/reportes.dto';

type StatCard = {
  label: string;
  value: string;
  icon: string;
  trend: string;
  trendUp: boolean;
  grad: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidepIconsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardApi = inject(DashboardService);
  private readonly carrosApi = inject(CarrosService);
  private readonly reportesApi = inject(ReportesService);

  readonly clavesTipo = CLAVES_EMERGENCIA;

  loading = true;
  error: string | null = null;
  datos: DashboardResumenDto | null = null;

  carros: CarroDto[] = [];
  anio = new Date().getFullYear();
  claveFiltro = 'todos';
  /** `todas` o id numérico del carro (coincide con ngValue del &lt;select&gt;). */
  unidadFiltro: 'todas' | number = 'todas';

  readonly aniosDisponibles: number[] = [];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  stats: StatCard[] = [
    {
      label: 'Emergencias totales',
      value: '—',
      icon: 'flame',
      trend: '—',
      trendUp: true,
      grad: 'from-red-500 to-red-600',
    },
    {
      label: 'Tiempo promedio respuesta',
      value: '—',
      icon: 'clock',
      trend: '—',
      trendUp: true,
      grad: 'from-yellow-500 to-yellow-600',
    },
    {
      label: 'Emergencias resueltas',
      value: '—',
      icon: 'circle-check',
      trend: '—',
      trendUp: true,
      grad: 'from-green-500 to-green-600',
    },
    {
      label: 'Emergencias (mes de referencia)',
      value: '—',
      icon: 'users',
      trend: '—',
      trendUp: true,
      grad: 'from-red-500 to-red-600',
    },
  ];

  mesesChart: { mes: string; cantidadActual: number; cantidadPrev: number }[] = [];
  maxMes = 1;
  cuadroHonor: CuadroHonorDto | null = null;
  mostrarCuadroHonor = true;

  ngOnInit(): void {
    const y = new Date().getFullYear();
    for (let a = y - 2; a <= y; a++) {
      this.aniosDisponibles.push(a);
    }
    this.carrosApi.listar().subscribe({
      next: (c) => {
        this.carros = c;
      },
      error: () => {
        this.carros = [];
      },
    });
    this.cargar();
    this.refreshInterval = window.setInterval(() => this.cargar(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval != null) {
      clearInterval(this.refreshInterval);
    }
  }

  aplicarFiltros(): void {
    this.cargar();
  }

  private cargar(): void {
    this.error = null;
    this.loading = !this.datos;
    forkJoin({
      actual: this.dashboardApi.resumen(this.anio, this.claveFiltro, this.unidadFiltro),
      previo: this.dashboardApi
        .resumen(this.anio - 1, this.claveFiltro, this.unidadFiltro)
        .pipe(catchError(() => of(null))),
      honor: this.reportesApi.cuadroHonor(this.anio).pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: ({ actual, previo, honor }) => {
          const d = actual;
          this.datos = d;
          this.cuadroHonor = honor;
          this.actualizarStats(d);
          this.mesesChart = this.buildMesesChart(d, previo);
          this.maxMes = Math.max(
            ...this.mesesChart.map((m) => Math.max(m.cantidadActual, m.cantidadPrev)),
            1,
          );
        },
        error: () => {
          this.error = 'No se pudo cargar el dashboard. ¿Está el backend en ejecución?';
        },
      });
  }

  private buildMesesChart(
    actual: DashboardResumenDto,
    previo: DashboardResumenDto | null,
  ): { mes: string; cantidadActual: number; cantidadPrev: number }[] {
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const anio = actual.anio;
    const anioPrev = anio - 1;
    return labels.map((mes, idx) => {
      const periodo = `${anio}-${`${idx + 1}`.padStart(2, '0')}`;
      const periodoPrev = `${anioPrev}-${`${idx + 1}`.padStart(2, '0')}`;
      const cantidadActual = actual.porMes.find((p) => p.periodo === periodo)?.cantidad ?? 0;
      const cantidadPrev = previo?.porMes.find((p) => p.periodo === periodoPrev)?.cantidad ?? 0;
      return { mes, cantidadActual, cantidadPrev };
    });
  }

  private actualizarStats(d: DashboardResumenDto): void {
    this.stats[0] = {
      ...this.stats[0]!,
      label: `Emergencias totales ${d.anio}`,
      value: String(d.totalEmergencias),
      trend: d.filtros.clave || d.filtros.carroId ? 'Filtros activos' : '—',
      trendUp: true,
    };
    this.stats[1] = {
      ...this.stats[1]!,
      value: `${d.tiempoPromedioRespuestaMin} min`,
      trend: '—',
      trendUp: true,
    };
    this.stats[2] = {
      ...this.stats[2]!,
      value: `${d.porcentajeResueltas}%`,
      trend: '—',
      trendUp: d.porcentajeResueltas >= 50,
    };
    this.stats[3] = {
      ...this.stats[3]!,
      value: String(d.emergenciasEsteMes),
      trend: 'Mes en el año filtrado',
      trendUp: true,
    };
  }

  maxPorTipo(): number {
    const t = this.tiposEmergenciaTop();
    return Math.max(...t.map((x) => x.cantidad), 1);
  }

  tiposEmergenciaTop(): Array<{ claveEmergencia: string; cantidad: number }> {
    return (this.datos?.porTipo ?? []).slice(0, 8);
  }

  maxHeat(): number {
    const h = this.datos?.heatmapSemanas ?? [];
    let m = 0;
    for (const row of h) {
      for (const v of row) {
        if (v > m) m = v;
      }
    }
    return m || 1;
  }

  heatClass(val: number): string {
    if (val === 0) return 'bg-gray-800';
    const ratio = val / this.maxHeat();
    if (ratio < 0.25) return 'bg-red-900';
    if (ratio < 0.5) return 'bg-red-700';
    if (ratio < 0.75) return 'bg-red-600';
    return 'bg-red-500';
  }

  fechaCorta(iso: string): string {
    try {
      return formatDate(iso, 'dd/MM/yyyy HH:mm', 'es-CL');
    } catch {
      return iso;
    }
  }

  fechaRelativa(iso: string): string {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return h <= 1 ? 'Hace poco' : `Hace ${h} h`;
    const d = Math.floor(diff / 86400000);
    if (d < 7) return `Hace ${d} día(s)`;
    return this.fechaCorta(iso);
  }

  etiquetaClave(clave: string): string {
    const f = this.clavesTipo.find((c) => c.value === clave);
    return f?.label ?? clave;
  }

  estadoParteClass(estado: string): string {
    const e = estado.toUpperCase();
    if (e === 'COMPLETADO') return 'bg-green-600/20 text-green-400';
    if (e === 'PENDIENTE') return 'bg-amber-600/20 text-amber-300';
    return 'bg-gray-600/20 text-gray-300';
  }

  porcentajeChecklistUnidad(u: UnidadDashboard): number {
    const c = u.checklistUnidad;
    const t = Number(c?.totalItems) || 0;
    if (t <= 0) {
      return 0;
    }
    return Math.round(((Number(c?.itemsOk) || 0) / t) * 100);
  }

  porcentajeChecklistEra(u: UnidadDashboard): number {
    const c = u.checklistEra;
    const t = Number(c?.totalItems) || 0;
    if (t <= 0) {
      return 0;
    }
    return Math.round(((Number(c?.itemsOk) || 0) / t) * 100);
  }

  porcentajeChecklistTrauma(u: UnidadDashboard): number {
    const c = u.checklistTrauma;
    const t = Number(c?.totalItems) || 0;
    if (t <= 0) {
      return 0;
    }
    return Math.round(((Number(c?.itemsOk) || 0) / t) * 100);
  }

  fechaChecklistCorta(iso: string | undefined | null): string {
    if (!iso) {
      return '—';
    }
    try {
      return formatDate(iso, 'dd/MM/yyyy', 'es-CL');
    } catch {
      return '—';
    }
  }

  itemsChecklistEtiqueta(
    c: UnidadDashboard['checklistUnidad'] | UnidadDashboard['checklistEra'],
  ): string {
    if (!c || c.totalItems == null || c.totalItems <= 0) {
      return 'Sin registro';
    }
    const ok = c.itemsOk ?? 0;
    return `${ok}/${c.totalItems} ítems`;
  }

  itemsChecklistEtiquetaTrauma(c: UnidadDashboard['checklistTrauma']): string {
    if (!c || c.totalItems == null || c.totalItems <= 0) {
      return 'Sin registro';
    }
    const ok = c.itemsOk ?? 0;
    return `${ok}/${c.totalItems} ítems`;
  }

  textoSemaforoUnidad(u: UnidadDashboard): string {
    switch (u.semaforo) {
      case 'operativa':
        return 'Operativa';
      case 'mantencion':
        return 'En mantención';
      case 'fuera_servicio':
        return 'Fuera de servicio';
      default:
        return u.estadoOperativo ? 'Operativa' : 'En mantención';
    }
  }

  clasesPillSemaforo(u: UnidadDashboard): string {
    switch (u.semaforo) {
      case 'operativa':
        return 'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/40';
      case 'mantencion':
        return 'bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/40';
      case 'fuera_servicio':
        return 'bg-red-600/30 text-red-100 ring-1 ring-red-500/50';
      default:
        return u.estadoOperativo
          ? 'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/40'
          : 'bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/40';
    }
  }

  clasesCardSemaforo(u: UnidadDashboard): string {
    switch (u.semaforo) {
      case 'operativa':
        return 'border-emerald-700/40 hover:border-emerald-500/60';
      case 'mantencion':
        return 'border-amber-700/40 hover:border-amber-500/60';
      case 'fuera_servicio':
        return 'border-red-700/50 hover:border-red-500/70';
      default:
        return u.estadoOperativo
          ? 'border-emerald-700/40 hover:border-emerald-500/60'
          : 'border-amber-700/40 hover:border-amber-500/60';
    }
  }

  clasesHeaderSemaforo(u: UnidadDashboard): string {
    switch (u.semaforo) {
      case 'operativa':
        return 'from-emerald-600 to-emerald-700';
      case 'mantencion':
        return 'from-amber-500 to-amber-700';
      case 'fuera_servicio':
        return 'from-red-600 to-red-800';
      default:
        return u.estadoOperativo ? 'from-emerald-600 to-emerald-700' : 'from-amber-500 to-amber-700';
    }
  }

  clasesBarraSemaforo(u: UnidadDashboard): string {
    switch (u.semaforo) {
      case 'operativa':
        return 'bg-emerald-100';
      case 'mantencion':
        return 'bg-amber-100';
      case 'fuera_servicio':
        return 'bg-red-100';
      default:
        return u.estadoOperativo ? 'bg-emerald-100' : 'bg-amber-100';
    }
  }

  conteoSemaforo(tipo: 'operativa' | 'mantencion' | 'fuera_servicio'): number {
    return this.datos?.unidadesSemaforo.filter((u) => u.semaforo === tipo).length ?? 0;
  }

  toggleCuadroHonor(): void {
    this.mostrarCuadroHonor = !this.mostrarCuadroHonor;
  }

  cargoCuadroHonor(cargo: string | null | undefined): string {
    const raw = String(cargo ?? '')
      .trim()
      .toUpperCase();
    if (!raw) return 'Sin cargo';
    return raw
      .replace(/_COMPANIA/g, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
