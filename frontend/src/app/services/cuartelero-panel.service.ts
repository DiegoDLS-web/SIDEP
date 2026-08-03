import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { AsistenciaPaginaDto, PanelCuarteleroDto } from '../models/asistencia-cuarteleros.dto';

@Injectable({ providedIn: 'root' })
export class CuarteleroPanelService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/asistencia-cuarteleros';

  miPanel(anio?: number, mes?: number): Observable<PanelCuarteleroDto> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', String(anio));
    if (mes) params = params.set('mes', String(mes));
    return this.http.get<PanelCuarteleroDto>(`${this.base}/mi-panel`, { params });
  }

  miHistorial(page = 1, pageSize = 20): Observable<AsistenciaPaginaDto> {
    const params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get<AsistenciaPaginaDto>(`${this.base}/mi-historial`, { params });
  }
}
