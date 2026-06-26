import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { apiUrl } from '../utils/api-url.util';
import {
  ChecklistPlantillaDTO,
  ChecklistEjecucionDTO,
  RegistrarChecklistDTO,
  ChecklistUnidadResponseDto,
  ChecklistRegistroDto,
  ChecklistResumenUnidadDto,
  ChecklistEraPaginaDto,
} from '../models/checklist.dto';
import { CarrosService } from './carros.service';
import type { CarroDto } from '../models/carro.dto';
import { calcularEstadoChecklist } from '../utils/checklist-estado';

type PlantillaTipo = 'ERA' | 'TRAUMA' | string;

@Injectable({ providedIn: 'root' })
export class ChecklistsService {
  private readonly http = inject(HttpClient);
  private readonly carrosApi = inject(CarrosService);
  private readonly apiUrl = apiUrl('logistica', 'checklist');

  private readonly storagePlantillas = 'sidep_checklist_plantillas_v1';
  private readonly storageEraHistorial = 'sidep_checklist_era_historial_v1';

  obtenerChecklistUnidad(unidad: string): Observable<ChecklistUnidadResponseDto> {
    return this.carrosApi.listar().pipe(
      switchMap((carros) => {
        const carro =
          carros.find((c) => c.nomenclatura === unidad || String(c.id) === unidad) ?? null;
        if (!carro) {
          return of({
            unidad,
            carro: { id: '', nomenclatura: unidad, nombre: `Unidad ${unidad}` },
            checklist: null,
          });
        }
        return this.getHistorial(String(carro.id), 'UNIDAD').pipe(
          map((res) => {
            const ultimo = this.mapEjecucionToRegistro(res.data?.[0], carro);
            return {
              unidad,
              carro: { id: carro.id, nomenclatura: carro.nomenclatura, nombre: carro.nombre },
              checklist: ultimo,
            };
          }),
          catchError(() =>
            of({
              unidad,
              carro: { id: carro.id, nomenclatura: carro.nomenclatura, nombre: carro.nombre },
              checklist: null,
            }),
          ),
        );
      }),
      catchError(() =>
        of({
          unidad,
          carro: { id: '', nomenclatura: unidad, nombre: `Unidad ${unidad}` },
          checklist: null,
        }),
      ),
    );
  }

  obtenerPlantillaUnidad(unidad: string): Observable<{ ubicaciones: unknown[] }> {
    return this.getPlantillas().pipe(
      map((res) => {
        const plantilla = res.data?.find((p) => p.codigo === `CHK-${unidad}`);
        if (!plantilla) return { ubicaciones: [] };
        const estructura =
          typeof plantilla.estructuraJson === 'string'
            ? JSON.parse(plantilla.estructuraJson)
            : plantilla.estructuraJson;
        return { ubicaciones: estructura?.ubicaciones ?? estructura ?? [] };
      }),
      catchError(() => of({ ubicaciones: [] })),
    );
  }

  guardarChecklistUnidad(unidad: string, payload: Record<string, unknown>): Observable<unknown> {
    return this.carrosApi.listar().pipe(
      switchMap((carros) => {
        const carro = carros.find((c) => c.nomenclatura === unidad);
        if (!carro) {
          return throwError(() => new Error(`No se encontró el carro ${unidad}.`));
        }
        const detalle = (payload['detalle'] as Record<string, unknown>) ?? {};
        const request: RegistrarChecklistDTO = {
          carroId: String(carro.id),
          revisorRut: String(payload['cuarteleroId'] ?? ''),
          resultadosMateriales: {
            ...detalle,
            inspector: payload['inspector'] ?? null,
            grupoGuardia: payload['grupoGuardia'] ?? null,
            observaciones: payload['observaciones'] ?? null,
            totalItems: payload['totalItems'] ?? null,
            itemsOk: payload['itemsOk'] ?? null,
          },
          entidadTipo: 'CARRO',
          firmaOficial: (payload['firmaOficial'] as string | null) ?? null,
          firmaInspector: (payload['firmaInspector'] as string | null) ?? null,
        };
        return this.registrarEjecucion(request);
      }),
    );
  }

