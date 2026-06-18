import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
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
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  listar(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>(this.apiUrl);
  }

  /** Usuarios activos para selects (accesible a cualquier rol autenticado). */
  selectorObac(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>(`${this.apiUrl}/selector`);
  }

  metricas(): Observable<UsuariosMetricasDto> {
    return this.http.get<UsuariosMetricasDto>(`${this.apiUrl}/metricas`);
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
    return this.http.get<UsuariosPaginaDto>(`${this.apiUrl}/pagina`, { params });
  }

  obtener(rut: string): Observable<UsuarioListaDto> {
    return this.http.get<UsuarioListaDto>(`${this.apiUrl}/${rut}`);
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioListaDto> {
    return this.http.post<UsuarioListaDto>(this.apiUrl, payload);
  }

  actualizar(rut: string, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(`${this.apiUrl}/${rut}`, payload);
  }

  eliminar(rut: string): Observable<{ ok: boolean; softDeleted?: boolean; message?: string }> {
    return this.http.delete<{ ok: boolean; softDeleted?: boolean; message?: string }>(`${this.apiUrl}/${rut}`);
  }

  resetPassword(rut: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/${rut}/reset-password`, {});
  }
}
