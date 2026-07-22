import { randomUUID } from 'crypto';
import prisma from '../../../prisma';

export type ResumenInventarioDto = {
  totalMateriales: number;
  materialesBajoMinimo: number;
  totalUnidadesCarro: number;
  carrosConInventario: number;
  ultimosMovimientos: MovimientoBodegaDto[];
};

export type StockBodegaDto = {
  materialId: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidad: string | null;
  cantidad: number;
  stockMinimo: number;
  bajoMinimo: boolean;
};

export type MovimientoBodegaDto = {
  id: string;
  materialId: number;
  materialNombre: string;
  tipo: string;
  cantidad: number;
  cantidadAntes: number;
  cantidadDespues: number;
  motivo: string | null;
  usuarioNombre: string | null;
  createdAt: string;
};

export type InventarioCarroDto = {
  carroId: string;
  nomenclatura: string;
  nombre: string;
  totalItems: number;
  materiales: Array<{
    materialId: number;
    codigo: string;
    nombre: string;
    cantidadObjetivo: number;
    ubicacion: string | null;
  }>;
};

export async function obtenerResumen(): Promise<ResumenInventarioDto> {
  const [materiales, carros, carrosInv, movimientos, stocksBodega] = await Promise.all([
    prisma.catalogoMaterial.count({ where: { activo: 1 } }),
    prisma.carro.count(),
    prisma.materialPorCarro.groupBy({
      by: ['carroId'],
      where: { activo: 1 },
    }),
    listarMovimientos({ limit: 8 }).catch(() => [] as MovimientoBodegaDto[]),
    prisma.stockBodega.findMany({
      where: { stockMinimo: { gt: 0 } },
      select: { cantidad: true, stockMinimo: true },
    }).catch(() => [] as Array<{ cantidad: number; stockMinimo: number }>),
  ]);

  const materialesBajoMinimo = stocksBodega.filter((s) => s.cantidad < s.stockMinimo).length;

  return {
    totalMateriales: materiales,
    materialesBajoMinimo,
    totalUnidadesCarro: carros,
    carrosConInventario: carrosInv.length,
    ultimosMovimientos: movimientos,
  };
}

export async function listarStockBodega(): Promise<StockBodegaDto[]> {
  const rows = await prisma.catalogoMaterial.findMany({
    where: { activo: 1 },
    include: { stockBodega: true },
    orderBy: { nombre: 'asc' },
  });

  return rows.map((m) => {
    const cantidad = m.stockBodega?.cantidad ?? 0;
    const stockMinimo = m.stockBodega?.stockMinimo ?? 0;
    return {
      materialId: m.id,
      codigo: m.codigo,
      nombre: m.nombre,
      categoria: m.categoria,
      unidad: m.unidad,
      cantidad,
      stockMinimo,
      bajoMinimo: stockMinimo > 0 && cantidad < stockMinimo,
    };
  });
}

export async function listarInventarioCarros(): Promise<InventarioCarroDto[]> {
  const carros = await prisma.carro.findMany({
    include: {
      materiales: {
        where: { activo: 1 },
        include: { material: { select: { id: true, codigo: true, nombre: true } } },
      },
    },
    orderBy: { nomenclatura: 'asc' },
  });

  return carros.map((c) => ({
    carroId: c.id,
    nomenclatura: c.nomenclatura,
    nombre: c.nombre,
    totalItems: c.materiales.length,
    materiales: c.materiales.map((m) => ({
      materialId: m.materialId,
      codigo: m.material.codigo,
      nombre: m.material.nombre,
      cantidadObjetivo: m.cantidadObjetivo,
      ubicacion: m.ubicacion,
    })),
  }));
}

export async function listarMovimientos(opts?: { limit?: number; materialId?: number }): Promise<MovimientoBodegaDto[]> {
  const rows = await prisma.movimientoBodega.findMany({
    ...(opts?.materialId ? { where: { materialId: opts.materialId } } : {}),
    include: {
      material: { select: { nombre: true } },
      usuario: { select: { nombres: true, apellidoPaterno: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
  });

  return rows.map((r) => ({
    id: r.id,
    materialId: r.materialId,
    materialNombre: r.material.nombre,
    tipo: r.tipo,
    cantidad: r.cantidad,
    cantidadAntes: r.cantidadAntes,
    cantidadDespues: r.cantidadDespues,
    motivo: r.motivo,
    usuarioNombre: r.usuario
      ? `${r.usuario.nombres} ${r.usuario.apellidoPaterno}`.trim()
      : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function registrarMovimientoBodega(opts: {
  materialId: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  motivo?: string | null;
  usuarioRut?: string | null;
}): Promise<{ stock: StockBodegaDto; movimiento: MovimientoBodegaDto }> {
  const materialId = Number(opts.materialId);
  const tipo = opts.tipo;
  const cantidad = Math.abs(Math.trunc(Number(opts.cantidad) || 0));

  if (!materialId || !cantidad) throw new Error('Material y cantidad son obligatorios');
  if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo)) throw new Error('Tipo de movimiento inválido');

  const material = await prisma.catalogoMaterial.findUnique({
    where: { id: materialId },
    include: { stockBodega: true },
  });
  if (!material || material.activo !== 1) throw new Error('Material no encontrado o inactivo');

  const stockActual = material.stockBodega?.cantidad ?? 0;
  const stockMinimo = material.stockBodega?.stockMinimo ?? 0;

  let cantidadDespues = stockActual;
  if (tipo === 'ENTRADA') cantidadDespues = stockActual + cantidad;
  else if (tipo === 'SALIDA') {
    if (stockActual < cantidad) throw new Error('Stock insuficiente en bodega');
    cantidadDespues = stockActual - cantidad;
  } else {
    cantidadDespues = cantidad;
  }

  const movimientoId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.stockBodega.upsert({
      where: { materialId },
      create: { materialId, cantidad: cantidadDespues, stockMinimo },
      update: { cantidad: cantidadDespues },
    });

    await tx.movimientoBodega.create({
      data: {
        id: movimientoId,
        materialId,
        tipo,
        cantidad: tipo === 'AJUSTE' ? cantidadDespues : cantidad,
        cantidadAntes: stockActual,
        cantidadDespues,
        motivo: opts.motivo ? String(opts.motivo).trim().slice(0, 255) : null,
        usuarioRut: opts.usuarioRut ?? null,
      },
    });
  });

  const stock: StockBodegaDto = {
    materialId,
    codigo: material.codigo,
    nombre: material.nombre,
    categoria: material.categoria,
    unidad: material.unidad,
    cantidad: cantidadDespues,
    stockMinimo,
    bajoMinimo: stockMinimo > 0 && cantidadDespues < stockMinimo,
  };

  const movimientos = await listarMovimientos({ limit: 1, materialId });
  return { stock, movimiento: movimientos[0]! };
}

export async function listarMaterialesBajoMinimo(): Promise<StockBodegaDto[]> {
  const todos = await listarStockBodega();
  return todos.filter((s) => s.bajoMinimo);
}