  obtenerInventarioChecklistCarro(carroId: string): Observable<{ ubicaciones: unknown[]; fuente: string; totalMateriales: number }> {
    return this.http
      .get<{
        success: boolean;
        data: { ubicaciones: unknown[]; fuente: string; totalMateriales: number };
      }>(apiUrl('logistica', 'equipamiento', 'carro', carroId, 'checklist-inventario'))
      .pipe(
        map((res) => res.data ?? { ubicaciones: [], fuente: 'vacio', totalMateriales: 0 }),
        catchError(() => of({ ubicaciones: [], fuente: 'vacio', totalMateriales: 0 })),
      );
  }

  sincronizarInventarioCarro(carroId: string, ubicaciones: unknown[]): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(apiUrl('logistica', 'equipamiento', 'carro', carroId, 'sincronizar-inventario'), {
        ubicaciones,
      })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

  guardarPlantillaUnidad(unidad: string, payload: { ubicaciones: unknown[] }): Observable<boolean> {
    const codigo = `CHK-${unidad}`;
    const plantillaBase = {
      codigo,
      nombre: `Plantilla ${unidad}`,
      entidadTipo: 'CARRO',
      estructuraJson: payload.ubicaciones,
      version: 1,
      activo: 1,
    };
    return this.getPlantillas().pipe(
      switchMap((res) => {
        const existente = res.data?.find((p) => p.codigo === codigo);
        const guardarPlantilla$ = existente
          ? this.updatePlantilla(existente.id, {
              estructuraJson: payload.ubicaciones,
              nombre: plantillaBase.nombre,
            })
          : this.createPlantilla(plantillaBase);
        return guardarPlantilla$.pipe(map(() => true));
      }),
      catchError(() => of(false)),
    );
  }

  resumenUnidades(): Observable<ChecklistResumenUnidadDto[]> {
    return this.carrosApi.listar().pipe(
      switchMap((carros) => {
        if (carros.length === 0) {
          return of([]);
        }
        return forkJoin(
          carros.map((carro) =>
            this.getHistorial(String(carro.id), 'UNIDAD').pipe(
              map((res) => this.mapResumenUnidad(carro, res.data ?? [])),
              catchError(() => of(this.mapResumenUnidad(carro, []))),
            ),
          ),
        );
      }),
      catchError(() => of([])),
    );
  }

  historialUnidad(unidad: string): Observable<ChecklistRegistroDto[]> {
    return this.carrosApi.listar().pipe(
      switchMap((carros) => {
        const carro = carros.find((c) => c.nomenclatura === unidad || String(c.id) === unidad);
        if (!carro) return of([]);
        return this.getHistorial(String(carro.id), 'UNIDAD').pipe(
          map((res) =>
            (res.data ?? [])
              .map((e) => this.mapEjecucionToRegistro(e, carro))
              .filter(Boolean) as ChecklistRegistroDto[],
          ),
          catchError(() => of([])),
        );
      }),
      catchError(() => of([])),
    );
  }

  /** Historial de todos los tipos (unidad, ERA, trauma) para la vista general. */
  historialCompletoUnidad(unidad: string): Observable<ChecklistRegistroDto[]> {
    return this.carrosApi.listar().pipe(
      switchMap((carros) => {
        const carro = carros.find((c) => c.nomenclatura === unidad || String(c.id) === unidad);
        if (!carro) return of([]);
        return this.getHistorial(String(carro.id)).pipe(
          map((res) =>
            (res.data ?? [])
              .map((e) => this.mapEjecucionToRegistro(e, carro))
              .filter(Boolean) as ChecklistRegistroDto[],
          ),
          catchError(() => of([])),
        );
      }),
      catchError(() => of([])),
    );
  }

  obtenerPlantilla(tipo: PlantillaTipo, unidad: string): Observable<unknown | null> {
    const local = this.leerPlantillaLocal(tipo, unidad);
    if (local) return of(local);
    return this.getPlantillas().pipe(
      map((res) => {
        const codigo = `${tipo}-${unidad}`;
        const p = res.data?.find((x) => x.codigo === codigo || x.codigo === `CHK-${unidad}`);
        if (!p) return null;
        return typeof p.estructuraJson === 'string' ? JSON.parse(p.estructuraJson) : p.estructuraJson;
      }),
      catchError(() => of(null)),
    );
  }

  guardarPlantilla(tipo: PlantillaTipo, unidad: string, plantilla: unknown): Observable<boolean> {
    this.guardarPlantillaLocal(tipo, unidad, plantilla);
    const payload = {
      codigo: `${tipo}-${unidad}`,
      nombre: `Plantilla ${tipo} ${unidad}`,
      entidadTipo: tipo,
      estructuraJson: plantilla,
      version: 1,
      activo: 1,
    };
    return this.createPlantilla(payload).pipe(
      map(() => true),
      catchError(() => of(true)),
    );
  }

