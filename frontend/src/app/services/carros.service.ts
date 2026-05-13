import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import type {
  CarroHistorialGeneralFila,
  CarroRegistroHistorialDto,
} from '../models/carro-registro-historial.dto';
import type { CarroDto } from '../models/carro.dto';

@Injectable({ providedIn: 'root' })
export class CarrosService {
  private readonly http = inject(HttpClient);
  private demoHistorialId = 1;

  private snapshotHistorial(c: CarroDto): CarroRegistroHistorialDto {
    return {
      id: this.demoHistorialId++,
      carroId: c.id,
      creadoEn: new Date().toISOString(),
      ultimoMantenimiento: c.ultimoMantenimiento ?? null,
      proximoMantenimiento: c.proximoMantenimiento ?? null,
      proximaRevisionTecnica: c.proximaRevisionTecnica ?? null,
      ultimaRevisionBombaAgua: c.ultimaRevisionBombaAgua ?? null,
      descripcionUltimoMantenimiento: c.descripcionUltimoMantenimiento ?? null,
      ultimoInspector: c.ultimoInspector ?? null,
      firmaUltimoInspector: c.firmaUltimoInspector ?? null,
      fechaUltimaInspeccion: c.fechaUltimaInspeccion ?? null,
      ultimoConductor: c.ultimoConductor ?? null,
    };
  }

  private readonly demoCarros: CarroDto[] = [
    {
      id: 1,
      nomenclatura: 'B-1',
      patente: 'BBSJ-01',
      estadoOperativo: true,
      nombre: 'Carro Bomba',
      tipo: 'Bomba',
      marca: 'Renault',
      anioFabricacion: 2018,
      capacidadAgua: '5000 L',
      imagenUrl: '/assets/carros/b1.png',
      kilometraje: 82450,
      ultimoMantenimiento: '2026-03-10T12:00:00.000Z',
      descripcionUltimoMantenimiento: 'Cambio de aceite, filtros y revisión completa del sistema eléctrico.',
      proximoMantenimiento: '2026-05-05T12:00:00.000Z',
      proximaRevisionTecnica: '2026-05-12T12:00:00.000Z',
      ultimaRevisionBombaAgua: '2026-03-05T12:00:00.000Z',
      ultimoInspector: 'Carlos Muñoz',
      firmaUltimoInspector: null,
      fechaUltimaInspeccion: '2026-03-10T12:00:00.000Z',
      conductorAsignado: 'Pedro Sánchez',
      ultimoConductor: 'Pedro Sánchez',
      motor: 'OM 906 LA',
      transmision: 'Automática',
      combustible: 'Diésel',
      presionBomba: '10 bar',
      capacidadTanqueCombustible: '200 L',
      historialRegistros: [
        {
          id: 1,
          carroId: 1,
          creadoEn: '2026-02-01T15:00:00.000Z',
          ultimoMantenimiento: '2026-02-01T12:00:00.000Z',
          proximoMantenimiento: '2026-04-01T12:00:00.000Z',
          proximaRevisionTecnica: '2026-04-10T12:00:00.000Z',
          ultimaRevisionBombaAgua: '2026-01-20T12:00:00.000Z',
          descripcionUltimoMantenimiento: 'Registro inicial de ejemplo (demo local).',
          ultimoInspector: 'Inspector previo',
          firmaUltimoInspector: null,
          fechaUltimaInspeccion: '2026-02-01T12:00:00.000Z',
          ultimoConductor: 'Pedro Sánchez',
        },
      ],
    },
    {
      id: 2,
      nomenclatura: 'BX-1',
      patente: 'BXSJ-01',
      estadoOperativo: true,
      nombre: 'Carro Multipropósito',
      tipo: 'Multipropósito',
      marca: 'Iveco',
      anioFabricacion: 2020,
      capacidadAgua: '3000 L',
      imagenUrl: '/assets/carros/bx1.png',
      kilometraje: 45200,
      ultimoMantenimiento: '2026-02-28T12:00:00.000Z',
      descripcionUltimoMantenimiento: 'Ajuste de frenos, recambio de correas y mantención de bombas auxiliares.',
      proximoMantenimiento: '2026-04-30T12:00:00.000Z',
      proximaRevisionTecnica: '2026-05-20T12:00:00.000Z',
      ultimaRevisionBombaAgua: '2026-02-15T12:00:00.000Z',
      ultimoInspector: 'María Torres',
      firmaUltimoInspector: null,
      fechaUltimaInspeccion: '2026-02-28T12:00:00.000Z',
      conductorAsignado: 'Luis Fernández',
      ultimoConductor: 'Luis Fernández',
      motor: 'Cursor 9',
      transmision: 'Manual',
      combustible: 'Diésel',
      presionBomba: '8 bar',
      capacidadTanqueCombustible: '180 L',
      historialRegistros: [],
    },
    {
      id: 3,
      nomenclatura: 'R-1',
      patente: 'RESJ-01',
      estadoOperativo: false,
      nombre: 'Carro de Rescate',
      tipo: 'Rescate',
      marca: 'MAN',
      anioFabricacion: 2019,
      capacidadAgua: '2000 L',
      imagenUrl: '/assets/carros/r1.png',
      kilometraje: 67890,
      ultimoMantenimiento: '2026-03-22T12:00:00.000Z',
      descripcionUltimoMantenimiento: 'Cambio de aceite hidráulico, revisión de winche y reemplazo de luces traseras.',
      proximoMantenimiento: '2026-05-08T12:00:00.000Z',
      proximaRevisionTecnica: '2026-05-02T12:00:00.000Z',
      ultimaRevisionBombaAgua: '2026-03-18T12:00:00.000Z',
      ultimoInspector: 'Rodrigo Pérez',
      firmaUltimoInspector: null,
      fechaUltimaInspeccion: '2026-03-22T12:00:00.000Z',
      conductorAsignado: 'Juan Rojas',
      ultimoConductor: 'Juan Rojas',
      motor: 'DC13',
      transmision: 'Automática',
      combustible: 'Diésel',
      presionBomba: '12 bar',
      capacidadTanqueCombustible: '220 L',
      historialRegistros: [],
    },
  ];

