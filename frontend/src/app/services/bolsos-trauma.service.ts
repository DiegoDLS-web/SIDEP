import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import type {
  BolsoTraumaHistorialDto,
  BolsoTraumaRegistroDto,
  BolsoTraumaSelectorUnidadDto,
  BolsoTraumaUnidadResponseDto,
} from '../models/bolso-trauma.dto';

export type GuardarBolsoTraumaPayload = {
  cuarteleroId: number;
  inspector?: string;
  grupoGuardia?: string;
  firmaOficial?: string;
  firmaInspector?: string;
  observaciones?: string;
  totalItems?: number;
  itemsOk?: number;
  detalle?: unknown;
};

@Injectable({ providedIn: 'root' })
export class BolsosTraumaService {
  private readonly http = inject(HttpClient);
  private readonly demoSelector: BolsoTraumaSelectorUnidadDto[] = [
    {
      id: 1,
      unidad: 'R-1',
      nombre: 'Carro Rescate',
      cantidadBolsos: 2,
      ultimaRevision: {
        fecha: new Date().toISOString(),
        inspector: 'Inspector Demo',
        obac: 'Modo Demo Local',
        responsable: 'Modo Demo Local',
        completado: true,
      },
      bolsos: [
        { numero: 1, completitud: 100, itemsFaltantes: 0, status: 'complete', estadoChecklist: 'COMPLETADO' },
        { numero: 2, completitud: 75, itemsFaltantes: 2, status: 'incomplete', estadoChecklist: 'PENDIENTE' },
      ],
    },
    {
      id: 2,
      unidad: 'BX-1',
      nombre: 'Carro Multipropósito',
      cantidadBolsos: 2,
      ultimaRevision: {
        fecha: new Date().toISOString(),
        inspector: 'Inspector Demo',
        obac: 'Modo Demo Local',
        responsable: 'Modo Demo Local',
        completado: false,
      },
      bolsos: [
        { numero: 1, completitud: 88, itemsFaltantes: 1, status: 'incomplete', estadoChecklist: 'PENDIENTE' },
        { numero: 2, completitud: 100, itemsFaltantes: 0, status: 'complete', estadoChecklist: 'COMPLETADO' },
      ],
    },
    {
      id: 3,
      unidad: 'B-1',
      nombre: 'Carro Bomba',
      cantidadBolsos: 2,
      ultimaRevision: {
        fecha: new Date().toISOString(),
        inspector: 'Inspector Demo',
        obac: 'Modo Demo Local',
        responsable: 'Modo Demo Local',
        completado: true,
      },
      bolsos: [
        { numero: 1, completitud: 100, itemsFaltantes: 0, status: 'complete', estadoChecklist: 'COMPLETADO' },
        { numero: 2, completitud: 100, itemsFaltantes: 0, status: 'complete', estadoChecklist: 'COMPLETADO' },
      ],
    },
  ];

  selector(): Observable<BolsoTraumaSelectorUnidadDto[]> {
    return this.http
      .get<BolsoTraumaSelectorUnidadDto[]>('/api/bolsos-trauma/selector')
      .pipe(catchError(() => of(this.demoSelector)));
  }

  obtenerUnidad(unidad: string): Observable<BolsoTraumaUnidadResponseDto> {
    return this.http
      .get<BolsoTraumaUnidadResponseDto>(`/api/bolsos-trauma/${encodeURIComponent(unidad)}`)
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

  guardar(unidad: string, payload: GuardarBolsoTraumaPayload): Observable<BolsoTraumaRegistroDto> {
    return this.http.post<BolsoTraumaRegistroDto>(
      `/api/bolsos-trauma/${encodeURIComponent(unidad)}`,
      payload,
    ).pipe(
      catchError(() =>
        of({
          id: Date.now(),
          carroId: 1,
          cuarteleroId: payload.cuarteleroId,
          fecha: new Date().toISOString(),
          tipo: 'TRAUMA',
          inspector: payload.inspector ?? null,
          grupoGuardia: payload.grupoGuardia ?? null,
          firmaOficial: payload.firmaOficial ?? null,
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

  historial(params?: {
    unidad?: string;
    desde?: string;
    hasta?: string;
  }): Observable<BolsoTraumaHistorialDto[]> {
    const sp = new URLSearchParams();
    if (params?.unidad) sp.set('unidad', params.unidad);
    if (params?.desde) sp.set('desde', params.desde);
    if (params?.hasta) sp.set('hasta', params.hasta);
    const q = sp.toString();
    const url = q ? `/api/bolsos-trauma/historial?${q}` : '/api/bolsos-trauma/historial';
    return this.http.get<BolsoTraumaHistorialDto[]>(url).pipe(
      catchError(() =>
        of([
          {
            id: 1,
            fecha: new Date().toISOString(),
            unidad: params?.unidad || 'R-1',
            carroNombre: 'Carro Rescate',
            inspector: 'Modo Demo Local',
            responsable: 'Modo Demo Local',
            grupoGuardia: 'Guardia Demo',
            totalItems: 8,
            itemsOk: 6,
            porcentaje: 75,
            observaciones: 'Registro demo sin backend',
            bolsoNumero: 1,
            borrador: false,
            estadoChecklist: 'CON_OBSERVACION' as const,
          } satisfies BolsoTraumaHistorialDto,
        ]),
      ),
    );
  }

  obtenerHistorialPorId(id: number): Observable<BolsoTraumaRegistroDto> {
    return this.http.get<BolsoTraumaRegistroDto>(`/api/bolsos-trauma/historial/${id}`).pipe(
      catchError(() =>
        of({
          id,
          carroId: 1,
          cuarteleroId: 1,
          fecha: new Date().toISOString(),
          tipo: 'TRAUMA',
          inspector: 'Modo Demo Local',
          grupoGuardia: '1',
          firmaOficial: null,
          observaciones: 'Demo sin backend',
          totalItems: 4,
          itemsOk: 4,
          detalle: { bolsoNumero: 1, borrador: false, bolsos: [] },
          carro: { id: 1, nomenclatura: 'R-1', nombre: 'Carro Rescate' },
          cuartelero: { id: 1, nombre: 'Demo', rol: 'CAPITAN' },
        }),
      ),
    );
  }
}
