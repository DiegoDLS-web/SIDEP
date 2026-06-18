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

  /** Usuarios activos para selects OBAC (accesible a cualquier rol autenticado). */
  selectorObac(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>('/api/usuarios/selector');
  }

  metricas(): Observable<UsuariosMetricasDto> {
    return this.http.get<UsuariosMetricasDto>('/api/usuarios/metricas');
  }

  listarPagina(
    page: number,
    pageSize: number,
    q?: string,
    estado?: string,
    tipoVoluntario?: string,
    cargo?: string
  ): Observable<UsuariosPaginaDto> {
    let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    const t = (q ?? '').trim();
    if (t) params = params.set('q', t);
    const est = (estado ?? '').trim();
    if (est) params = params.set('estado', est);
    const tv = (tipoVoluntario ?? '').trim();
    if (tv) params = params.set('tipoVoluntario', tv);
    const car = (cargo ?? '').trim();
    if (car) params = params.set('cargo', car);
    return this.http.get<UsuariosPaginaDto>('/api/usuarios/pagina', { params });
  }

  obtener(rut: string): Observable<UsuarioListaDto> {
    return this.http.get<UsuarioListaDto>(`/api/usuarios/${rut}`);
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioListaDto> {
    return this.http.post<UsuarioListaDto>('/api/usuarios', payload);
  }

  actualizar(rut: string, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(`/api/usuarios/${rut}`, payload);
  }

  eliminar(rut: string): Observable<{ ok: boolean; softDeleted?: boolean; message?: string }> {
    return this.http.delete<{ ok: boolean; softDeleted?: boolean; message?: string }>(`/api/usuarios/${rut}`);
  }

  resetPassword(rut: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`/api/usuarios/${rut}/reset-password`, {});
  }
}
