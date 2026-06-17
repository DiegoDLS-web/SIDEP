import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import type { ChecklistEjecucionDTO } from '../models/checklist.dto';
import type { DashboardResumenDto } from '../models/dashboard.dto';
import type {
  AuditoriaChecklistFilaDto,
  AuditoriaFiltrosDto,
  AuditoriaHallazgoDto,
  AuditoriaItemDto,
  AuditoriaMetricasDto,
  AuditoriaPaginaDto,
  AuditoriaUsuarioFilaDto,
  EstadoValidacion,
} from '../models/auditoria.dto';
import type { UsuarioListaDto, UsuariosMetricasDto } from '../models/usuario.dto';
import { DashboardService } from './dashboard.service';
import { ChecklistsService } from './checklists.service';
import { UsuariosService } from './usuarios.service';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly dashboardApi = inject(DashboardService);
  private readonly checklistsApi = inject(ChecklistsService);
  private readonly usuariosApi = inject(UsuariosService);

  healthCheck(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>('/api/health').pipe(
      catchError(() => of({ status: 'No disponible' })),
    );
  }

  listarLogs(filtros: AuditoriaFiltrosDto = {}): Observable<AuditoriaPaginaDto> {
    let params = new HttpParams()
      .set('page', String(filtros.page ?? 1))
      .set('pageSize', String(filtros.pageSize ?? 20));

    if (filtros.rut?.trim()) params = params.set('rut', filtros.rut.trim());
    if (filtros.accion?.trim()) params = params.set('accion', filtros.accion.trim());
    if (filtros.entidad?.trim()) params = params.set('entidad', filtros.entidad.trim());
    if (filtros.desde?.trim()) params = params.set('desde', filtros.desde.trim());
    if (filtros.hasta?.trim()) params = params.set('hasta', filtros.hasta.trim());

    return this.http.get<AuditoriaPaginaDto>('/api/auditoria', { params });
  }

  obtenerResumenDashboard(anio = new Date().getFullYear()): Observable<DashboardResumenDto | null> {
    return this.dashboardApi.resumen(anio, 'todos', 'todas').pipe(catchError(() => of(null)));
  }

  obtenerHistorialChecklists(carroId?: string): Observable<ChecklistEjecucionDTO[]> {
    return this.checklistsApi.getHistorial(carroId).pipe(
      map((res) => res.data ?? []),
      catchError(() => of([])),
    );
  }

  obtenerMetricasUsuarios(): Observable<UsuariosMetricasDto | null> {
    return this.usuariosApi.metricas().pipe(catchError(() => of(null)));
  }

  listarUsuariosAuditoria(page = 1, pageSize = 50, q = ''): Observable<UsuarioListaDto[]> {
    return this.usuariosApi.listarPagina(page, pageSize, q).pipe(
      map((res) => res.items ?? []),
      catchError(() => of([])),
    );
  }

  cargarMetricasGenerales(): Observable<AuditoriaMetricasDto> {
    const anio = new Date().getFullYear();
    return forkJoin({
      health: this.healthCheck(),
      dashboard: this.obtenerResumenDashboard(anio),
      usuarios: this.obtenerMetricasUsuarios(),
      logs: this.listarLogs({ page: 1, pageSize: 5 }).pipe(catchError(() => of(null))),
    }).pipe(
      map(({ health, dashboard, usuarios, logs }) => {
        const filasChecklist = dashboard ? this.mapearChecklistsDesdeDashboard(dashboard) : [];
        const hallazgosChecklist = this.detectarHallazgosChecklists(filasChecklist);
        const erroresLogs = (logs?.items ?? []).filter((i) => i.resultado !== 'OK').length;

        const totalFormularios = filasChecklist.length;
        const completos = filasChecklist.filter((f) => f.estado === 'ok').length;
        const formulariosCompletosPct =
          totalFormularios > 0 ? Math.round((completos / totalFormularios) * 100) : 0;

        const erroresUsuarios = usuarios ? Math.max(0, usuarios.inactivos) : 0;
        const erroresDetectados =
          hallazgosChecklist.filter((h) => h.severidad === 'error').length + erroresLogs + erroresUsuarios;
        const alertasDetectadas = hallazgosChecklist.filter((h) => h.severidad === 'alerta').length;

        return {
          formulariosCompletosPct,
          erroresDetectados,
          alertasDetectadas,
          registrosRevisados: totalFormularios + (usuarios?.totalSistema ?? 0),
          servidorOperativo: health.status.toLowerCase().includes('operativo'),
          ultimaRevision: new Date().toISOString(),
        };
      }),
    );
  }

  mapearChecklistsDesdeDashboard(dashboard: DashboardResumenDto): AuditoriaChecklistFilaDto[] {
    const filas: AuditoriaChecklistFilaDto[] = [];

    for (const u of dashboard.unidadesSemaforo ?? []) {
      const tipos: Array<{ tipo: 'unidad' | 'era' | 'trauma'; data: typeof u.checklistUnidad; label: string }> = [
        { tipo: 'unidad', data: u.checklistUnidad, label: 'Checklist carro' },
        { tipo: 'era', data: u.checklistEra, label: 'Checklist ERA' },
        { tipo: 'trauma', data: u.checklistTrauma, label: 'Bolso trauma' },
      ];

      for (const t of tipos) {
        const c = t.data;
        const total = c?.totalItems ?? null;
        const ok = c?.itemsOk ?? null;
        const pct =
          total && total > 0 ? Math.round(((ok ?? 0) / total) * 100) : c?.completo ? 100 : 0;
        const observaciones: string[] = [];

        if (!c || !c.fecha) observaciones.push('Sin registro de revisión');
        if (total == null || total <= 0) observaciones.push('Sin ítems configurados');
        if (ok != null && total != null && ok < total) observaciones.push('Ítems pendientes de verificación');

        let estado: EstadoValidacion = 'ok';
        if (!c?.fecha || (total != null && total > 0 && (ok ?? 0) < total)) estado = 'error';
        else if (!c?.completo || pct < 100) estado = 'alerta';

        filas.push({
          unidad: u.nomenclatura,
          nombre: u.nombre,
          tipo: t.tipo,
          fecha: c?.fecha ?? null,
          totalItems: total,
          itemsOk: ok,
          completo: Boolean(c?.completo),
          pctCompletitud: pct,
          estado,
          observaciones,
        });
      }
    }

    return filas;
  }

  auditarUsuarios(usuarios: UsuarioListaDto[]): AuditoriaUsuarioFilaDto[] {
    const camposRequeridos: Array<{ key: keyof UsuarioListaDto; label: string }> = [
      { key: 'email', label: 'Correo electrónico' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'rol', label: 'Rol' },
      { key: 'compania', label: 'Compañía' },
      { key: 'estadoVoluntario', label: 'Estado voluntario' },
    ];

    return usuarios.map((u) => {
      const camposVacios = camposRequeridos
        .filter(({ key }) => {
          const val = u[key];
          return val == null || String(val).trim() === '';
        })
        .map(({ label }) => label);

      let estado: EstadoValidacion = 'ok';
      if (!u.activo) estado = 'error';
      else if (camposVacios.length > 0) estado = 'alerta';

      return {
        rut: u.rut,
        nombre: u.nombre,
        rol: u.rol,
        email: u.email,
        telefono: u.telefono,
        activo: u.activo,
        camposVacios,
        estado,
      };
    });
  }

  detectarHallazgosChecklists(filas: AuditoriaChecklistFilaDto[]): AuditoriaHallazgoDto[] {
    const hallazgos: AuditoriaHallazgoDto[] = [];

    for (const f of filas) {
      for (const obs of f.observaciones) {
        hallazgos.push({
          id: `${f.unidad}-${f.tipo}-${obs}`,
          modulo: 'Checklists',
          entidad: `${f.unidad} · ${this.etiquetaTipoChecklist(f.tipo)}`,
          campo: f.tipo,
          mensaje: obs,
          severidad: f.estado,
        });
      }
    }

    return hallazgos;
  }

  detectarHallazgosUsuarios(filas: AuditoriaUsuarioFilaDto[]): AuditoriaHallazgoDto[] {
    const hallazgos: AuditoriaHallazgoDto[] = [];

    for (const u of filas) {
      if (!u.activo) {
        hallazgos.push({
          id: `usr-inactivo-${u.rut}`,
          modulo: 'Usuarios',
          entidad: u.nombre,
          campo: 'activo',
          mensaje: 'Voluntario marcado como inactivo',
          severidad: 'error',
          valor: u.rut,
        });
      }
      for (const campo of u.camposVacios) {
        hallazgos.push({
          id: `usr-vacio-${u.rut}-${campo}`,
          modulo: 'Usuarios',
          entidad: u.nombre,
          campo,
          mensaje: `Campo vacío: ${campo}`,
          severidad: 'alerta',
          valor: u.rut,
        });
      }
    }

    return hallazgos;
  }

  detectarHallazgosLogs(logs: AuditoriaItemDto[]): AuditoriaHallazgoDto[] {
    return logs
      .filter((l) => l.resultado !== 'OK')
      .map((l) => ({
        id: `log-${l.id}`,
        modulo: 'Trazabilidad',
        entidad: l.accion,
        campo: l.entidad ?? '—',
        mensaje: l.detalle ?? 'Operación con resultado fallido',
        severidad: 'error' as EstadoValidacion,
        valor: l.usuarioRut,
      }));
  }

  etiquetaTipoChecklist(tipo: AuditoriaChecklistFilaDto['tipo']): string {
    switch (tipo) {
      case 'unidad':
        return 'Checklist carro';
      case 'era':
        return 'Checklist ERA';
      case 'trauma':
        return 'Bolso de trauma';
      default:
        return tipo;
    }
  }

  iconoEstado(estado: EstadoValidacion): string {
    switch (estado) {
      case 'ok':
        return '✅';
      case 'alerta':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '—';
    }
  }

  clasesChipEstado(estado: EstadoValidacion): string {
    switch (estado) {
      case 'ok':
        return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35';
      case 'alerta':
        return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/35';
      case 'error':
        return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/35';
      default:
        return 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/35';
    }
  }
}