  listar(): Observable<CarroDto[]> {
    return this.http.get<CarroDto[]>('/api/carros').pipe(
      catchError(() =>
        of(
          this.demoCarros.map(({ historialRegistros: _h, ...c }) => ({ ...c })),
        ),
      ),
    );
  }

  /** Snapshots de mantención de todas las unidades (mismos filtros que en pantalla). */
  historialGeneral(filtros?: {
    carroId?: number;
    desde?: string;
    hasta?: string;
  }): Observable<CarroHistorialGeneralFila[]> {
    let params = new HttpParams();
    if (filtros?.carroId != null) {
      params = params.set('carroId', String(filtros.carroId));
    }
    if (filtros?.desde?.trim()) {
      params = params.set('desde', filtros.desde.trim());
    }
    if (filtros?.hasta?.trim()) {
      params = params.set('hasta', filtros.hasta.trim());
    }
    return this.http.get<CarroHistorialGeneralFila[]>('/api/carros/historial-general', { params }).pipe(
      catchError(() => of(this.demoHistorialGeneral(filtros))),
    );
  }

  private demoHistorialGeneral(filtros?: {
    carroId?: number;
    desde?: string;
    hasta?: string;
  }): CarroHistorialGeneralFila[] {
    const rows = this.demoCarros.flatMap((c) =>
      (c.historialRegistros ?? []).map(
        (h): CarroHistorialGeneralFila => ({
          ...h,
          carro: {
            id: c.id,
            nomenclatura: c.nomenclatura,
            nombre: c.nombre,
            patente: c.patente,
          },
        }),
      ),
    );
    const inRango = (iso: string) => {
      const t = new Date(iso).getTime();
      if (filtros?.desde?.trim()) {
        const a = new Date(filtros.desde);
        if (!Number.isNaN(a.getTime()) && t < a.getTime()) return false;
      }
      if (filtros?.hasta?.trim()) {
        const b = new Date(filtros.hasta);
        if (!Number.isNaN(b.getTime())) {
          b.setHours(23, 59, 59, 999);
          if (t > b.getTime()) return false;
        }
      }
      return true;
    };
    return rows
      .filter((r) => (filtros?.carroId == null ? true : r.carroId === filtros.carroId))
      .filter((r) => inRango(r.creadoEn))
      .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());
  }

  obtener(idONomenclatura: string | number): Observable<CarroDto> {
    const segment = typeof idONomenclatura === 'number' ? String(idONomenclatura) : idONomenclatura;
    return this.http.get<CarroDto>(`/api/carros/${encodeURIComponent(segment)}`).pipe(
      catchError(() => {
        const fallback = this.demoCarros.find(
          (c) => String(c.id) === String(segment) || c.nomenclatura === String(segment),
        );
        return of(fallback ?? this.demoCarros[0]!);
      }),
    );
  }

  actualizar(id: number, payload: Partial<CarroDto>): Observable<CarroDto> {
    return this.http.patch<CarroDto>(`/api/carros/${id}`, payload).pipe(
      catchError(() => {
        const idx = this.demoCarros.findIndex((c) => c.id === id);
        if (idx >= 0) {
          const actualizado = { ...this.demoCarros[idx], ...payload };
          const entrada = this.snapshotHistorial(actualizado);
          const prevHist = this.demoCarros[idx].historialRegistros ?? [];
          actualizado.historialRegistros = [entrada, ...prevHist].slice(0, 100);
          this.demoCarros[idx] = actualizado;
          return of(actualizado);
        }
        return of({ ...this.demoCarros[0]!, ...payload, id });
      }),
    );
  }
}
