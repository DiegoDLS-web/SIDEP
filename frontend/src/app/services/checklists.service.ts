import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  ChecklistPlantillaDTO, 
  ChecklistEjecucionDTO, 
  RegistrarChecklistDTO, 
  ChecklistUnidadResponseDto 
} from '../models/checklist.dto';

@Injectable({ providedIn: 'root' })
export class ChecklistsService {
  private apiUrl = `${environment.apiUrl}/logistica/checklist`;

  constructor(private http: HttpClient) {}

  // ====================================================================
  // 1. MÉTODOS "PUENTE" (REQUERIDOS POR EL COMPONENTE DE TU COLEGA)
  // ====================================================================

  obtenerChecklistUnidad(unidad: string): Observable<ChecklistUnidadResponseDto> {
    // Retornamos estructura básica para que el componente no explote
    return of({
      unidad,
      carro: { id: '1', nomenclatura: unidad, nombre: 'Unidad ' + unidad },
      checklist: null
    });
  }

  obtenerPlantillaUnidad(unidad: string): Observable<any> {
    return this.getPlantillas().pipe(
      map(res => {
        const plantilla = res.data?.find(p => p.codigo === `CHK-${unidad}`);
        return plantilla ? { ubicaciones: typeof plantilla.estructuraJson === 'string' ? JSON.parse(plantilla.estructuraJson) : plantilla.estructuraJson } : { ubicaciones: [] };
      }),
      catchError(() => of({ ubicaciones: [] }))
    );
  }

  guardarChecklistUnidad(unidad: string, payload: any): Observable<any> {
    const request: RegistrarChecklistDTO = {
      carroId: '1',
      revisorRut: payload.cuarteleroId,
      plantillaId: 'default-plantilla-id',
      resultadosMateriales: payload.detalle
    };
    return this.registrarEjecucion(request);
  }

  guardarPlantillaUnidad(unidad: string, payload: { ubicaciones: any[] }): Observable<boolean> {
    const nuevaPlantilla = {
      codigo: `CHK-${unidad}`,
      nombre: `Plantilla ${unidad}`,
      entidadTipo: 'CARRO',
      estructuraJson: payload.ubicaciones,
      version: 1,
      activo: 1
    };
    return this.createPlantilla(nuevaPlantilla).pipe(map(() => true), catchError(() => of(false)));
  }

  // ====================================================================
  // 2. NUESTROS MÉTODOS CRUD (NUEVO BACKEND POSTGRESQL)
  // ====================================================================

  getPlantillas(): Observable<{success: boolean, data: ChecklistPlantillaDTO[]}> {
    return this.http.get<{success: boolean, data: ChecklistPlantillaDTO[]}>(`${this.apiUrl}/plantillas`);
  }

  createPlantilla(data: any): Observable<{success: boolean, data: ChecklistPlantillaDTO}> {
    return this.http.post<{success: boolean, data: ChecklistPlantillaDTO}>(`${this.apiUrl}/plantillas`, data);
  }

  registrarEjecucion(data: RegistrarChecklistDTO): Observable<{success: boolean, data: ChecklistEjecucionDTO}> {
    return this.http.post<{success: boolean, data: ChecklistEjecucionDTO}>(`${this.apiUrl}/ejecucion`, data);
  }

  getHistorial(carroId?: string): Observable<{success: boolean, data: ChecklistEjecucionDTO[]}> {
    let params = new HttpParams();
    if (carroId) params = params.set('carroId', carroId);
    return this.http.get<{success: boolean, data: ChecklistEjecucionDTO[]}>(`${this.apiUrl}/historial`, { params });
  }

  getDetalleEjecucion(id: string): Observable<{success: boolean, data: ChecklistEjecucionDTO}> {
    return this.http.get<{success: boolean, data: ChecklistEjecucionDTO}>(`${this.apiUrl}/ejecucion/${id}`);
  }
}