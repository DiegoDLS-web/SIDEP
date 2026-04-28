import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { AnaliticaOperacionalDto, CuadroHonorDto, ReporteEmergenciasDto } from '../models/reportes.dto';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);

  emergencias(desde?: string, hasta?: string): Observable<ReporteEmergenciasDto> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteEmergenciasDto>('/api/reportes/emergencias', { params });
  }

  cuadroHonor(anio?: number, mes?: number): Observable<CuadroHonorDto> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', String(anio));
    if (mes) params = params.set('mes', String(mes));
    return this.http.get<CuadroHonorDto>('/api/reportes/cuadro-honor', { params });
  }

  analiticaOperacional(anio?: number, mes?: number): Observable<AnaliticaOperacionalDto> {
    let params = new HttpParams();
    if (anio) params = params.set('anio', String(anio));
    if (mes) params = params.set('mes', String(mes));
    return this.http.get<AnaliticaOperacionalDto>('/api/reportes/analitica-operacional', { params });
  }
}
