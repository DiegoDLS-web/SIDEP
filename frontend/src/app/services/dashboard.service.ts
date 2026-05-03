import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { DashboardResumenDto } from '../models/dashboard.dto';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  resumen(anio: number, clave: string, carroId: 'todas' | number): Observable<DashboardResumenDto> {
    let params = new HttpParams().set('anio', String(anio));
    if (clave && clave !== 'todos') {
      params = params.set('clave', clave);
    }
    if (carroId !== 'todas') {
      params = params.set('carroId', String(carroId));
    }
    return this.http.get<DashboardResumenDto>('/api/dashboard/resumen', { params });
  }
}
