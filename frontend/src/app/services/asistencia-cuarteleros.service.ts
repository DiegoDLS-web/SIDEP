import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AsistenciaCuarteleroDto,
  AsistenciaPaginaDto,
  AsistenciaResumenDto,
  EstadoAsistenciaGuardia,
  PlanillaAsistenciaDto,
  TipoTurnoAsistencia,
} from '../models/asistencia-cuarteleros.dto';
import type { GrupoGuardia } from '../models/guardias.dto';

@Injectable({ providedIn: 'root' })
export class AsistenciaCuartelerosService {
  private readonly http = inject(HttpClient);

  planilla(filtros: { desde: string; hasta: string; grupo?: GrupoGuardia }): Observable<PlanillaAsistenciaDto> {
    let params = new HttpParams().set('desde', filtros.desde).set('hasta', filtros.hasta);
    if (filtros.grupo) params = params.set('grupo', filtros.grupo);
    return this.http.get<PlanillaAsistenciaDto>('/api/asistencia-cuarteleros/planilla', { params });
  }

  obtener(id: string): Observable<AsistenciaCuarteleroDto> {
    return this.http.get<AsistenciaCuarteleroDto>(`/api/asistencia-cuarteleros/${id}`);
  }

  guardarCelda(payload: {
    fecha: string;
    usuarioRut: string;
    tipoTurno: TipoTurnoAsistencia;
    estadoAsistencia: EstadoAsistenciaGuardia | null;
    grupoGuardia?: GrupoGuardia | null;
    horaEntrada?: string | null;
    horaSalida?: string | null;
    firmaImagenUrl?: string | null;
    observaciones?: string | null;
  }): Observable<AsistenciaCuarteleroDto | { ok: boolean; eliminado: boolean }> {
    return this.http.post<AsistenciaCuarteleroDto | { ok: boolean; eliminado: boolean }>(
      '/api/asistencia-cuarteleros/celda',
      payload,
    );
  }

  listar(filtros?: {
    fecha?: string;
    desde?: string;
    hasta?: string;
    grupo?: GrupoGuardia;
    presente?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<AsistenciaPaginaDto> {
    let params = new HttpParams();
    if (filtros?.fecha) params = params.set('fecha', filtros.fecha);
    if (filtros?.desde) params = params.set('desde', filtros.desde);
    if (filtros?.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros?.grupo) params = params.set('grupo', filtros.grupo);
    if (filtros?.presente !== undefined) params = params.set('presente', filtros.presente ? '1' : '0');
    if (filtros?.page) params = params.set('page', String(filtros.page));
    if (filtros?.pageSize) params = params.set('pageSize', String(filtros.pageSize));
    return this.http.get<AsistenciaPaginaDto>('/api/asistencia-cuarteleros', { params });
  }

  resumen(fecha: string): Observable<AsistenciaResumenDto> {
    return this.http.get<AsistenciaResumenDto>('/api/asistencia-cuarteleros/resumen', { params: { fecha } });
  }

  registrar(payload: {
    fecha: string;
    usuarioRut: string;
    grupoGuardia?: GrupoGuardia | null;
    tipoTurno?: TipoTurnoAsistencia;
    estadoAsistencia?: EstadoAsistenciaGuardia;
    presente?: boolean;
    horaEntrada?: string | null;
    horaSalida?: string | null;
    observaciones?: string | null;
  }): Observable<AsistenciaCuarteleroDto> {
    return this.http.post<AsistenciaCuarteleroDto>('/api/asistencia-cuarteleros', payload);
  }

  actualizar(
    id: string,
    payload: Partial<{
      grupoGuardia: GrupoGuardia | null;
      tipoTurno: TipoTurnoAsistencia;
      estadoAsistencia: EstadoAsistenciaGuardia;
      presente: boolean;
      horaEntrada: string | null;
      horaSalida: string | null;
      observaciones: string | null;
    }>,
  ): Observable<AsistenciaCuarteleroDto> {
    return this.http.patch<AsistenciaCuarteleroDto>(`/api/asistencia-cuarteleros/${id}`, payload);
  }

  eliminar(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`/api/asistencia-cuarteleros/${id}`);
  }

  guardarMiCelda(payload: {
    fecha: string;
    tipoTurno: TipoTurnoAsistencia;
    estadoAsistencia?: EstadoAsistenciaGuardia;
    horaEntrada?: string | null;
    horaSalida?: string | null;
    firmaImagenUrl?: string | null;
    observaciones?: string | null;
    grupoGuardia?: GrupoGuardia | null;
  }): Observable<AsistenciaCuarteleroDto> {
    return this.http.post<AsistenciaCuarteleroDto>('/api/asistencia-cuarteleros/mi-celda', payload);
  }
}
