import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../utils/api-url.util';
import type {
  AlertaInventarioDto,
  BodegaDto,
  EppAsignadoUsuarioDto,
  FilaMatrizEppDto,
  InventarioCarroDto,
  CrearItemInventarioPayload,
  InventarioItemDto,
  InventarioListadoDto,
  InventarioMovimientoItemDto,
  MaterialCatalogoDto,
  ResumenInventarioDto,
  TipoMovimientoInventario,
} from '../models/inventarios.dto';

type ApiOk<T> = { success: boolean; data: T };

export type FiltrosInventarioItems = {
  q?: string;
  bodega?: string;
  categoria?: string;
  voluntario?: string;
  page?: number;
  pageSize?: number;
};

@Injectable({ providedIn: 'root' })
export class InventariosService {
  private readonly http = inject(HttpClient);
  private readonly base = apiUrl('logistica', 'inventarios');
  private readonly materialesBase = apiUrl('logistica', 'catalogo-materiales');

  listarItems(filtros: FiltrosInventarioItems = {}): Observable<InventarioListadoDto> {
    let params = new HttpParams();
    if (filtros.q?.trim()) params = params.set('q', filtros.q.trim());
    if (filtros.bodega && filtros.bodega !== 'TODAS') params = params.set('bodega', filtros.bodega);
    if (filtros.categoria && filtros.categoria !== 'TODAS') params = params.set('categoria', filtros.categoria);
    if (filtros.voluntario?.trim()) params = params.set('voluntario', filtros.voluntario.trim());
    params = params.set('page', String(filtros.page ?? 1));
    params = params.set('pageSize', String(filtros.pageSize ?? 50));
    return this.http.get<ApiOk<InventarioListadoDto>>(`${this.base}/items`, { params }).pipe(map((r) => r.data));
  }

  crearItem(payload: CrearItemInventarioPayload): Observable<InventarioItemDto> {
    return this.http.post<ApiOk<InventarioItemDto>>(`${this.base}/items`, payload).pipe(map((r) => r.data));
  }

  exportarItems(filtros: Omit<FiltrosInventarioItems, 'page' | 'pageSize'> = {}): Observable<InventarioItemDto[]> {
    let params = new HttpParams();
    if (filtros.q?.trim()) params = params.set('q', filtros.q.trim());
    if (filtros.bodega && filtros.bodega !== 'TODAS') params = params.set('bodega', filtros.bodega);
    if (filtros.categoria && filtros.categoria !== 'TODAS') params = params.set('categoria', filtros.categoria);
    if (filtros.voluntario?.trim()) params = params.set('voluntario', filtros.voluntario.trim());
    return this.http.get<ApiOk<InventarioItemDto[]>>(`${this.base}/items/export`, { params }).pipe(map((r) => r.data));
  }

  estadoImportacion(): Observable<{ total: number; importado: boolean }> {
    return this.http
      .get<ApiOk<{ total: number; importado: boolean }>>(`${this.base}/importacion/estado`)
      .pipe(map((r) => r.data));
  }

