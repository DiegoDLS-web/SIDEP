import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  UsuarioActualizarDto,
  UsuarioCrearDto,
  UsuarioListaDto,
  UsuariosMetricasDto,
  UsuariosPaginaDto,
} from '../models/usuario.dto';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>('/api/usuarios');
  }

  metricas(): Observable<UsuariosMetricasDto> {
    return this.http.get<UsuariosMetricasDto>('/api/usuarios/metricas');
  }

  listarPagina(page: number, pageSize: number, q?: string): Observable<UsuariosPaginaDto> {
    let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    const t = (q ?? '').trim();
    if (t) params = params.set('q', t);
    return this.http.get<UsuariosPaginaDto>('/api/usuarios/pagina', { params });
  }

  obtener(id: number): Observable<UsuarioListaDto> {
    return this.http.get<UsuarioListaDto>(`/api/usuarios/${id}`);
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioListaDto> {
    return this.http.post<UsuarioListaDto>('/api/usuarios', payload);
  }

  actualizar(id: number, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(`/api/usuarios/${id}`, payload);
  }

  eliminar(id: number): Observable<{ ok: boolean; softDeleted?: boolean; message?: string }> {
    return this.http.delete<{ ok: boolean; softDeleted?: boolean; message?: string }>(`/api/usuarios/${id}`);
  }
}
