import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { ReporteEmergenciasDto } from '../models/reportes.dto';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);

  emergencias(desde?: string, hasta?: string): Observable<ReporteEmergenciasDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteEmergenciasDto>('/api/reportes/emergencias', { params });
  }
}