  importarExcel(
    archivo: File,
    permitirDuplicados = false,
  ): Observable<{ insertados: number; omitidos: number; errores: string[] }> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    if (permitirDuplicados) fd.append('permitirDuplicados', 'true');
    return this.http
      .post<ApiOk<{ insertados: number; omitidos: number; errores: string[] }>>(
        `${this.base}/importacion`,
        fd,
      )
      .pipe(map((r) => r.data));
  }

  listarBodegas(): Observable<BodegaDto[]> {
    return this.http.get<ApiOk<BodegaDto[]>>(`${this.base}/bodegas`).pipe(map((r) => r.data));
  }

  ajustarCantidadItem(id: number, delta: number): Observable<InventarioItemDto> {
    return this.http
      .patch<ApiOk<InventarioItemDto>>(`${this.base}/items/${id}/cantidad`, { delta })
      .pipe(map((r) => r.data));
  }

  actualizarMetaItem(id: number, data: { talla: string | null }): Observable<InventarioItemDto> {
    return this.http
      .patch<ApiOk<InventarioItemDto>>(`${this.base}/items/${id}/meta`, data)
      .pipe(map((r) => r.data));
  }

  asignarEpp(itemId: number, usuarioRut: string): Observable<InventarioItemDto> {
    return this.http
      .post<ApiOk<InventarioItemDto>>(`${this.base}/items/${itemId}/asignar-epp`, { usuarioRut })
      .pipe(map((r) => r.data));
  }

  quitarAsignacionEpp(asignacionId: string): Observable<InventarioItemDto> {
    return this.http
      .delete<ApiOk<InventarioItemDto>>(`${this.base}/items/asignaciones/${asignacionId}`)
      .pipe(map((r) => r.data));
  }

  listarMovimientosInventario(filtros: {
    bodega?: string;
    inventarioItemId?: number;
    limit?: number;
  } = {}): Observable<InventarioMovimientoItemDto[]> {
    let params = new HttpParams();
    if (filtros.bodega && filtros.bodega !== 'TODAS') params = params.set('bodega', filtros.bodega);
    if (filtros.inventarioItemId) params = params.set('inventarioItemId', String(filtros.inventarioItemId));
    if (filtros.limit) params = params.set('limit', String(filtros.limit));
    return this.http
      .get<ApiOk<InventarioMovimientoItemDto[]>>(`${this.base}/movimientos`, { params })
      .pipe(map((r) => r.data));
  }

  registrarMovimientoItem(
    itemId: number,
    body: { tipo: TipoMovimientoInventario; cantidad: number; motivo?: string },
  ): Observable<InventarioItemDto> {
    return this.http
      .post<ApiOk<InventarioItemDto>>(`${this.base}/items/${itemId}/movimiento`, body)
      .pipe(map((r) => r.data));
  }

  obtenerResumen(): Observable<ResumenInventarioDto> {
    return this.http.get<ApiOk<ResumenInventarioDto>>(`${this.base}/resumen`).pipe(map((r) => r.data));
  }

  listarInventarioCarros(): Observable<InventarioCarroDto[]> {
    return this.http.get<ApiOk<InventarioCarroDto[]>>(`${this.base}/carros`).pipe(map((r) => r.data));
  }

  listarMateriales(incluirInactivos = false): Observable<MaterialCatalogoDto[]> {
    const params = incluirInactivos ? { incluirInactivos: '1' } : undefined;
    return this.http.get<ApiOk<MaterialCatalogoDto[]>>(this.materialesBase, { params }).pipe(map((r) => r.data));
  }

  listarAlertas(bodega?: string): Observable<AlertaInventarioDto[]> {
    let params = new HttpParams();
    if (bodega && bodega !== 'TODAS') params = params.set('bodega', bodega);
    return this.http.get<ApiOk<AlertaInventarioDto[]>>(`${this.base}/alertas`, { params }).pipe(map((r) => r.data));
  }

  listarMatrizEpp(filtros: Omit<FiltrosInventarioItems, 'page' | 'pageSize'> = {}): Observable<FilaMatrizEppDto[]> {
    let params = new HttpParams();
    if (filtros.q?.trim()) params = params.set('q', filtros.q.trim());
    if (filtros.bodega && filtros.bodega !== 'TODAS') params = params.set('bodega', filtros.bodega);
    if (filtros.categoria && filtros.categoria !== 'TODAS') params = params.set('categoria', filtros.categoria);
    if (filtros.voluntario?.trim()) params = params.set('voluntario', filtros.voluntario.trim());
    return this.http.get<ApiOk<FilaMatrizEppDto[]>>(`${this.base}/matriz-epp`, { params }).pipe(map((r) => r.data));
  }

  listarEppUsuario(rut: string): Observable<EppAsignadoUsuarioDto[]> {
    return this.http
      .get<ApiOk<EppAsignadoUsuarioDto[]>>(`${this.base}/epp/usuario/${encodeURIComponent(rut)}`)
      .pipe(map((r) => r.data));
  }

  stockPorNombres(nombres: string[]): Observable<Record<string, { disponible: number; bodega: string; itemId: number | null }>> {
    const params = new HttpParams().set('nombres', nombres.join('|'));
    return this.http
      .get<ApiOk<Record<string, { disponible: number; bodega: string; itemId: number | null }>>>(`${this.base}/stock-por-nombres`, {
        params,
      })
      .pipe(map((r) => r.data));
  }
}
