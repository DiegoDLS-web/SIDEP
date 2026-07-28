import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { apiUrl } from '../utils/api-url.util';
import type { ParteEmergenciaDTO } from '../models/parte.dto';

export interface PartesPaginaResp {
  items: ParteEmergenciaDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PartesMetricasResp {
  totalSistema: number;
  enAnioActual: number;
  enMesActual: number;
}

@Injectable({ providedIn: 'root' })
export class PartesService {
  private readonly http = inject(HttpClient);
  private readonly base = apiUrl('operaciones', 'partes');

  listar(): Observable<ParteEmergenciaDTO[]> {
    return this.http.get<ParteEmergenciaDTO[]>(this.base);
  }

  listarPagina(filtros: Record<string, unknown>): Observable<PartesPaginaResp> {
    let params = new HttpParams();
    Object.keys(filtros).forEach((k) => {
      const v = filtros[k];
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<PartesPaginaResp>(apiUrl('operaciones', 'partes', 'pagina'), { params });
  }

  /** Descarga todas las páginas para exportación (hasta 2000 registros por página backend). */
  listarParaExport(filtros: Record<string, unknown>): Observable<ParteEmergenciaDTO[]> {
    const pageSize = 500;
    const base = { ...filtros, export: '1', pageSize };
    return this.listarPagina({ ...base, page: 1 }).pipe(
      expand((pagina) =>
        pagina.page < pagina.totalPages
          ? this.listarPagina({ ...base, page: pagina.page + 1 })
          : EMPTY,
      ),
      map((pagina) => pagina.items),
      reduce((all, items) => all.concat(items), [] as ParteEmergenciaDTO[]),
    );
  }

  metricas(): Observable<PartesMetricasResp> {
    return this.http.get<PartesMetricasResp>(apiUrl('operaciones', 'partes', 'metricas'));
  }

  obtener(id: string): Observable<ParteEmergenciaDTO> {
    return this.http.get<ParteEmergenciaDTO>(apiUrl('operaciones', 'partes', id));
  }

  obtenerAnalitica(id: string): Observable<{
    tiempoDespachoMin: number | null;
    tiempoRespuestaMin: number | null;
    tiempoServicioMin: number | null;
    voluntariosParte: number | null;
    promedioVoluntariosBase: number | null;
    tendenciaVoluntarios: 'subio' | 'bajo' | 'igual' | 'sin-datos';
  }> {
    return this.http.get<{
      tiempoDespachoMin: number | null;
      tiempoRespuestaMin: number | null;
      tiempoServicioMin: number | null;
      voluntariosParte: number | null;
      promedioVoluntariosBase: number | null;
      tendenciaVoluntarios: 'subio' | 'bajo' | 'igual' | 'sin-datos';
    }>(apiUrl('operaciones', 'partes', id, 'analitica'));
  }

  crear(payload: unknown): Observable<ParteEmergenciaDTO> {
    return this.http.post<ParteEmergenciaDTO>(this.base, payload);
  }

  actualizar(id: string, payload: unknown): Observable<ParteEmergenciaDTO> {
    return this.http.patch<ParteEmergenciaDTO>(apiUrl('operaciones', 'partes', id), payload);
  }

  deleteParte(id: string): Observable<unknown> {
    return this.http.delete(apiUrl('operaciones', 'partes', id));
  }
}
