import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { apiUrl } from '../utils/api-url.util';
import type { ParteEmergenciaDTO } from '../models/parte.dto';

// Interfaces que la tabla necesita para funcionar correctamente
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
  // Apuntando al nuevo backend
  private readonly base = apiUrl('operaciones', 'partes');

  listar(): Observable<ParteEmergenciaDTO[]> {
    return this.http.get<ParteEmergenciaDTO[]>(this.base);
  }

  listarPagina(filtros: any): Observable<PartesPaginaResp> {
    let params = new HttpParams();
    Object.keys(filtros).forEach((k) => {
      if (filtros[k] !== undefined && filtros[k] !== null && filtros[k] !== '') {
        params = params.set(k, String(filtros[k]));
      }
    });
    // Se asume que el backend tiene la ruta /pagina, ajústala a tu API si es distinta
    return this.http.get<PartesPaginaResp>(apiUrl('operaciones', 'partes', 'pagina'), { params });
  }

  metricas(): Observable<PartesMetricasResp> {
    return this.http.get<PartesMetricasResp>(apiUrl('operaciones', 'partes', 'metricas'));
  }

  obtener(id: string): Observable<ParteEmergenciaDTO> {
    return this.http.get<ParteEmergenciaDTO>(apiUrl('operaciones', 'partes', id));
  }

  crear(payload: any): Observable<ParteEmergenciaDTO> {
    return this.http.post<ParteEmergenciaDTO>(this.base, payload);
  }

  actualizar(id: string, payload: any): Observable<ParteEmergenciaDTO> {
    return this.http.patch<ParteEmergenciaDTO>(apiUrl('operaciones', 'partes', id), payload);
  }

  deleteParte(id: string): Observable<any> {
    return this.http.delete(apiUrl('operaciones', 'partes', id));
  }
}