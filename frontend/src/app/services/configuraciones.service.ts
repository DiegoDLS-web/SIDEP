import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { ConfiguracionOperativaDto, ConfiguracionSistemaDto, EmailLogDto, TipoEmergenciaItemDto } from '../models/configuracion.dto';

@Injectable({ providedIn: 'root' })
export class ConfiguracionesService {
  private readonly http = inject(HttpClient);

  /** Configuración completa — solo ADMIN (pantalla Administración · Configuraciones). */
  obtener(): Observable<ConfiguracionSistemaDto> {
    return this.http.get<ConfiguracionSistemaDto>('/api/rrhh/configuraciones');
  }

  /** Datos operativos para catálogo, PDF y UI general (cualquier usuario autenticado). */
  obtenerOperativa(): Observable<ConfiguracionOperativaDto> {
    return this.http.get<ConfiguracionOperativaDto>('/api/rrhh/configuracion-operativa');
  }

  /** Sin autenticación: nombre de compañía para login y lockup. */
  brandingPublic(): Observable<{ nombreCompania: string }> {
    return this.http.get<{ nombreCompania: string }>('/api/branding-public');
  }

  guardar(payload: ConfiguracionSistemaDto): Observable<ConfiguracionSistemaDto> {
    return this.http.put<ConfiguracionSistemaDto>('/api/rrhh/configuraciones', payload);
  }

  /** Solo ADMIN y CAPITÁN (backend). */
  guardarTiposEmergencia(tiposEmergencia: TipoEmergenciaItemDto[]): Observable<ConfiguracionSistemaDto> {
    return this.http.put<ConfiguracionSistemaDto>('/api/rrhh/configuraciones/tipos-emergencia', {
      tiposEmergencia,
    });
  }

  /** PNG o JPEG, máx. 2 MB. El archivo queda en `/uploads/compania-logo.*` y los PDF lo usan con prioridad. */
  subirLogoCompania(file: File): Observable<{ ok: boolean; path: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ ok: boolean; path: string }>('/api/rrhh/configuraciones/logo-compania', fd);
  }

  probarCorreo(to: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>('/api/rrhh/configuraciones/probar-correo', { to });
  }

  listarLogsCorreo(limit = 50): Observable<EmailLogDto[]> {
    return this.http.get<EmailLogDto[]>(`/api/rrhh/configuraciones/logs-correo?limit=${limit}`);
  }
}
