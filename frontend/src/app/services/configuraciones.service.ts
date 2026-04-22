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

  guardar(payload: ConfiguracionSistemaDto): Observable<ConfiguracionSistemaDto> {
    return this.http.put<ConfiguracionSistemaDto>('/api/configuraciones', payload);
  }
}
