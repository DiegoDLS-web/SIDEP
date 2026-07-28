import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { GuardiaCalendarioDto, GuardiaResumenDto, GuardiaTurnoDto, TipoTurnoGuardia, GrupoGuardia } from '../models/guardias.dto';

@Injectable({ providedIn: 'root' })
export class GuardiasService {
  private readonly http = inject(HttpClient);

  calendario(anio: number, mes: number): Observable<GuardiaCalendarioDto> {
    const params = new HttpParams().set('anio', String(anio)).set('mes', String(mes));
    return this.http.get<GuardiaCalendarioDto>('/api/guardias/calendario', { params });
  }

  listar(filtros?: { desde?: string; hasta?: string; grupo?: GrupoGuardia }): Observable<GuardiaTurnoDto[]> {
    let params = new HttpParams();
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros?.grupo) params = params.set('grupo', filtros.grupo);
    return this.http.get<GuardiaTurnoDto[]>('/api/guardias', { params });
  }

  resumen(fecha: string): Observable<GuardiaResumenDto> {
    return this.http.get<GuardiaResumenDto>('/api/guardias/resumen', { params: { fecha } });
  }

  crear(payload: {
    fecha: string;
    grupo: GrupoGuardia;
    tipoTurno?: TipoTurnoGuardia;
    cuarteleroRut?: string | null;
    obacRut?: string | null;
    observaciones?: string | null;
    miembrosRut?: string[];
  }): Observable<GuardiaTurnoDto> {
    return this.http.post<GuardiaTurnoDto>('/api/guardias', payload);
  }

  actualizar(
    id: string,
    payload: Partial<{
      fecha: string;
      grupo: GrupoGuardia;
      tipoTurno: TipoTurnoGuardia;
      cuarteleroRut: string | null;
      obacRut: string | null;
      observaciones: string | null;
      miembrosRut: string[];
    }>,
  ): Observable<GuardiaTurnoDto> {
    return this.http.patch<GuardiaTurnoDto>(`/api/guardias/${id}`, payload);
  }

  eliminar(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/guardias/${id}`);
  }
}
