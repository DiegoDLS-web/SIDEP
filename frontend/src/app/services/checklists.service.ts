import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import type {
  EstadoChecklist,
  ChecklistEraPaginaDto,
  ChecklistPlantillaUnidadResponseDto,
  ChecklistRegistroDto,
  ChecklistResumenUnidadDto,
  ChecklistUnidadResponseDto,
} from '../models/checklist.dto';

export type ChecklistUnidadPayload = {
  cuarteleroId: number;
  inspector?: string;
  grupoGuardia?: string;
  firmaOficial?: string | null;
  firmaInspector?: string | null;
  observaciones?: string;
  totalItems?: number;
  itemsOk?: number;
  detalle?: unknown;
};

export type ChecklistEraPayload = ChecklistUnidadPayload & { unidad: string };
export type PlantillaTipo = 'UNIDAD' | 'ERA' | 'TRAUMA';

@Injectable({ providedIn: 'root' })
export class ChecklistsService {
  private readonly http = inject(HttpClient);
  private readonly demoResumen: ChecklistResumenUnidadDto[] = [
    {
      id: 1,
      unidad: 'B-1',
      nombre: 'Carro Bomba',
      ultimaRevision: {
        fecha: new Date().toISOString(),
        inspector: 'Inspector demo',
        obac: 'OBAC demo',
        responsable: 'Inspector demo',
        completado: false,
      },
      itemsTotal: 42,
      itemsOk: 40,
      itemsFaltantes: 2,
    },
    {
      id: 2,
      unidad: 'BX-1',
      nombre: 'Carro Multipropósito',
      ultimaRevision: {
        fecha: new Date().toISOString(),
        inspector: 'Inspector demo',
        obac: 'OBAC demo',
        responsable: 'Inspector demo',
        completado: false,
      },
      itemsTotal: 40,
      itemsOk: 35,
      itemsFaltantes: 5,
    },
    {
      id: 3,
      unidad: 'R-1',
      nombre: 'Carro de Rescate',
      ultimaRevision: {
        fecha: new Date().toISOString(),
        inspector: 'Inspector demo',
        obac: 'OBAC demo',
        responsable: 'Inspector demo',
        completado: true,
      },
      itemsTotal: 47,
      itemsOk: 47,
      itemsFaltantes: 0,
    },
  ];

  resumenUnidades(): Observable<ChecklistResumenUnidadDto[]> {
    return this.http.get<ChecklistResumenUnidadDto[]>('/api/checklists/selector').pipe(
      map((items) => this.normalizarResumenUnidades(items)),
      catchError(() => of(this.normalizarResumenUnidades(this.demoResumen))),
    );
  }

  private normalizarResumenUnidades(items: ChecklistResumenUnidadDto[]): ChecklistResumenUnidadDto[] {
    if (!Array.isArray(items)) {
      return this.normalizarResumenUnidades(this.demoResumen);
    }
    return items.map((u, idx) => {
      const rawUnidad = String(
        (u as { unidad?: string; nomenclatura?: string }).unidad ??
          (u as { nomenclatura?: string }).nomenclatura ??
          '',
      ).trim();
      const unidad = rawUnidad || `U-${typeof u.id === 'number' ? u.id : idx}`;
      const nombre =
        String(u.nombre ?? '').trim() ||
        (rawUnidad ? `Unidad ${rawUnidad}` : `Unidad ${unidad}`);
      const itemsTotal = Math.max(0, Number(u.itemsTotal) || 0);
      const itemsOk = Math.max(0, Number(u.itemsOk) || 0);
      const itemsFaltantes =
        Number.isFinite(Number(u.itemsFaltantes)) && u.itemsFaltantes != null
          ? Math.max(0, Number(u.itemsFaltantes))
          : Math.max(itemsTotal - itemsOk, 0);
      return {
        ...u,
        id: Number.isFinite(Number(u.id)) ? Number(u.id) : idx,
        unidad,
        nombre,
        itemsTotal,
        itemsOk,
        itemsFaltantes,
        ultimaRevision: this.normalizarUltimaRevision(u.ultimaRevision),
      };
    });
  }

