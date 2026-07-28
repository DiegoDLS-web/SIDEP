import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import prisma from '../../../prisma';
import { AppError } from '../../../utils/errors/AppError';
import {
  etiquetaTipoEpp,
  extraerTallaDeNombre,
  inferirSistemaTalla,
  inferirTipoEpp,
  TALLAS_BOTA,
  TALLAS_ROPA,
  validarTalla,
  type SistemaTalla,
} from '../../../utils/epp-tallas.util';

export type EstadoStock = 'NORMAL' | 'BAJO' | 'CRITICO';

const METRICS_CACHE_TTL_MS = 60_000;
const metricsCache = new Map<string, { data: InventarioMetricasDto; expires: number }>();

export type InventarioItemDto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  tipoInventario: string | null;
  tipoEpp: string | null;
  tipoEppEtiqueta: string;
  talla: string | null;
  sistemaTalla: SistemaTalla;
  bodegaId: number;
  bodegaCodigo: string;
  bodegaNombre: string;
  marca: string | null;
  modelo: string | null;
  estadoFisico: string | null;
  valor: number | null;
  observaciones: string | null;
  unidad: string;
  /** Stock total físico del ítem (bodega + asignado). */
  cantidad: number;
  /** Unidades entregadas a voluntarios. */
  cantidadAsignada: number;
  /** Unidades libres en bodega = cantidad − asignada. */
  cantidadDisponible: number;
  stockMinimo: number;
  stockCritico: number;
  esEppAsignable: boolean;
  estadoStock: EstadoStock;
  asignaciones: Array<{
    id: string;
    usuarioRut: string;
    usuarioNombre: string;
    cantidad: number;
  }>;
};

export type InventarioMetricasDto = {
  totalItems: number;
  stockNormal: number;
  stockBajo: number;
  stockCritico: number;
};

export type InventarioListadoDto = {
  items: InventarioItemDto[];
  metricas: InventarioMetricasDto;
  total: number;
  page: number;
  pageSize: number;
};

export function calcularEstadoStock(cantidadDisponible: number, stockMinimo: number, stockCritico: number): EstadoStock {
  if (stockMinimo <= 0 && stockCritico <= 0) return 'NORMAL';
  if (stockCritico > 0 && cantidadDisponible <= stockCritico) return 'CRITICO';
  if (stockMinimo > 0 && cantidadDisponible < stockMinimo) return 'BAJO';
  return 'NORMAL';
}

type RowItem = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  tipoInventario: string | null;
  tipoEpp: string | null;
  talla: string | null;
  sistemaTalla: string | null;
  bodegaId: number;
  marca: string | null;
  modelo: string | null;
  estadoFisico: string | null;
  valor: { toNumber?: () => number } | number | null;
  observaciones: string | null;
  unidad: string;
  cantidad: number;
  stockMinimo: number;
  stockCritico: number;
  esEppAsignable: number;
  bodega: { codigo: string; nombre: string };
  asignaciones: Array<{
    id: string;
    usuarioRut: string;
    cantidad: number;
    usuario: { nombres: string; apellidoPaterno: string; apellidoMaterno: string };
  }>;
};

function mapItem(row: RowItem): InventarioItemDto {
  const cantidadAsignada = row.asignaciones.reduce((acc, a) => acc + (a.cantidad || 0), 0);
  const cantidadDisponible = Math.max(0, row.cantidad - cantidadAsignada);
  const tipoEpp =
    row.tipoEpp ??
    (row.esEppAsignable === 1 ? inferirTipoEpp(row.nombre, row.categoria) : null);
  const sistemaTalla =
    (row.sistemaTalla as SistemaTalla) ?? inferirSistemaTalla(tipoEpp);

  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    tipoInventario: row.tipoInventario,
    tipoEpp,
    tipoEppEtiqueta: etiquetaTipoEpp(tipoEpp),
    talla: row.talla,
    sistemaTalla,
    bodegaId: row.bodegaId,
    bodegaCodigo: row.bodega.codigo,
    bodegaNombre: row.bodega.nombre,
    marca: row.marca,
    modelo: row.modelo,
    estadoFisico: row.estadoFisico,
    valor: row.valor != null ? Number(row.valor) : null,
    observaciones: row.observaciones,
    unidad: row.unidad,
    cantidad: row.cantidad,
    cantidadAsignada,
    cantidadDisponible,
    stockMinimo: row.stockMinimo,
    stockCritico: row.stockCritico,
    esEppAsignable: row.esEppAsignable === 1,
    estadoStock: calcularEstadoStock(cantidadDisponible, row.stockMinimo, row.stockCritico),
    asignaciones: row.asignaciones.map((a) => ({
      id: a.id,
      usuarioRut: a.usuarioRut,
      usuarioNombre: `${a.usuario.nombres} ${a.usuario.apellidoPaterno} ${a.usuario.apellidoMaterno}`.trim(),
      cantidad: a.cantidad,
    })),
  };
}

const includeItem = {
  bodega: true,
  asignaciones: {
    include: {
      usuario: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
    },
  },
} as const;

