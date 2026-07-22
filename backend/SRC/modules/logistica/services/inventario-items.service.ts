import { randomUUID } from 'crypto';
import prisma from '../../../prisma';

export type EstadoStock = 'NORMAL' | 'BAJO' | 'CRITICO';

export type InventarioItemDto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  tipoInventario: string | null;
  bodegaId: number;
  bodegaCodigo: string;
  bodegaNombre: string;
  marca: string | null;
  modelo: string | null;
  estadoFisico: string | null;
  valor: number | null;
  observaciones: string | null;
  unidad: string;
  cantidad: number;
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

export function calcularEstadoStock(cantidad: number, stockMinimo: number, stockCritico: number): EstadoStock {
  if (stockMinimo <= 0 && stockCritico <= 0) return 'NORMAL';
  if (stockCritico > 0 && cantidad <= stockCritico) return 'CRITICO';
  if (stockMinimo > 0 && cantidad < stockMinimo) return 'BAJO';
  return 'NORMAL';
}

function mapItem(row: {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  tipoInventario: string | null;
  bodegaId: number;
  marca: string | null;
  modelo: string | null;
  estadoFisico: string | null;
  valor: { toNumber?: () => number } | null;
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
}): InventarioItemDto {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    tipoInventario: row.tipoInventario,
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
    stockMinimo: row.stockMinimo,
    stockCritico: row.stockCritico,
    esEppAsignable: row.esEppAsignable === 1,
    estadoStock: calcularEstadoStock(row.cantidad, row.stockMinimo, row.stockCritico),
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
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventarioItem.findMany({
      where: { activo: 1 },
      select: { cantidad: true, stockMinimo: true, stockCritico: true },
    }),
  ]);

  const metricas = calcularMetricas(allForMetrics);

  return {
    items: rows.map(mapItem),
    metricas,
    total,
    page,
    pageSize,
  };
}

function calcularMetricas(
  rows: Array<{ cantidad: number; stockMinimo: number; stockCritico: number }>,
): InventarioMetricasDto {
  let stockNormal = 0;
  let stockBajo = 0;
  let stockCritico = 0;
  for (const r of rows) {
    const e = calcularEstadoStock(r.cantidad, r.stockMinimo, r.stockCritico);
    if (e === 'CRITICO') stockCritico += 1;
    else if (e === 'BAJO') stockBajo += 1;
    else stockNormal += 1;
  }
  return { totalItems: rows.length, stockNormal, stockBajo, stockCritico };
}

export async function ajustarCantidadItem(
  id: number,
  delta: number,
  usuarioRut?: string | null,
): Promise<InventarioItemDto> {
  const item = await prisma.inventarioItem.findUnique({ where: { id }, include: includeItem });
  if (!item || item.activo !== 1) throw new Error('Ítem no encontrado');

  const cambio = Math.trunc(delta);
  if (!cambio) throw new Error('Cantidad inválida');

  const antes = item.cantidad;
  const despues = antes + cambio;
  if (despues < 0) throw new Error('Stock insuficiente');

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
  const item = await prisma.inventarioItem.findUnique({ where: { id: opts.inventarioItemId } });
  if (!item || item.activo !== 1) throw new Error('Ítem no encontrado');
  if (item.esEppAsignable !== 1) throw new Error('Este ítem no admite asignación a voluntarios');

  const usuario = await prisma.usuario.findUnique({ where: { rut: opts.usuarioRut, activo: 1 } });
  if (!usuario) throw new Error('Voluntario no encontrado o inactivo');

  const cantidad = Math.max(1, Math.trunc(opts.cantidad ?? 1));

  await prisma.asignacionInventarioEpp.create({
    data: {
      id: randomUUID(),
      inventarioItemId: opts.inventarioItemId,
      usuarioRut: opts.usuarioRut,
      cantidad,
      observaciones: opts.observaciones?.trim().slice(0, 255) ?? null,
    },
  });

  const actualizado = await prisma.inventarioItem.findUnique({
    where: { id: opts.inventarioItemId },
    include: includeItem,
  });
  return mapItem(actualizado!);
}

export async function quitarAsignacionEpp(asignacionId: string): Promise<InventarioItemDto> {
  const asignacion = await prisma.asignacionInventarioEpp.findUnique({ where: { id: asignacionId } });
  if (!asignacion) throw new Error('Asignación no encontrada');

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
  const where: Record<string, unknown> = { activo: 1 };
  if (filtros.bodega && filtros.bodega !== 'TODAS') where.bodega = { codigo: filtros.bodega };
  if (filtros.categoria && filtros.categoria !== 'TODAS') where.categoria = filtros.categoria;
  if (filtros.q?.trim()) {
    const q = filtros.q.trim();
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { codigo: { contains: q, mode: 'insensitive' } },
      { marca: { contains: q, mode: 'insensitive' } },
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
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  });
  return rows.map(mapItem);
}

export async function listarBodegas() {
  return prisma.catalogoBodega.findMany({ where: { activo: 1 }, orderBy: { nombre: 'asc' } });
}

export async function contarItems(): Promise<number> {
  return prisma.inventarioItem.count({ where: { activo: 1 } });
}