  private normalizarUltimaRevision(
    r: ChecklistResumenUnidadDto['ultimaRevision'],
  ): ChecklistResumenUnidadDto['ultimaRevision'] {
    if (r == null) return null;
    let fechaIso = '';
    const raw = r.fecha as unknown;
    if (typeof raw === 'string') {
      fechaIso = raw.trim();
    } else if (raw instanceof Date) {
      fechaIso = raw.toISOString();
    } else if (raw != null) {
      fechaIso = String(raw);
    }
    const inspectorT = (r.inspector ?? '').trim();
    const obacT = (r.obac ?? '').trim();
    const legadoStr = typeof r.responsable === 'string' ? r.responsable.trim() : '';
    const inspectorOut =
      inspectorT ||
      (!obacT && legadoStr && legadoStr !== '—' ? legadoStr : null) ||
      null;
    const obacOut = obacT || null;
    const responsableOut = legadoStr || inspectorT || obacT || '—';
    const estadoChecklist: EstadoChecklist =
      (r.estadoChecklist as EstadoChecklist | undefined) ??
      (r.completado ? 'COMPLETADO' : 'PENDIENTE');
    return {
      fecha: fechaIso,
      inspector: inspectorOut,
      obac: obacOut,
      responsable: responsableOut,
      completado: !!r.completado,
      estadoChecklist,
    };
  }

  obtenerChecklistUnidad(unidad: string): Observable<ChecklistUnidadResponseDto> {
    return this.http
      .get<ChecklistUnidadResponseDto>(`/api/checklists/unidad/${encodeURIComponent(unidad)}`)
      .pipe(
        catchError(() =>
          of({
            unidad,
            carro: { id: 1, nomenclatura: unidad, nombre: 'Unidad Demo' },
            checklist: null,
          }),
        ),
      );
  }

  obtenerPlantillaUnidad(unidad: string): Observable<ChecklistPlantillaUnidadResponseDto> {
    return this.http
      .get<ChecklistPlantillaUnidadResponseDto>(
        `/api/checklists/unidad/${encodeURIComponent(unidad)}/plantilla`,
      )
      .pipe(catchError(() => of({ unidad, ubicaciones: [] })));
  }

  guardarPlantillaUnidad(
    unidad: string,
    payload: { ubicaciones: Array<{ nombre: string; materiales: Array<{ nombre: string; cantidadRequerida: number }> }> },
  ): Observable<ChecklistPlantillaUnidadResponseDto> {
    return this.http
      .put<ChecklistPlantillaUnidadResponseDto>(
        `/api/checklists/unidad/${encodeURIComponent(unidad)}/plantilla`,
        payload,
      )
      .pipe(catchError(() => of({ unidad, ubicaciones: payload.ubicaciones })));
  }

  historialUnidad(unidad: string): Observable<ChecklistRegistroDto[]> {
    return this.http
      .get<ChecklistRegistroDto[]>(
        `/api/checklists/unidad/${encodeURIComponent(unidad)}/historial`,
      )
      .pipe(catchError(() => of([])));
  }

  /** Checklists ERA guardados para la nomenclatura del carro (R-1, BX-1, etc.). */
  historialEraUnidad(unidad: string): Observable<ChecklistRegistroDto[]> {
    return this.http
      .get<ChecklistRegistroDto[]>(
        `/api/checklists/unidad/${encodeURIComponent(unidad)}/historial-era`,
      )
      .pipe(catchError(() => of([])));
  }

