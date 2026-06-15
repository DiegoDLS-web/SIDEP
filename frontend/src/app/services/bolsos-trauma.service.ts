import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import type { BolsoTraumaDTO, CrearBolsoTraumaDTO } from '../models/bolso-trauma.dto';

@Injectable({
  providedIn: 'root'
})
export class BolsosTraumaService {
  private readonly http = inject(HttpClient);
  // Endpoint del nuevo backend relacional
  private apiUrl = `${environment.apiUrl}/logistica/equipamiento/bolsos`;

  // =======================================================================
  // MÉTODOS CRUD BÁSICOS (NUEVO BACKEND)
  // =======================================================================
  getBolsos(): Observable<{success: boolean, data: BolsoTraumaDTO[]}> {
    return this.http.get<{success: boolean, data: BolsoTraumaDTO[]}>(this.apiUrl);
  }

  getBolsoById(id: string): Observable<{success: boolean, data: BolsoTraumaDTO}> {
    return this.http.get<{success: boolean, data: BolsoTraumaDTO}>(`${this.apiUrl}/${id}`);
  }

  createBolso(data: CrearBolsoTraumaDTO): Observable<{success: boolean, data: BolsoTraumaDTO}> {
    return this.http.post<{success: boolean, data: BolsoTraumaDTO}>(this.apiUrl, data);
  }

  updateBolso(id: string, data: Partial<CrearBolsoTraumaDTO>): Observable<{success: boolean, data: BolsoTraumaDTO}> {
    return this.http.patch<{success: boolean, data: BolsoTraumaDTO}>(`${this.apiUrl}/${id}`, data);
  }

  deleteBolso(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // =======================================================================
  // MÉTODOS AVANZADOS REQUERIDOS POR LA VISTA DE TU COLEGA
  // (Estos actúan como puente hacia la nueva arquitectura)
  // =======================================================================

  /**
   * Obtiene el resumen de unidades y sus bolsos para la pantalla principal.
   */
  selector(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/selector`).pipe(
      catchError(() => of([])) // Previene quiebres si el endpoint no está listo
    );
  }

  /**
   * Obtiene el historial paginado y filtrado de revisiones de bolsos.
   */
  historial(filtros?: { unidades?: string; desde?: string; hasta?: string }): Observable<any[]> {
    let params = new HttpParams();
    if (filtros) {
      if (filtros.unidades) params = params.set('unidades', filtros.unidades);
      if (filtros.desde) params = params.set('desde', filtros.desde);
      if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    }
    return this.http.get<any[]>(`${this.apiUrl}/historial`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene el detalle completo de un registro del historial por su UUID.
   */
  obtenerHistorialPorId(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/historial/${String(id)}`);
  }

  /**
   * Obtiene la estructura de una unidad específica para realizar la revisión.
   */
  obtenerUnidad(unidad: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/unidad/${unidad}`);
  }

  /**
   * Guarda un nuevo checklist de bolso de trauma (borrador o final).
   */
  guardar(unidad: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/unidad/${unidad}/revision`, payload);
  }
}