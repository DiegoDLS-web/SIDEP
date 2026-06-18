import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { apiUrl } from '../utils/api-url.util';
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
  private readonly base = apiUrl('usuarios');

  listar(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>(this.base);
  }

  /** Usuarios activos para selects (accesible a cualquier rol autenticado). */
  selectorObac(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>(apiUrl('usuarios', 'selector'));
  }

  /** Selector tolerante: /selector → listado completo → vacío. */
  voluntariosParaSelect(): Observable<UsuarioListaDto[]> {
    return this.selectorObac().pipe(
      catchError(() => this.listar().pipe(catchError(() => of([] as UsuarioListaDto[])))),
    );
  }

  metricas(): Observable<UsuariosMetricasDto> {
    return this.http.get<UsuariosMetricasDto>(apiUrl('usuarios', 'metricas'));
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
    return this.http.get<UsuariosPaginaDto>(apiUrl('usuarios', 'pagina'), { params });
  }

  obtener(rut: string): Observable<UsuarioListaDto> {
    return this.http.get<UsuarioListaDto>(apiUrl('usuarios', rut));
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioListaDto> {
    return this.http.post<UsuarioListaDto>(this.base, payload);
  }

  actualizar(rut: string, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(apiUrl('usuarios', rut), payload);
  }

  eliminar(rut: string): Observable<{ ok: boolean; softDeleted?: boolean; message?: string }> {
    return this.http.delete<{ ok: boolean; softDeleted?: boolean; message?: string }>(apiUrl('usuarios', rut));
  }

  resetPassword(rut: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(apiUrl('usuarios', rut, 'reset-password'), {});
  }
}