  guardarChecklistUnidad(unidad: string, payload: ChecklistUnidadPayload): Observable<ChecklistRegistroDto> {
    return this.http.post<ChecklistRegistroDto>(`/api/checklists/unidad/${encodeURIComponent(unidad)}`, payload).pipe(
      catchError(() =>
        of({
          id: Date.now(),
          carroId: 1,
          cuarteleroId: payload.cuarteleroId,
          fecha: new Date().toISOString(),
          tipo: 'UNIDAD',
          inspector: payload.inspector ?? null,
          grupoGuardia: payload.grupoGuardia ?? null,
          firmaOficial: payload.firmaOficial ?? null,
          firmaInspector: payload.firmaInspector ?? null,
          observaciones: payload.observaciones ?? null,
          totalItems: payload.totalItems ?? null,
          itemsOk: payload.itemsOk ?? null,
          detalle: payload.detalle ?? null,
          carro: { id: 1, nomenclatura: unidad, nombre: 'Unidad Demo' },
          cuartelero: { id: payload.cuarteleroId, nombre: 'Modo Demo Local', rol: 'ADMIN' },
        }),
      ),
    );
  }

  listarChecklistEra(): Observable<ChecklistRegistroDto[]> {
    return this.http.get<ChecklistRegistroDto[]>('/api/checklists/era').pipe(catchError(() => of([])));
  }

  /** Último checklist ERA por cada unidad (resúmenes / tarjetas). */
  eraUltimosPorUnidad(): Observable<ChecklistRegistroDto[]> {
    return this.http
      .get<ChecklistRegistroDto[]>('/api/checklists/era/ultimos-por-unidad')
      .pipe(catchError(() => of([])));
  }

  eraPagina(opts: {
    page: number;
    pageSize: number;
    unidad?: string;
    desde?: string;
    hasta?: string;
  }): Observable<ChecklistEraPaginaDto> {
    let params = new HttpParams().set('page', String(opts.page)).set('pageSize', String(opts.pageSize));
    const u = opts.unidad?.trim();
    if (u) params = params.set('unidad', u);
    const desde = opts.desde?.trim();
    if (desde) params = params.set('desde', desde);
    const hasta = opts.hasta?.trim();
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ChecklistEraPaginaDto>('/api/checklists/era/pagina', { params }).pipe(
      catchError(() =>
        of({
          items: [],
          total: 0,
          page: 1,
          pageSize: opts.pageSize,
          totalPages: 1,
        }),
      ),
    );
  }

  guardarChecklistEra(payload: ChecklistEraPayload): Observable<ChecklistRegistroDto> {
    return this.http.post<ChecklistRegistroDto>('/api/checklists/era', payload).pipe(
      catchError(() =>
        of({
          id: Date.now(),
          carroId: 1,
          cuarteleroId: payload.cuarteleroId,
          fecha: new Date().toISOString(),
          tipo: 'ERA',
          inspector: payload.inspector ?? null,
          grupoGuardia: payload.grupoGuardia ?? null,
          firmaOficial: payload.firmaOficial ?? null,
          firmaInspector: payload.firmaInspector ?? null,
          observaciones: payload.observaciones ?? null,
          totalItems: payload.totalItems ?? null,
          itemsOk: payload.itemsOk ?? null,
          detalle: payload.detalle ?? null,
          carro: { id: 1, nomenclatura: payload.unidad, nombre: 'Unidad Demo' },
          cuartelero: { id: payload.cuarteleroId, nombre: 'Modo Demo Local', rol: 'ADMIN' },
        }),
      ),
    );
  }

  obtenerPlantilla(tipo: PlantillaTipo, unidad: string): Observable<unknown | null> {
    return this.http
      .get<{ plantilla: unknown | null }>(
        `/api/checklists/plantillas/${encodeURIComponent(tipo)}/${encodeURIComponent(unidad)}`,
      )
      .pipe(
        map((r) => r?.plantilla ?? null),
        catchError(() => of(null)),
      );
  }

  guardarPlantilla(tipo: PlantillaTipo, unidad: string, plantilla: unknown): Observable<boolean> {
    return this.http
      .put<{ ok: boolean }>(
        `/api/checklists/plantillas/${encodeURIComponent(tipo)}/${encodeURIComponent(unidad)}`,
        { plantilla },
      )
      .pipe(
        map((r) => !!r?.ok),
        catchError(() => of(false)),
      );
  }
}