  historialEraUnidad(unidad: string): Observable<ChecklistRegistroDto[]> {
    const rows = this.leerHistorialEraLocal().filter((r) => r.unidad === unidad || String(r.carroId) === unidad);
    return of(rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
  }

  eraUltimosPorUnidad(): Observable<ChecklistRegistroDto[]> {
    const rows = this.leerHistorialEraLocal();
    const mapa = new Map<string, ChecklistRegistroDto>();
    for (const r of rows) {
      const key = String(r.carro?.nomenclatura ?? r.unidad ?? '');
      if (!key) continue;
      const prev = mapa.get(key);
      if (!prev || new Date(r.fecha).getTime() > new Date(prev.fecha).getTime()) {
        mapa.set(key, r);
      }
    }
    return of([...mapa.values()]);
  }

  eraPagina(params: {
    page?: number;
    pageSize?: number;
    unidades?: string;
    desde?: string;
    hasta?: string;
  }): Observable<ChecklistEraPaginaDto> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    let rows = [...this.leerHistorialEraLocal()];

    if (params.unidades?.trim()) {
      const set = new Set(params.unidades.split(',').map((u) => u.trim()).filter(Boolean));
      rows = rows.filter((r) => set.has(String(r.carro?.nomenclatura ?? r.unidad ?? '')));
    }
    if (params.desde?.trim()) {
      const desde = new Date(params.desde).getTime();
      rows = rows.filter((r) => !Number.isNaN(desde) && new Date(r.fecha).getTime() >= desde);
    }
    if (params.hasta?.trim()) {
      const hasta = new Date(params.hasta);
      hasta.setHours(23, 59, 59, 999);
      const ht = hasta.getTime();
      rows = rows.filter((r) => !Number.isNaN(ht) && new Date(r.fecha).getTime() <= ht);
    }

    rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return of({
      items: rows.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    });
  }

  guardarChecklistEra(payload: Record<string, unknown>): Observable<ChecklistRegistroDto> {
    const unidad = String(payload['unidad'] ?? '');
    const obacId = String(payload['cuarteleroId'] ?? '');
    const obacNombre = String(payload['obacNombre'] ?? payload['cuarteleroNombre'] ?? '').trim();
    const registro: ChecklistRegistroDto = {
      id: crypto.randomUUID(),
      carroId: unidad,
      cuarteleroId: obacId,
      fecha: new Date().toISOString(),
      tipo: 'ERA',
      inspector: (payload['inspector'] as string | null) ?? null,
      grupoGuardia: (payload['grupoGuardia'] as string | null) ?? null,
      firmaOficial: (payload['firmaOficial'] as string | null) ?? null,
      firmaInspector: (payload['firmaInspector'] as string | null) ?? null,
      observaciones: (payload['observaciones'] as string | null) ?? null,
      totalItems: Number(payload['totalItems']) || 0,
      itemsOk: Number(payload['itemsOk']) || 0,
      detalle: payload['detalle'] ?? null,
      unidad,
      carro: {
        id: unidad,
        nomenclatura: unidad,
        nombre: `Unidad ${unidad}`,
      },
      cuartelero: obacNombre
        ? { id: obacId, nombre: obacNombre, rol: '' }
        : obacId
          ? { id: obacId, nombre: obacId, rol: '' }
          : undefined,
    };

    const guardarLocal = () => {
      const historial = this.leerHistorialEraLocal();
      historial.unshift(registro);
      this.guardarHistorialEraLocal(historial.slice(0, 500));
    };

    return this.carrosApi.listar().pipe(
      switchMap((carros) => {
        const carro = carros.find((c) => c.nomenclatura === unidad);
        if (!carro) {
          guardarLocal();
          return of(registro);
        }
        const detalle = (payload['detalle'] as Record<string, unknown>) ?? {};
        const request: RegistrarChecklistDTO = {
          carroId: String(carro.id),
          revisorRut: String(payload['cuarteleroId'] ?? ''),
          resultadosMateriales: {
            ...detalle,
            totalItems: payload['totalItems'] ?? 0,
            itemsOk: payload['itemsOk'] ?? 0,
            inspector: payload['inspector'] ?? null,
            grupoGuardia: payload['grupoGuardia'] ?? null,
            observaciones: payload['observaciones'] ?? null,
          },
          entidadTipo: 'ERA',
          firmaOficial: (payload['firmaOficial'] as string | null) ?? null,
          firmaInspector: (payload['firmaInspector'] as string | null) ?? null,
        };
        return this.registrarEjecucion(request).pipe(
          map(() => {
            guardarLocal();
            return registro;
          }),
          catchError(() => {
            guardarLocal();
            return of(registro);
          }),
        );
      }),
      catchError(() => {
        guardarLocal();
        return of(registro);
      }),
    );
  }

