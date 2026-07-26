import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { apiUrl } from '../utils/api-url.util';
import type {
  BodegaDto,
  InventarioCarroDto,
  InventarioItemDto,
  InventarioListadoDto,
  MaterialCatalogoDto,
  MovimientoBodegaDto,
  ResumenInventarioDto,
  StockBodegaDto,
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

  exportarItems(filtros: Omit<FiltrosInventarioItems, 'page' | 'pageSize'> = {}): Observable<InventarioItemDto[]> {
    let params = new HttpParams();
    if (filtros.q?.trim()) params = params.set('q', filtros.q.trim());
    if (filtros.bodega && filtros.bodega !== 'TODAS') params = params.set('bodega', filtros.bodega);
    if (filtros.categoria && filtros.categoria !== 'TODAS') params = params.set('categoria', filtros.categoria);
    if (filtros.voluntario?.trim()) params = params.set('voluntario', filtros.voluntario.trim());
    return this.http.get<ApiOk<InventarioItemDto[]>>(`${this.base}/items/export`, { params }).pipe(map((r) => r.data));
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

  obtenerResumen(): Observable<ResumenInventarioDto> {
    return this.http.get<ApiOk<ResumenInventarioDto>>(`${this.base}/resumen`).pipe(map((r) => r.data));
  }

  listarStockBodega(): Observable<StockBodegaDto[]> {
    return this.http.get<ApiOk<StockBodegaDto[]>>(`${this.base}/bodega`).pipe(map((r) => r.data));
  }

  listarInventarioCarros(): Observable<InventarioCarroDto[]> {
    return this.http.get<ApiOk<InventarioCarroDto[]>>(`${this.base}/carros`).pipe(map((r) => r.data));
  }

  listarMovimientos(materialId?: number): Observable<MovimientoBodegaDto[]> {
    const params = materialId ? { materialId: String(materialId) } : undefined;
    return this.http
      .get<ApiOk<MovimientoBodegaDto[]>>(`${this.base}/bodega/movimientos`, { params })
      .pipe(map((r) => r.data));
  }

  registrarMovimiento(body: {
    materialId: number;
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    cantidad: number;
    motivo?: string;
  }): Observable<{ stock: StockBodegaDto; movimiento: MovimientoBodegaDto }> {
    return this.http
      .post<ApiOk<{ stock: StockBodegaDto; movimiento: MovimientoBodegaDto }>>(`${this.base}/bodega/movimientos`, body)
      .pipe(map((r) => r.data));
  }

  listarMateriales(incluirInactivos = false): Observable<MaterialCatalogoDto[]> {
    const params = incluirInactivos ? { incluirInactivos: '1' } : undefined;
    return this.http.get<ApiOk<MaterialCatalogoDto[]>>(this.materialesBase, { params }).pipe(map((r) => r.data));
  }
}
