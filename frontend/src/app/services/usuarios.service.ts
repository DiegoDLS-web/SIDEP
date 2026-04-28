import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { UsuarioActualizarDto, UsuarioCrearDto, UsuarioListaDto } from '../models/usuario.dto';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioListaDto[]> {
    return this.http.get<UsuarioListaDto[]>('/api/usuarios');
  }

  crear(payload: UsuarioCrearDto): Observable<UsuarioListaDto> {
    return this.http.post<UsuarioListaDto>('/api/usuarios', payload);
  }

  actualizar(id: number, payload: UsuarioActualizarDto): Observable<UsuarioListaDto> {
    return this.http.patch<UsuarioListaDto>(`/api/usuarios/${id}`, payload);
  }

  eliminar(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/usuarios/${id}`);
  }
}
