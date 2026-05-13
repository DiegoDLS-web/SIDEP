import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { RolActualizarDto, RolCrearDto, RolUsuarioDto } from '../models/rol.dto';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);

  listar(soloActivos = false): Observable<RolUsuarioDto[]> {
    const params = soloActivos ? new HttpParams().set('activos', '1') : undefined;
    return this.http.get<RolUsuarioDto[]>('/api/roles', { params });
  }

  crear(payload: RolCrearDto): Observable<RolUsuarioDto> {
    return this.http.post<RolUsuarioDto>('/api/roles', payload);
  }

  actualizar(id: number, payload: RolActualizarDto): Observable<RolUsuarioDto> {
    return this.http.patch<RolUsuarioDto>(`/api/roles/${id}`, payload);
  }
}
