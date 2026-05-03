import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { ConfiguracionSistemaDto } from '../models/configuracion.dto';

@Injectable({ providedIn: 'root' })
export class ConfiguracionesService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<ConfiguracionSistemaDto> {
    return this.http.get<ConfiguracionSistemaDto>('/api/configuraciones');
  }

  /** Sin autenticación: nombre de compañía para login y lockup. */
  brandingPublic(): Observable<{ nombreCompania: string }> {
    return this.http.get<{ nombreCompania: string }>('/api/branding-public');
  }

  guardar(payload: ConfiguracionSistemaDto): Observable<ConfiguracionSistemaDto> {
    return this.http.put<ConfiguracionSistemaDto>('/api/configuraciones', payload);
  }

  /** PNG o JPEG, máx. 2 MB. El archivo queda en `/uploads/compania-logo.*` y los PDF lo usan con prioridad. */
  subirLogoCompania(file: File): Observable<{ ok: boolean; path: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ ok: boolean; path: string }>('/api/configuraciones/logo-compania', fd);
  }
}
