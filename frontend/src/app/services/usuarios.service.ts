import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, Observable, catchError, expand, map, of, reduce } from 'rxjs';
import { apiUrl } from '../utils/api-url.util';
import type {
  UsuarioActualizarDto,
  UsuarioCrearDto,
  UsuarioCrearRespuestaDto,
  UsuarioListaDto,
  UsuarioSelectorDto,
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

  /** Usuarios activos para selects (DTO mínimo, sin PII extendida). */
  selectorObac(): Observable<UsuarioSelectorDto[]> {
    return this.http.get<UsuarioSelectorDto[]>(apiUrl('usuarios', 'selector'));
  }

  /** Selector tolerante: /selector → vacío (sin fallback al listado completo). */
  voluntariosParaSelect(): Observable<UsuarioSelectorDto[]> {
    return this.selectorObac().pipe(catchError(() => of([] as UsuarioSelectorDto[])));
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

  /** Exportación: recorre páginas con los mismos filtros del listado. */
  listarParaExport(
    pageSize: number,
    q?: string,
    estado?: string,
    tipoVoluntario?: string,
    cargo?: string,
  ): Observable<UsuarioListaDto[]> {
    return this.listarPagina(1, pageSize, q, estado, tipoVoluntario, cargo).pipe(
      expand((pagina) =>
        pagina.page < pagina.totalPages
          ? this.listarPagina(pagina.page + 1, pageSize, q, estado, tipoVoluntario, cargo)
          : EMPTY,
      ),
      map((pagina) => pagina.items),
      reduce((all, items) => all.concat(items), [] as UsuarioListaDto[]),
    );
  }

  obtener(rut: string): Observable<UsuarioListaDto> {
    return this.http.get<UsuarioListaDto>(apiUrl('usuarios', rut));
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioCrearRespuestaDto> {
    return this.http.post<UsuarioCrearRespuestaDto>(this.base, payload);
  }

  actualizar(rut: string, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(apiUrl('usuarios', rut), payload);
  }

  eliminar(rut: string): Observable<{ ok: boolean; softDeleted?: boolean; message?: string }> {
    return this.http.delete<{ ok: boolean; softDeleted?: boolean; message?: string }>(apiUrl('usuarios', rut));
  }

  resetPassword(rut: string): Observable<{ success: boolean; message: string; passwordProvisional?: string }> {
    return this.http.patch<{ success: boolean; message: string; passwordProvisional?: string }>(
      apiUrl('usuarios', rut, 'reset-password'),
      {},
    );
  }
}