  getPlantillas(): Observable<{ success: boolean; data: ChecklistPlantillaDTO[] }> {
    return this.http
      .get<{ success: boolean; data: ChecklistPlantillaDTO[] }>(`${this.apiUrl}/plantillas`)
      .pipe(catchError(() => of({ success: true, data: [] })));
  }

  createPlantilla(data: Record<string, unknown>): Observable<{ success: boolean; data: ChecklistPlantillaDTO }> {
    return this.http.post<{ success: boolean; data: ChecklistPlantillaDTO }>(`${this.apiUrl}/plantillas`, data);
  }

  updatePlantilla(
    id: string,
    data: Record<string, unknown>,
  ): Observable<{ success: boolean; data: ChecklistPlantillaDTO }> {
    return this.http.patch<{ success: boolean; data: ChecklistPlantillaDTO }>(`${this.apiUrl}/plantillas/${id}`, data);
  }

  registrarEjecucion(data: RegistrarChecklistDTO): Observable<{ success: boolean; data: ChecklistEjecucionDTO }> {
    return this.http.post<{ success: boolean; data: ChecklistEjecucionDTO }>(`${this.apiUrl}/ejecucion`, data);
  }

  getHistorial(
    carroId?: string,
    entidadTipo?: 'CARRO' | 'UNIDAD' | 'ERA' | 'TRAUMA',
  ): Observable<{ success: boolean; data: ChecklistEjecucionDTO[] }> {
    let params = new HttpParams().set('excluirBorradores', '1');
    if (carroId) params = params.set('carroId', carroId);
    if (entidadTipo) params = params.set('entidadTipo', entidadTipo);
    return this.http
      .get<{ success: boolean; data: ChecklistEjecucionDTO[] }>(`${this.apiUrl}/historial`, { params })
      .pipe(catchError(() => of({ success: true, data: [] })));
  }

  getDetalleEjecucion(id: string): Observable<{ success: boolean; data: ChecklistEjecucionDTO }> {
    return this.http.get<{ success: boolean; data: ChecklistEjecucionDTO }>(`${this.apiUrl}/ejecucion/${id}`);
  }

  private mapResumenUnidad(carro: CarroDto, ejecuciones: ChecklistEjecucionDTO[]): ChecklistResumenUnidadDto {
    const ultimo = ejecuciones[0];
    const registro = ultimo ? this.mapEjecucionToRegistro(ultimo, carro) : null;
    const totalItems = registro?.totalItems ?? 0;
    const itemsOk = registro?.itemsOk ?? 0;
    return {
      id: carro.id,
      unidad: carro.nomenclatura,
      nombre: carro.nombre ?? carro.nomenclatura,
      imagenUrl: carro.imagenUrl,
      ultimaRevision: registro
        ? {
            fecha: registro.fecha,
            inspector: registro.inspector,
            obac: registro.cuartelero?.nombre ?? null,
            responsable: registro.cuartelero?.nombre ?? '—',
            completado: (registro.totalItems ?? 0) > 0 && (registro.itemsOk ?? 0) >= (registro.totalItems ?? 0),
            estadoChecklist: registro.estadoChecklist,
          }
        : null,
      itemsTotal: totalItems,
      itemsOk,
      itemsFaltantes: Math.max(totalItems - itemsOk, 0),
    };
  }

  private extraerMaterialesDesdeDetalle(detalle: unknown): Array<{
    cantidadActual?: number;
    cantidadRequerida?: number;
    nombre?: string;
  }> {
    if (Array.isArray(detalle)) {
      return detalle as Array<{ cantidadActual?: number; cantidadRequerida?: number; nombre?: string }>;
    }
    if (detalle && typeof detalle === 'object') {
      const ubicaciones = (detalle as { ubicaciones?: unknown[] }).ubicaciones;
      if (Array.isArray(ubicaciones)) {
        return ubicaciones.flatMap((u) => {
          const mats = (u as { materiales?: unknown[] }).materiales;
          return Array.isArray(mats) ? mats : [];
        }) as Array<{ cantidadActual?: number; cantidadRequerida?: number; nombre?: string }>;
      }
    }
    return [];
  }

