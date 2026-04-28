import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  LicenciaActivaDto,
  LicenciaEstado,
  LicenciaMedicaDto,
  LicenciasResumenDto,
} from '../models/licencias.dto';

@Injectable({ providedIn: 'root' })
export class LicenciasService {
  private readonly http = inject(HttpClient);

  listarMisLicencias(): Observable<LicenciaMedicaDto[]> {
    return this.http.get<LicenciaMedicaDto[]>('/api/licencias/mis');
  }

  crear(payload: {
    fechaInicio: string;
    fechaTermino: string;
    motivo: string;
    archivoUrl?: string | null;
  }): Observable<LicenciaMedicaDto> {
    return this.http.post<LicenciaMedicaDto>('/api/licencias', payload);
  }

  crearConAdjunto(payload: {
    fechaInicio: string;
    fechaTermino: string;
    motivo: string;
    adjunto: File | null;
  }): Observable<HttpEvent<LicenciaMedicaDto>> {
    const formData = new FormData();
    formData.append('fechaInicio', payload.fechaInicio);
    formData.append('fechaTermino', payload.fechaTermino);
    formData.append('motivo', payload.motivo);
    if (payload.adjunto) {
      formData.append('adjunto', payload.adjunto);
    }
    return this.http.post<LicenciaMedicaDto>('/api/licencias', formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  editar(
    id: number,
    payload: Partial<{ fechaInicio: string; fechaTermino: string; motivo: string; archivoUrl: string | null }>,
  ): Observable<LicenciaMedicaDto> {
    return this.http.patch<LicenciaMedicaDto>(`/api/licencias/${id}`, payload);
  }

  listarGestion(estado?: LicenciaEstado): Observable<LicenciaMedicaDto[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<LicenciaMedicaDto[]>('/api/licencias', { params });
  }

  cambiarEstado(
    id: number,
    estado: LicenciaEstado,
    observacionResolucion?: string,
  ): Observable<LicenciaMedicaDto> {
    return this.http.patch<LicenciaMedicaDto>(`/api/licencias/${id}/estado`, {
      estado,
      observacionResolucion: observacionResolucion?.trim() || null,
    });
  }

  listarActivas(fechaIso: string): Observable<LicenciaActivaDto[]> {
    const params = new HttpParams().set('fecha', fechaIso);
    return this.http.get<LicenciaActivaDto[]>('/api/licencias/activas', { params });
  }

  obtenerResumen(fechaIso?: string): Observable<LicenciasResumenDto> {
    let params = new HttpParams();
    if (fechaIso) {
      params = params.set('fecha', fechaIso);
    }
    return this.http.get<LicenciasResumenDto>('/api/licencias/resumen', { params });
  }
}
