import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { CategoriaNovedad, LibroNovedadDto, NovedadesPaginaDto } from '../models/novedades.dto';
import type { GrupoGuardia } from '../models/guardias.dto';

@Injectable({ providedIn: 'root' })
export class NovedadesService {
  private readonly http = inject(HttpClient);

  listar(filtros?: {
    desde?: string;
    hasta?: string;
    categoria?: CategoriaNovedad;
    importante?: boolean;
    q?: string;
    page?: number;
    pageSize?: number;
  }): Observable<NovedadesPaginaDto> {
    let params = new HttpParams();
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros?.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros?.importante !== undefined) params = params.set('importante', filtros.importante ? '1' : '0');
    if (filtros?.q) params = params.set('q', filtros.q);
    if (filtros?.page) params = params.set('page', String(filtros.page));
    if (filtros?.pageSize) params = params.set('pageSize', String(filtros.pageSize));
    return this.http.get<NovedadesPaginaDto>('/api/novedades', { params });
  }

  crear(payload: {
    fechaHora: string;
    categoria: CategoriaNovedad;
    titulo: string;
    descripcion: string;
    grupoGuardia?: GrupoGuardia | null;
    importante?: boolean;
  }): Observable<LibroNovedadDto> {
    return this.http.post<LibroNovedadDto>('/api/novedades', payload);
  }

  actualizar(
    id: string,
    payload: Partial<{
      fechaHora: string;
      categoria: CategoriaNovedad;
      titulo: string;
      descripcion: string;
      grupoGuardia: GrupoGuardia | null;
      importante: boolean;
    }>,
  ): Observable<LibroNovedadDto> {
    return this.http.patch<LibroNovedadDto>(`/api/novedades/${id}`, payload);
  }

  eliminar(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/novedades/${id}`);
  }
}