  private mapEjecucionToRegistro(
    ejecucion: ChecklistEjecucionDTO | undefined,
    carro: CarroDto,
  ): ChecklistRegistroDto | null {
    if (!ejecucion) return null;
    let detalle: Record<string, unknown> | null = null;
    let rawDetalle: unknown = ejecucion.respuestasJson;
    if (typeof rawDetalle === 'string') {
      try {
        rawDetalle = JSON.parse(rawDetalle);
      } catch {
        rawDetalle = null;
      }
    }
    if (rawDetalle && typeof rawDetalle === 'object') {
      detalle = rawDetalle as Record<string, unknown>;
    }
    const materiales = this.extraerMaterialesDesdeDetalle(detalle);
    const totalItems = Number(detalle?.['totalItems']) || materiales.length || null;
    const itemsOk = Number(detalle?.['itemsOk']) || materiales.filter((m) => {
      const req = Math.max(0, Number(m.cantidadRequerida ?? 0));
      const act = Math.max(0, Number(m.cantidadActual ?? 0));
      return req > 0 && act >= req;
    }).length;
    const revisorNombre = ejecucion.revisor
      ? `${ejecucion.revisor.nombres} ${ejecucion.revisor.apellidoPaterno}`.trim()
      : null;
    const inspectorTexto = typeof detalle?.['inspector'] === 'string'
      ? (detalle['inspector'] as string).trim()
      : '';
    const grupoGuardia = typeof detalle?.['grupoGuardia'] === 'string'
      ? (detalle['grupoGuardia'] as string).trim()
      : detalle?.['grupoGuardia'] != null
        ? String(detalle['grupoGuardia'])
        : null;
    const observaciones = typeof detalle?.['observaciones'] === 'string'
      ? (detalle['observaciones'] as string).trim() || null
      : null;
    const esBorrador =
      ejecucion.estado === 'BORRADOR' ||
      detalle?.['borrador'] === true;
    return {
      id: ejecucion.id,
      carroId: carro.id,
      cuarteleroId: ejecucion.revisorRut,
      fecha: String(ejecucion.fechaRevision),
      tipo: ejecucion.entidadTipo ?? 'CARRO',
      inspector: inspectorTexto || null,
      grupoGuardia: grupoGuardia || null,
      firmaOficial: ejecucion.firmaOficial ?? null,
      firmaInspector: ejecucion.firmaRevisor ?? null,
      observaciones,
      totalItems,
      itemsOk: totalItems ? itemsOk : null,
      detalle,
      estadoChecklist: esBorrador
        ? 'PENDIENTE'
        : calcularEstadoChecklist(totalItems, itemsOk, observaciones),
      carro: { id: carro.id, nomenclatura: carro.nomenclatura, nombre: carro.nombre },
      cuartelero: revisorNombre
        ? { id: ejecucion.revisorRut, nombre: revisorNombre, rol: '' }
        : undefined,
      unidad: carro.nomenclatura,
    };
  }

  private leerPlantillaLocal(tipo: PlantillaTipo, unidad: string): unknown | null {
    try {
      const raw = localStorage.getItem(this.storagePlantillas);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, unknown>;
      return map[`${tipo}:${unidad}`] ?? null;
    } catch {
      return null;
    }
  }

  private guardarPlantillaLocal(tipo: PlantillaTipo, unidad: string, plantilla: unknown): void {
    try {
      const raw = localStorage.getItem(this.storagePlantillas);
      const map = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      map[`${tipo}:${unidad}`] = plantilla;
      localStorage.setItem(this.storagePlantillas, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }

  private leerHistorialEraLocal(): ChecklistRegistroDto[] {
    try {
      const raw = localStorage.getItem(this.storageEraHistorial);
      return raw ? (JSON.parse(raw) as ChecklistRegistroDto[]) : [];
    } catch {
      return [];
    }
  }

  private guardarHistorialEraLocal(rows: ChecklistRegistroDto[]): void {
    try {
      localStorage.setItem(this.storageEraHistorial, JSON.stringify(rows));
    } catch {
      /* ignore */
    }
  }
}
