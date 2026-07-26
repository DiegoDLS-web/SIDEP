import { randomUUID } from 'crypto';
import prisma from '../../../prisma';
import { AppError } from '../../../utils/errors/AppError';
import {
  etiquetaTipoEpp,
  extraerTallaDeNombre,
  inferirSistemaTalla,
  inferirTipoEpp,
  validarTalla,
  type SistemaTalla,
} from '../../../utils/epp-tallas.util';

export type EstadoStock = 'NORMAL' | 'BAJO' | 'CRITICO';

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

  const [total, rows, allForMetrics] = await Promise.all([
    prisma.inventarioItem.count({ where }),
    prisma.inventarioItem.findMany({
      where,
      include: includeItem,
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }, { talla: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventarioItem.findMany({
      where: { activo: 1 },
      select: {
        cantidad: true,
        stockMinimo: true,
        stockCritico: true,
        asignaciones: { select: { cantidad: true } },
      },
    }),
  ]);

  const metricas = calcularMetricas(
    allForMetrics.map((r) => ({
      cantidadDisponible: Math.max(
        0,
        r.cantidad - r.asignaciones.reduce((a, x) => a + x.cantidad, 0),
      ),
      stockMinimo: r.stockMinimo,
      stockCritico: r.stockCritico,
    })),
  );

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
  const data = await listarItems({ ...filtros, page: 1, pageSize: 5000 });
  return data.items;
}

export async function listarBodegas() {
  return prisma.catalogoBodega.findMany({ where: { activo: 1 }, orderBy: { nombre: 'asc' } });
}

export async function contarItems(): Promise<number> {
  return prisma.inventarioItem.count({ where: { activo: 1 } });
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