export async function listarItems(filtros: {
  q?: string;
  bodega?: string;
  categoria?: string;
  voluntario?: string;
  page?: number;
  pageSize?: number;
}): Promise<InventarioListadoDto> {
  const page = Math.max(1, filtros.page ?? 1);
  const pageSize = Math.min(200, Math.max(10, filtros.pageSize ?? 50));

  const where: Record<string, unknown> = { activo: 1 };

  if (filtros.bodega && filtros.bodega !== 'TODAS') {
    where.bodega = { codigo: filtros.bodega };
  }

  if (filtros.categoria && filtros.categoria !== 'TODAS') {
    where.categoria = filtros.categoria;
  }

  if (filtros.q?.trim()) {
    const q = filtros.q.trim();
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { codigo: { contains: q, mode: 'insensitive' } },
      { marca: { contains: q, mode: 'insensitive' } },
      { talla: { contains: q, mode: 'insensitive' } },
      { tipoEpp: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (filtros.voluntario?.trim()) {
    const v = filtros.voluntario.trim();
    where.asignaciones = {
      some: {
        OR: [
          { usuarioRut: { contains: v, mode: 'insensitive' } },
          { usuario: { nombres: { contains: v, mode: 'insensitive' } } },
          { usuario: { apellidoPaterno: { contains: v, mode: 'insensitive' } } },
          { usuario: { apellidoMaterno: { contains: v, mode: 'insensitive' } } },
        ],
      },
    };
  }

  const [total, rows, metricas] = await Promise.all([
    prisma.inventarioItem.count({ where }),
    prisma.inventarioItem.findMany({
      where,
      include: includeItem,
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }, { talla: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    calcularMetricasDesdeDb(filtros.bodega),
  ]);

  return {
    items: rows.map(mapItem),
    metricas,
    total,
    page,
    pageSize,
  };
}

function calcularMetricas(
  rows: Array<{ cantidadDisponible: number; stockMinimo: number; stockCritico: number }>,
): InventarioMetricasDto {
  let stockNormal = 0;
  let stockBajo = 0;
  let stockCritico = 0;
  for (const r of rows) {
    const e = calcularEstadoStock(r.cantidadDisponible, r.stockMinimo, r.stockCritico);
    if (e === 'CRITICO') stockCritico += 1;
    else if (e === 'BAJO') stockBajo += 1;
    else stockNormal += 1;
  }
  return { totalItems: rows.length, stockNormal, stockBajo, stockCritico };
}

async function calcularMetricasDesdeDb(bodega?: string): Promise<InventarioMetricasDto> {
  const key = bodega ?? 'TODAS';
  const hit = metricsCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  const where: Prisma.InventarioItemWhereInput = { activo: 1 };
  if (bodega && bodega !== 'TODAS') {
    where.bodega = { codigo: bodega };
  }
  const rows = await prisma.inventarioItem.findMany({
    where,
    select: {
      cantidad: true,
      stockMinimo: true,
      stockCritico: true,
      asignaciones: { select: { cantidad: true } },
    },
  });
  const result = calcularMetricas(
    rows.map((r) => ({
      cantidadDisponible: Math.max(0, r.cantidad - r.asignaciones.reduce((a, x) => a + x.cantidad, 0)),
      stockMinimo: r.stockMinimo,
      stockCritico: r.stockCritico,
    })),
  );
  metricsCache.set(key, { data: result, expires: Date.now() + METRICS_CACHE_TTL_MS });
  return result;
}

export async function actualizarMetaItem(
  id: number,
  data: { talla?: string | null },
): Promise<InventarioItemDto> {
  const item = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  if (!item || item.activo !== 1) throw new AppError('Ítem no encontrado', 404);

  const tipoEpp = item.tipoEpp ?? (item.esEppAsignable === 1 ? inferirTipoEpp(item.nombre, item.categoria) : null);
  const sistema = (item.sistemaTalla as SistemaTalla) ?? inferirSistemaTalla(tipoEpp);

  let talla = data.talla !== undefined ? (data.talla?.trim().toUpperCase() || null) : item.talla;
  if (data.talla !== undefined && sistema) {
    const err = validarTalla(sistema, talla);
    if (err) throw new AppError(err, 400);
  }

  await prisma.inventarioItem.update({
    where: { id },
    data: {
      talla,
      tipoEpp: item.tipoEpp ?? tipoEpp,
      sistemaTalla: item.sistemaTalla ?? sistema,
    },
  });

  const actualizado = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  return mapItem(actualizado!);
}

export async function ajustarCantidadItem(
  id: number,
  delta: number,
  usuarioRut?: string | null,
): Promise<InventarioItemDto> {
  const item = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  if (!item || item.activo !== 1) throw new AppError('Ítem no encontrado', 404);

  const cambio = Math.trunc(delta);
  if (!cambio) throw new AppError('Cantidad inválida', 400);

  const asignado = item.asignaciones.reduce((a, x) => a + x.cantidad, 0);
  const antes = item.cantidad;
  const despues = antes + cambio;
  if (despues < 0) throw new AppError('Stock insuficiente', 400);
  if (despues < asignado) {
    throw new AppError(
      `No se puede reducir el stock por debajo de las ${asignado} unidad(es) ya asignadas a voluntarios.`,
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventarioItem.update({ where: { id }, data: { cantidad: despues } });
    await tx.inventarioMovimiento.create({
      data: {
        id: randomUUID(),
        inventarioItemId: id,
        tipo: cambio > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad: Math.abs(cambio),
        cantidadAntes: antes,
        cantidadDespues: despues,
        motivo: cambio > 0 ? 'Ajuste rápido +' : 'Ajuste rápido -',
        usuarioRut: usuarioRut ?? null,
      },
    });
  });

  const actualizado = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  return mapItem(actualizado!);
}

export async function asignarEppVoluntario(opts: {
  inventarioItemId: number;
  usuarioRut: string;
  cantidad?: number;
  observaciones?: string | null;
}): Promise<InventarioItemDto> {
  const item = await prisma.inventarioItem.findUnique({
    where: { id: opts.inventarioItemId },
    include: { asignaciones: true },
  });
  if (!item || item.activo !== 1) throw new AppError('Ítem no encontrado', 404);
  if (item.esEppAsignable !== 1) {
    throw new AppError('Este ítem no admite asignación a voluntarios', 400);
  }

  const usuario = await prisma.usuario.findUnique({ where: { rut: opts.usuarioRut } });
  if (!usuario || usuario.activo !== 1) throw new AppError('Voluntario no encontrado o inactivo', 404);

  const cantidad = Math.max(1, Math.trunc(opts.cantidad ?? 1));
  if (cantidad !== 1) {
    throw new AppError('Solo se puede asignar 1 unidad de EPP por voluntario.', 400);
  }

  const tipoEpp = item.tipoEpp ?? inferirTipoEpp(item.nombre, item.categoria);
  const sistema = (item.sistemaTalla as SistemaTalla) ?? inferirSistemaTalla(tipoEpp);
  let talla = item.talla ?? extraerTallaDeNombre(item.nombre, sistema);
  const errTalla = validarTalla(sistema, talla);
  if (errTalla) {
    throw new AppError(
      `No se puede asignar. ${errTalla} Botas: 35–46. Chaqueta, jardinera, rescate, forestal, agua, uniforme Nº1 y gorras: XS–XXL.`,
      400,
    );
  }

  const asignadoActual = item.asignaciones.reduce((a, x) => a + x.cantidad, 0);
  const disponible = item.cantidad - asignadoActual;
  if (disponible < 1) {
    throw new AppError(
      `No se puede asignar: no hay unidades disponibles en bodega (total ${item.cantidad}, asignadas ${asignadoActual}, disponibles 0).`,
      400,
    );
  }

  const yaMismoItem = item.asignaciones.some((a) => a.usuarioRut === opts.usuarioRut);
  if (yaMismoItem) {
    throw new AppError('Este voluntario ya tiene asignado este ítem.', 409);
  }

  // Solo 1 EPP del mismo tipo por voluntario (ej. una sola bota estructural).
  if (tipoEpp) {
    const conflicto = await prisma.asignacionInventarioEpp.findFirst({
      where: {
        usuarioRut: opts.usuarioRut,
        inventarioItem: { tipoEpp },
      },
      include: { inventarioItem: { select: { nombre: true, talla: true } } },
    });
    if (conflicto) {
      const t = conflicto.inventarioItem.talla ? ` talla ${conflicto.inventarioItem.talla}` : '';
      throw new AppError(
        `No se puede asignar: el voluntario ya tiene un ${etiquetaTipoEpp(tipoEpp)}${t} (${conflicto.inventarioItem.nombre}). Solo se permite uno por tipo.`,
        409,
      );
    }
  }

  await prisma.asignacionInventarioEpp.create({
    data: {
      id: randomUUID(),
      inventarioItemId: opts.inventarioItemId,
      usuarioRut: opts.usuarioRut,
      cantidad: 1,
      observaciones: opts.observaciones?.trim().slice(0, 255) ?? null,
    },
  });

  if (!item.tipoEpp || !item.sistemaTalla || !item.talla) {
    await prisma.inventarioItem.update({
      where: { id: item.id },
      data: {
        tipoEpp: item.tipoEpp ?? tipoEpp,
        sistemaTalla: item.sistemaTalla ?? sistema,
        talla: item.talla ?? talla,
      },
    });
  }

  const actualizado = await prisma.inventarioItem.findUnique({
    where: { id: opts.inventarioItemId },
    include: includeItem,
  });
  return mapItem(actualizado!);
}

export async function quitarAsignacionEpp(asignacionId: string): Promise<InventarioItemDto> {
  const asignacion = await prisma.asignacionInventarioEpp.findUnique({ where: { id: asignacionId } });
  if (!asignacion) throw new AppError('Asignación no encontrada', 404);

  await prisma.asignacionInventarioEpp.delete({ where: { id: asignacionId } });

  const actualizado = await prisma.inventarioItem.findUnique({
    where: { id: asignacion.inventarioItemId },
    include: includeItem,
  });
  return mapItem(actualizado!);
}

export async function listarParaExport(filtros: {
  q?: string;
  bodega?: string;
  categoria?: string;
  voluntario?: string;
}): Promise<InventarioItemDto[]> {
  const where: Prisma.InventarioItemWhereInput = { activo: 1 };

  if (filtros.bodega && filtros.bodega !== 'TODAS') {
    where.bodega = { codigo: filtros.bodega };
  }

  if (filtros.categoria && filtros.categoria !== 'TODAS') {
    where.categoria = filtros.categoria;
  }

  if (filtros.q?.trim()) {
    const q = filtros.q.trim();
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { codigo: { contains: q, mode: 'insensitive' } },
      { marca: { contains: q, mode: 'insensitive' } },
      { talla: { contains: q, mode: 'insensitive' } },
      { tipoEpp: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (filtros.voluntario?.trim()) {
    const v = filtros.voluntario.trim();
    where.asignaciones = {
      some: {
        OR: [
          { usuarioRut: { contains: v, mode: 'insensitive' } },
          { usuario: { nombres: { contains: v, mode: 'insensitive' } } },
          { usuario: { apellidoPaterno: { contains: v, mode: 'insensitive' } } },
          { usuario: { apellidoMaterno: { contains: v, mode: 'insensitive' } } },
        ],
      },
    };
  }

  const rows = await prisma.inventarioItem.findMany({
    where,
    include: includeItem,
    orderBy: [{ bodega: { codigo: 'asc' } }, { categoria: 'asc' }, { nombre: 'asc' }, { talla: 'asc' }],
  });

  return rows.map(mapItem);
}

export async function listarBodegas() {
  return prisma.catalogoBodega.findMany({ where: { activo: 1 }, orderBy: { nombre: 'asc' } });
}

export async function contarItems(): Promise<number> {
  return prisma.inventarioItem.count({ where: { activo: 1 } });
}

const UNIFORMES_RE = /UNIFORM|CHAQUET|PANTALON|BOTA|COTONA|JARDINERA|CHAQUETON|GORRA/i;

function inferCategoriaPlanilla(nombre: string, tipo: string): string {
  const n = nombre.toUpperCase();
  if (UNIFORMES_RE.test(n)) return 'Uniformes';
  if (n.includes('MANGUERA')) return 'Mangueras';
  if (n.includes('EXTINTOR')) return 'Extintores';
  if (tipo === 'EPP' && UNIFORMES_RE.test(n)) return 'Uniformes';
  return 'Equipamiento';
}

function inferBodegaCodigoPlanilla(nombre: string, tipo: string, categoria: string): string {
  if (categoria === 'Uniformes') return 'UNIFORMES';
  if (tipo === 'RESCATE') return 'RESCATE';
  if (tipo.includes('INCENDIO') || categoria === 'Mangueras' || categoria === 'Extintores') return 'AGUA';
  if (tipo === 'FORESTAL') return 'RESCATE';
  return 'RESCATE';
}

function esEppAsignablePlanilla(nombre: string, categoria: string, tipo: string): number {
  if (categoria === 'Uniformes') return 1;
  if (tipo !== 'EPP') return 0;
  return UNIFORMES_RE.test(nombre) ? 1 : 0;
}

function stockMinimoPlanilla(cantidad: number): number {
  const q = Math.max(0, Math.trunc(cantidad));
  if (q <= 1) return 1;
  if (q <= 5) return 2;
  return Math.max(2, Math.ceil(q * 0.4));
}

function stockCriticoPlanilla(min: number): number {
  return Math.max(1, Math.floor(min * 0.5));
}

async function siguienteCodigoInventario(): Promise<string> {
  const last = await prisma.inventarioItem.findFirst({
    where: { codigo: { startsWith: 'INV-' } },
    orderBy: { codigo: 'desc' },
    select: { codigo: true },
  });
  let n = 1;
  if (last?.codigo) {
    const m = /^INV-(\d+)$/.exec(last.codigo);
    if (m) n = parseInt(m[1]!, 10) + 1;
  }
  return `INV-${String(n).padStart(4, '0')}`;
}

export type CrearItemInventarioInput = {
  nombre: string;
  cantidad: number;
  tipoInventario: string;
  bodegaCodigo?: string;
  marca?: string | null;
  modelo?: string | null;
  estadoFisico?: string | null;
  valor?: number | null;
  observaciones?: string | null;
  talla?: string | null;
  categoria?: string | null;
};

export async function crearItemInstitucional(input: CrearItemInventarioInput): Promise<InventarioItemDto> {
  const nombre = input.nombre.trim();
  if (!nombre) throw new AppError('El nombre del ítem es obligatorio', 400);

  const cantidad = Math.max(0, Math.trunc(Number(input.cantidad)));
  if (cantidad <= 0) throw new AppError('La cantidad debe ser mayor a 0', 400);

  const tipo = (input.tipoInventario?.trim() || 'OTRO').slice(0, 80);
  const categoria = (input.categoria?.trim() || inferCategoriaPlanilla(nombre, tipo)).slice(0, 80);
  const bodegaCodigo = (input.bodegaCodigo?.trim() || inferBodegaCodigoPlanilla(nombre, tipo, categoria)).toUpperCase();

  const bodega = await prisma.catalogoBodega.findFirst({ where: { codigo: bodegaCodigo, activo: 1 } });
  if (!bodega) throw new AppError(`Bodega no encontrada: ${bodegaCodigo}`, 400);

  const epp = esEppAsignablePlanilla(nombre, categoria, tipo);
  const tipoEpp = epp ? inferirTipoEpp(nombre, categoria) : null;
  const sistemaTalla = inferirSistemaTalla(tipoEpp);
  let talla = input.talla?.trim() || null;
  if (talla && sistemaTalla) {
    const errTalla = validarTalla(sistemaTalla, talla);
    if (errTalla) throw new AppError(errTalla, 400);
  }
  if (!talla && epp) {
    talla = extraerTallaDeNombre(nombre, sistemaTalla);
  }

  const min = stockMinimoPlanilla(cantidad);
  const crit = stockCriticoPlanilla(min);
  const codigo = await siguienteCodigoInventario();

  const valorRaw = input.valor != null ? Number(input.valor) : null;
  const valor = valorRaw != null && Number.isFinite(valorRaw) && valorRaw > 0 ? valorRaw : null;

  const created = await prisma.inventarioItem.create({
    data: {
      codigo,
      nombre: nombre.slice(0, 200),
      categoria,
      tipoInventario: tipo,
      tipoEpp,
      talla,
      sistemaTalla,
      bodegaId: bodega.id,
      marca: input.marca?.trim().slice(0, 100) || null,
      modelo: input.modelo?.trim().slice(0, 100) || null,
      estadoFisico: input.estadoFisico?.trim().slice(0, 50) || null,
      valor,
      observaciones: input.observaciones?.trim().slice(0, 500) || null,
      unidad: 'unidades',
      cantidad,
      stockMinimo: min,
      stockCritico: crit,
      esEppAsignable: epp,
      activo: 1,
    },
    include: includeItem,
  });

  metricsCache.clear();
  return mapItem(created);
}

/** Completa tipoEpp / sistemaTalla / talla en ítems EPP existentes. */
export async function backfillTiposEpp(): Promise<number> {
  const rows = await prisma.inventarioItem.findMany({
    where: { activo: 1, esEppAsignable: 1 },
    select: { id: true, nombre: true, categoria: true, tipoEpp: true, sistemaTalla: true, talla: true },
  });
  let n = 0;
  for (const r of rows) {
    const tipo = r.tipoEpp ?? inferirTipoEpp(r.nombre, r.categoria);
    const sistema = (r.sistemaTalla as SistemaTalla) ?? inferirSistemaTalla(tipo);
    const talla = r.talla ?? extraerTallaDeNombre(r.nombre, sistema);
    if (tipo !== r.tipoEpp || sistema !== r.sistemaTalla || talla !== r.talla) {
      await prisma.inventarioItem.update({
        where: { id: r.id },
        data: { tipoEpp: tipo, sistemaTalla: sistema, talla },
      });
      n += 1;
    }
  }
  return n;
}

export type InventarioMovimientoDto = {
  id: string;
  inventarioItemId: number;
  itemCodigo: string;
  itemNombre: string;
  bodegaCodigo: string;
  bodegaNombre: string;
  tipo: string;
  cantidad: number;
  cantidadAntes: number;
  cantidadDespues: number;
  motivo: string | null;
  usuarioNombre: string | null;
  createdAt: string;
};

export async function listarMovimientosInventario(filtros: {
  bodega?: string;
  inventarioItemId?: number;
  limit?: number;
}): Promise<InventarioMovimientoDto[]> {
  const where: Prisma.InventarioMovimientoWhereInput = {};
  if (filtros.inventarioItemId) {
    where.inventarioItemId = filtros.inventarioItemId;
  }
  if (filtros.bodega && filtros.bodega !== 'TODAS') {
    where.inventarioItem = { bodega: { codigo: filtros.bodega }, activo: 1 };
  }

  const rows = await prisma.inventarioMovimiento.findMany({
    where,
    include: {
      inventarioItem: { include: { bodega: true } },
      usuario: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, filtros.limit ?? 30)),
  });

  return rows.map((r) => ({
    id: r.id,
    inventarioItemId: r.inventarioItemId,
    itemCodigo: r.inventarioItem.codigo,
    itemNombre: r.inventarioItem.nombre,
    bodegaCodigo: r.inventarioItem.bodega.codigo,
    bodegaNombre: r.inventarioItem.bodega.nombre,
    tipo: r.tipo,
    cantidad: r.cantidad,
    cantidadAntes: r.cantidadAntes,
    cantidadDespues: r.cantidadDespues,
    motivo: r.motivo,
    usuarioNombre: r.usuario
      ? `${r.usuario.nombres} ${r.usuario.apellidoPaterno} ${r.usuario.apellidoMaterno}`.trim()
      : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function registrarMovimientoItem(
  id: number,
  opts: { tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE'; cantidad: number; motivo?: string | null },
  usuarioRut?: string | null,
): Promise<InventarioItemDto> {
  const item = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  if (!item || item.activo !== 1) throw new AppError('Ítem no encontrado', 404);

  const qty = Math.trunc(opts.cantidad);
  if (qty <= 0) throw new AppError('La cantidad debe ser mayor a 0', 400);

  const asignado = item.asignaciones.reduce((a, x) => a + x.cantidad, 0);
  const antes = item.cantidad;
  let despues: number;
  let cantidadMov = qty;

  if (opts.tipo === 'ENTRADA') {
    despues = antes + qty;
  } else if (opts.tipo === 'SALIDA') {
    despues = antes - qty;
    if (despues < 0) throw new AppError('Stock insuficiente', 400);
  } else {
    despues = qty;
    cantidadMov = Math.abs(despues - antes);
    if (despues === antes) throw new AppError('El stock ya tiene ese valor', 400);
  }

  if (despues < asignado) {
    throw new AppError(
      `No se puede reducir el stock por debajo de las ${asignado} unidad(es) ya asignadas a voluntarios.`,
      400,
    );
  }

  const motivoDefault =
    opts.tipo === 'ENTRADA' ? 'Entrada de stock' : opts.tipo === 'SALIDA' ? 'Salida de stock' : 'Ajuste de inventario';
  const motivo = opts.motivo?.trim().slice(0, 255) || motivoDefault;

  await prisma.$transaction(async (tx) => {
    await tx.inventarioItem.update({ where: { id }, data: { cantidad: despues } });
    await tx.inventarioMovimiento.create({
      data: {
        id: randomUUID(),
        inventarioItemId: id,
        tipo: opts.tipo,
        cantidad: cantidadMov,
        cantidadAntes: antes,
        cantidadDespues: despues,
        motivo,
        usuarioRut: usuarioRut ?? null,
      },
    });
  });

  const actualizado = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  return mapItem(actualizado!);
}

export type ItemAlertaStockDto = {
  codigo: string;
  nombre: string;
  bodega: string;
  cantidadDisponible: number;
  stockMinimo: number;
  stockCritico: number;
  estadoStock: 'BAJO' | 'CRITICO';
};

export async function listarItemsAlertaStock(): Promise<ItemAlertaStockDto[]> {
  const rows = await prisma.inventarioItem.findMany({
    where: { activo: 1 },
    select: {
      codigo: true,
      nombre: true,
      cantidad: true,
      stockMinimo: true,
      stockCritico: true,
      bodega: { select: { nombre: true, codigo: true } },
      asignaciones: { select: { cantidad: true } },
    },
  });

  const alertas: ItemAlertaStockDto[] = [];
  for (const row of rows) {
    const asignado = row.asignaciones.reduce((a, x) => a + x.cantidad, 0);
    const disponible = Math.max(0, row.cantidad - asignado);
    const estado = calcularEstadoStock(disponible, row.stockMinimo, row.stockCritico);
    if (estado !== 'BAJO' && estado !== 'CRITICO') continue;
    alertas.push({
      codigo: row.codigo,
      nombre: row.nombre,
      bodega: row.bodega?.nombre ?? row.bodega?.codigo ?? '—',
      cantidadDisponible: disponible,
      stockMinimo: row.stockMinimo,
      stockCritico: row.stockCritico,
      estadoStock: estado,
    });
  }

  return alertas.sort(
    (a, b) =>
      (a.estadoStock === 'CRITICO' ? 0 : 1) - (b.estadoStock === 'CRITICO' ? 0 : 1) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export type AlertaInventarioDto = {
  tipo: 'stock_critico' | 'stock_bajo' | 'epp_sin_talla' | 'uniforme_sin_stock';
  severidad: 'critico' | 'advertencia' | 'info';
  titulo: string;
  detalle: string;
  itemId?: number;
  codigo?: string;
  bodega?: string;
  talla?: string | null;
  /** Ítems agrupados con el mismo nombre/bodega/estado (evita tarjetas duplicadas). */
  cantidadAgrupada?: number;
};

function agruparAlertasStock(alertas: AlertaInventarioDto[]): AlertaInventarioDto[] {
  const map = new Map<string, AlertaInventarioDto & { ids: number[] }>();
  for (const a of alertas) {
    if (a.tipo !== 'stock_critico' && a.tipo !== 'stock_bajo') continue;
    const key = `${a.tipo}|${a.titulo}|${a.bodega ?? ''}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...a, cantidadAgrupada: 1, ids: a.itemId ? [a.itemId] : [] });
      continue;
    }
    prev.cantidadAgrupada = (prev.cantidadAgrupada ?? 1) + 1;
    if (a.itemId) prev.ids.push(a.itemId);
  }
  return [...map.values()].map(({ ids: _ids, ...a }) => a);
}

export async function obtenerAlertasInventario(bodega?: string): Promise<AlertaInventarioDto[]> {
  const where: Prisma.InventarioItemWhereInput = { activo: 1 };
  if (bodega && bodega !== 'TODAS') {
    where.bodega = { codigo: bodega };
  }

  const rows = await prisma.inventarioItem.findMany({
    where,
    include: {
      bodega: { select: { nombre: true, codigo: true } },
      asignaciones: { select: { cantidad: true } },
    },
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  });

  const alertas: AlertaInventarioDto[] = [];

  for (const row of rows) {
    const asignado = row.asignaciones.reduce((a, x) => a + x.cantidad, 0);
    const disponible = Math.max(0, row.cantidad - asignado);
    const bodegaLabel = row.bodega?.nombre ?? row.bodega?.codigo ?? '—';
    const estado = calcularEstadoStock(disponible, row.stockMinimo, row.stockCritico);

    if (estado === 'CRITICO') {
      alertas.push({
        tipo: 'stock_critico',
        severidad: 'critico',
        titulo: `${row.nombre}${row.talla ? ` (${row.talla})` : ''}`,
        detalle: `${disponible} disp. · mín. ${row.stockMinimo}`,
        itemId: row.id,
        codigo: row.codigo,
        bodega: bodegaLabel,
        talla: row.talla,
      });
    } else if (estado === 'BAJO') {
      alertas.push({
        tipo: 'stock_bajo',
        severidad: 'advertencia',
        titulo: `${row.nombre}${row.talla ? ` (${row.talla})` : ''}`,
        detalle: `${disponible} disp. · mín. ${row.stockMinimo}`,
        itemId: row.id,
        codigo: row.codigo,
        bodega: bodegaLabel,
        talla: row.talla,
      });
    }
  }

  return agruparAlertasStock(alertas).sort((a, b) => {
    const peso = { critico: 0, advertencia: 1, info: 2 };
    return peso[a.severidad] - peso[b.severidad] || a.titulo.localeCompare(b.titulo, 'es');
  });
}

export type CeldaMatrizEppDto = {
  itemId: number;
  codigo: string;
  cantidad: number;
  cantidadDisponible: number;
  cantidadAsignada: number;
  estadoStock: EstadoStock;
  asignaciones: Array<{ id: string; usuarioRut: string; usuarioNombre: string }>;
};

export type FilaMatrizEppDto = {
  tipoEpp: string;
  tipoEppEtiqueta: string;
  sistemaTalla: SistemaTalla;
  tallas: string[];
  celdas: Record<string, CeldaMatrizEppDto | null>;
  totalCantidad: number;
  totalDisponible: number;
  totalAsignado: number;
};

export async function listarMatrizEpp(filtros: {
  bodega?: string;
  q?: string;
  voluntario?: string;
}): Promise<FilaMatrizEppDto[]> {
  const where: Prisma.InventarioItemWhereInput = {
    activo: 1,
    OR: [{ esEppAsignable: 1 }, { tipoEpp: { not: null } }],
  };
  if (filtros.bodega && filtros.bodega !== 'TODAS') {
    where.bodega = { codigo: filtros.bodega };
  }
  if (filtros.q?.trim()) {
    const q = filtros.q.trim();
    where.AND = [
      {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { codigo: { contains: q, mode: 'insensitive' } },
          { talla: { contains: q, mode: 'insensitive' } },
          { tipoEpp: { contains: q, mode: 'insensitive' } },
        ],
      },
    ];
  }
  if (filtros.voluntario?.trim()) {
    const v = filtros.voluntario.trim();
    where.asignaciones = {
      some: {
        OR: [
          { usuarioRut: { contains: v, mode: 'insensitive' } },
          { usuario: { nombres: { contains: v, mode: 'insensitive' } } },
          { usuario: { apellidoPaterno: { contains: v, mode: 'insensitive' } } },
          { usuario: { apellidoMaterno: { contains: v, mode: 'insensitive' } } },
        ],
      },
    };
  }

  const rows = await prisma.inventarioItem.findMany({
    where,
    include: includeItem,
    orderBy: [{ tipoEpp: 'asc' }, { talla: 'asc' }, { nombre: 'asc' }],
  });

  const porTipo = new Map<string, InventarioItemDto[]>();
  for (const row of rows) {
    const dto = mapItem(row);
    const tipo = dto.tipoEpp ?? inferirTipoEpp(dto.nombre, dto.categoria) ?? 'OTRO';
    const lista = porTipo.get(tipo) ?? [];
    lista.push(dto);
    porTipo.set(tipo, lista);
  }

  const filas: FilaMatrizEppDto[] = [];
  for (const [tipoEpp, items] of porTipo) {
    const sistema = items[0]?.sistemaTalla ?? inferirSistemaTalla(tipoEpp);
    const tallasOrden =
      sistema === 'BOTA' ? [...TALLAS_BOTA] : sistema === 'ROPA' ? [...TALLAS_ROPA] : [...new Set(items.map((i) => i.talla).filter(Boolean) as string[])];
    const celdas: Record<string, CeldaMatrizEppDto | null> = {};
    for (const t of tallasOrden) celdas[t] = null;

    let totalCantidad = 0;
    let totalDisponible = 0;
    let totalAsignado = 0;

    for (const item of items) {
      const key = item.talla?.trim() || '—';
      const prev = celdas[key];
      const asignaciones = item.asignaciones.map((a) => ({
        id: a.id,
        usuarioRut: a.usuarioRut,
        usuarioNombre: a.usuarioNombre,
      }));
      if (!prev) {
        celdas[key] = {
          itemId: item.id,
          codigo: item.codigo,
          cantidad: item.cantidad,
          cantidadDisponible: item.cantidadDisponible,
          cantidadAsignada: item.cantidadAsignada,
          estadoStock: item.estadoStock,
          asignaciones,
        };
      } else {
        prev.cantidad += item.cantidad;
        prev.cantidadDisponible += item.cantidadDisponible;
        prev.cantidadAsignada += item.cantidadAsignada;
        prev.asignaciones.push(...asignaciones);
        prev.estadoStock = calcularEstadoStock(prev.cantidadDisponible, item.stockMinimo, item.stockCritico);
      }
      totalCantidad += item.cantidad;
      totalDisponible += item.cantidadDisponible;
      totalAsignado += item.cantidadAsignada;
    }

    filas.push({
      tipoEpp,
      tipoEppEtiqueta: etiquetaTipoEpp(tipoEpp),
      sistemaTalla: sistema,
      tallas: tallasOrden.length ? tallasOrden : ['—'],
      celdas,
      totalCantidad,
      totalDisponible,
      totalAsignado,
    });
  }

  return filas.sort((a, b) => a.tipoEppEtiqueta.localeCompare(b.tipoEppEtiqueta, 'es'));
}

export type EppAsignadoUsuarioDto = {
  asignacionId: string;
  itemId: number;
  codigo: string;
  nombre: string;
  tipoEpp: string | null;
  tipoEppEtiqueta: string;
  talla: string | null;
  categoria: string | null;
  bodegaNombre: string;
  cantidad: number;
  asignadoEn?: string;
};

export async function listarEppPorUsuario(usuarioRut: string): Promise<EppAsignadoUsuarioDto[]> {
  const rut = usuarioRut.trim();
  if (!rut) return [];

  const rows = await prisma.asignacionInventarioEpp.findMany({
    where: { usuarioRut: rut },
    include: {
      inventarioItem: { include: { bodega: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((r) => {
    const item = r.inventarioItem;
    const tipoEpp = item.tipoEpp ?? inferirTipoEpp(item.nombre, item.categoria);
    return {
      asignacionId: r.id,
      itemId: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      tipoEpp,
      tipoEppEtiqueta: etiquetaTipoEpp(tipoEpp),
      talla: item.talla,
      categoria: item.categoria,
      bodegaNombre: item.bodega?.nombre ?? '—',
      cantidad: r.cantidad,
      asignadoEn: r.createdAt?.toISOString(),
    };
  });
}

export async function buscarStockBodegaPorNombres(
  nombres: string[],
): Promise<Record<string, { disponible: number; bodega: string; itemId: number | null }>> {
  const resultado: Record<string, { disponible: number; bodega: string; itemId: number | null }> = {};
  const unicos = [...new Set(nombres.map((n) => n.trim()).filter(Boolean))];
  if (!unicos.length) return resultado;

  const items = await prisma.inventarioItem.findMany({
    where: { activo: 1 },
    include: { bodega: true, asignaciones: { select: { cantidad: true } } },
  });

  for (const nombre of unicos) {
    const norm = nombre.toLowerCase();
    const match =
      items.find((i) => i.nombre.toLowerCase() === norm) ??
      items.find((i) => i.nombre.toLowerCase().includes(norm) || norm.includes(i.nombre.toLowerCase()));
    if (!match) {
      resultado[nombre] = { disponible: 0, bodega: '—', itemId: null };
      continue;
    }
    const asignado = match.asignaciones.reduce((a, x) => a + x.cantidad, 0);
    resultado[nombre] = {
      disponible: Math.max(0, match.cantidad - asignado),
      bodega: match.bodega?.nombre ?? match.bodega?.codigo ?? '—',
      itemId: match.id,
    };
  }
  return resultado;
}

function limpiarTextoImport(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export type ResultadoImportacionInventario = {
  insertados: number;
  omitidos: number;
  errores: string[];
};

/** Importa planilla Excel (hoja PRIMERA o primera hoja). Columnas: nombre, cantidad, marca, modelo, estado, valor, obs, tipo */
export async function importarDesdeExcelBuffer(
  buffer: Buffer,
  opts?: { permitirDuplicados?: boolean },
): Promise<ResultadoImportacionInventario> {
  const existentes = await prisma.inventarioItem.count();
  if (existentes > 0 && !opts?.permitirDuplicados) {
    throw new AppError(
      `Ya hay ${existentes} ítems en inventario. Marca permitirDuplicados o vacía la tabla antes de importar.`,
      409,
    );
  }

  const bodegas = await prisma.catalogoBodega.findMany({ where: { activo: 1 } });
  const bodegaPorCodigo = new Map(bodegas.map((b) => [b.codigo, b.id]));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet('PRIMERA') ?? wb.worksheets[0];
  if (!ws) throw new AppError('Hoja Excel no encontrada', 400);

  let insertados = 0;
  let omitidos = 0;
  const errores: string[] = [];
  const contadorTallaPorTipo = new Map<string, number>();

  function siguienteTalla(tipoEpp: string | null, sistema: ReturnType<typeof inferirSistemaTalla>): string | null {
    if (!tipoEpp || !sistema) return null;
    const pool =
      sistema === 'BOTA' ? Array.from({ length: 12 }, (_, i) => String(35 + i)) : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const idx = contadorTallaPorTipo.get(tipoEpp) ?? 0;
    contadorTallaPorTipo.set(tipoEpp, idx + 1);
    return pool[idx % pool.length] ?? null;
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const nombre = limpiarTextoImport(row.getCell(1).value);
    if (!nombre) {
      omitidos += 1;
      continue;
    }

    try {
      const cantidadRaw = Number(row.getCell(2).value ?? 0);
      const cantidad = Math.max(0, Math.trunc(cantidadRaw));
      const marca = limpiarTextoImport(row.getCell(3).value) || null;
      const modelo = limpiarTextoImport(row.getCell(4).value) || null;
      const estadoFisico = limpiarTextoImport(row.getCell(5).value) || null;
      const valorRaw = Number(row.getCell(6).value ?? 0);
      const valor = Number.isFinite(valorRaw) && valorRaw > 0 ? valorRaw : null;
      const observaciones = limpiarTextoImport(row.getCell(7).value) || null;
      const tipo = limpiarTextoImport(row.getCell(8).value) || 'OTRO';

      const categoria = inferCategoriaPlanilla(nombre, tipo);
      const bodegaCodigo = inferBodegaCodigoPlanilla(nombre, tipo, categoria);
      const bodegaId = bodegaPorCodigo.get(bodegaCodigo);
      if (!bodegaId) throw new Error(`Bodega no encontrada: ${bodegaCodigo}`);

      const min = stockMinimoPlanilla(cantidad);
      const crit = stockCriticoPlanilla(min);
      const codigo = await siguienteCodigoInventario();

      const epp = esEppAsignablePlanilla(nombre, categoria, tipo);
      const tipoEpp = epp ? inferirTipoEpp(nombre, categoria) : null;
      const sistemaTalla = inferirSistemaTalla(tipoEpp);
      const talla =
        extraerTallaDeNombre(nombre, sistemaTalla) ?? (epp ? siguienteTalla(tipoEpp, sistemaTalla) : null);

      await prisma.inventarioItem.create({
        data: {
          codigo,
          nombre: nombre.slice(0, 200),
          categoria,
          tipoInventario: tipo.slice(0, 80),
          tipoEpp,
          talla,
          sistemaTalla,
          bodegaId,
          marca: marca?.slice(0, 100) ?? null,
          modelo: modelo?.slice(0, 100) ?? null,
          estadoFisico: estadoFisico?.slice(0, 50) ?? null,
          valor,
          observaciones,
          unidad: 'unidades',
          cantidad,
          stockMinimo: min,
          stockCritico: crit,
          esEppAsignable: epp,
          activo: 1,
        },
      });
      insertados += 1;
    } catch (e) {
      errores.push(`Fila ${r} (${nombre}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { insertados, omitidos, errores };
}
