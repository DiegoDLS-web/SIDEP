import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/ia';

  estado(): Observable<{ disponible: boolean; modelo: string; proveedor: string }> {
    return this.http.get<{ disponible: boolean; modelo: string; proveedor: string }>(`${this.base}/estado`);
  }

  asistirNovedad(texto: string): Observable<any> {
    return this.http.post(`${this.base}/novedades/asistir`, { texto });
  }

  normalizarDireccion(direccion: string, referencia?: string): Observable<any> {
    return this.http.post(`${this.base}/partes/direccion`, { direccion, referencia });
  }

  inconsistenciasParte(payload: Record<string, unknown>): Observable<any> {
    return this.http.post(`${this.base}/partes/inconsistencias`, { payload });
  }

  checklistCriticos(body: {
    unidad?: string;
    tipo?: string;
    itemsFallados?: Array<{ nombre: string; critico?: boolean; observacion?: string | null }>;
  }): Observable<any> {
    return this.http.post(`${this.base}/checklist/criticos`, body);
  }

  checklistResumenDiario(): Observable<any> {
    return this.http.get(`${this.base}/checklist/resumen-diario`);
  }

  clasificarEstado(descripcion: string): Observable<any> {
    return this.http.post(`${this.base}/inventario/estado-foto`, { descripcion });
  }

  sugerirMovimiento(descripcion: string): Observable<any> {
    return this.http.post(`${this.base}/inventario/movimiento`, { descripcion });
  }

  alertasInventario(): Observable<any> {
    return this.http.get(`${this.base}/inventario/alertas`);
  }

  matchingTalla(nombreArticulo: string, talla?: string, categoria?: string): Observable<any> {
    return this.http.post(`${this.base}/inventario/talla`, { nombreArticulo, talla, categoria });
  }

  preguntaAsistencia(pregunta: string): Observable<any> {
    return this.http.post(`${this.base}/asistencia/pregunta`, { pregunta });
  }

  huecosCobertura(desde?: string, hasta?: string): Observable<any> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get(`${this.base}/asistencia/huecos`, { params });
  }

  faltasSemanal(grupo?: string): Observable<any> {
    let params = new HttpParams();
    if (grupo) params = params.set('grupo', grupo);
    return this.http.get(`${this.base}/asistencia/faltas-semanal`, { params });
  }

  chatAnalitica(pregunta: string, anio?: number, mes?: number): Observable<any> {
    return this.http.post(`${this.base}/analitica/chat`, { pregunta, anio, mes });
  }

  extraerLicencia(texto: string): Observable<any> {
    return this.http.post(`${this.base}/licencias/extraer`, { texto });
  }

  solapeLicencia(usuarioRut: string, fechaInicio: string, fechaTermino: string): Observable<any> {
    return this.http.post(`${this.base}/licencias/solape`, { usuarioRut, fechaInicio, fechaTermino });
  }

  priorizarNotificaciones(alertas: Array<{ tipo?: string; severidad?: string; titulo: string; detalle?: string }>): Observable<any> {
    return this.http.post(`${this.base}/notificaciones/priorizar`, { alertas });
  }
}
