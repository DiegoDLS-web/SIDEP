"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerResumen = obtenerResumen;
exports.listarStockBodega = listarStockBodega;
exports.listarInventarioCarros = listarInventarioCarros;
exports.listarMovimientos = listarMovimientos;
exports.registrarMovimientoBodega = registrarMovimientoBodega;
exports.listarMaterialesBajoMinimo = listarMaterialesBajoMinimo;
const crypto_1 = require("crypto");
const prisma_1 = __importDefault(require("../../../prisma"));
async function obtenerResumen() {
    const [materiales, carros, carrosInv, movimientos, stocksBodega] = await Promise.all([
        prisma_1.default.catalogoMaterial.count({ where: { activo: 1 } }),
        prisma_1.default.carro.count(),
        prisma_1.default.materialPorCarro.groupBy({
            by: ['carroId'],
            where: { activo: 1 },
        }),
        listarMovimientos({ limit: 8 }).catch(() => []),
        prisma_1.default.stockBodega.findMany({
            where: { stockMinimo: { gt: 0 } },
            select: { cantidad: true, stockMinimo: true },
        }).catch(() => []),
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
async function listarStockBodega() {
    const rows = await prisma_1.default.catalogoMaterial.findMany({
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
async function listarInventarioCarros() {
    const carros = await prisma_1.default.carro.findMany({
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
async function listarMovimientos(opts) {
    const rows = await prisma_1.default.movimientoBodega.findMany({
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
async function registrarMovimientoBodega(opts) {
    const materialId = Number(opts.materialId);
    const tipo = opts.tipo;
    const cantidad = Math.abs(Math.trunc(Number(opts.cantidad) || 0));
    if (!materialId || !cantidad)
        throw new Error('Material y cantidad son obligatorios');
    if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo))
        throw new Error('Tipo de movimiento inválido');
    const material = await prisma_1.default.catalogoMaterial.findUnique({
        where: { id: materialId },
        include: { stockBodega: true },
    });
    if (!material || material.activo !== 1)
        throw new Error('Material no encontrado o inactivo');
    const stockActual = material.stockBodega?.cantidad ?? 0;
    const stockMinimo = material.stockBodega?.stockMinimo ?? 0;
    let cantidadDespues = stockActual;
    if (tipo === 'ENTRADA')
        cantidadDespues = stockActual + cantidad;
    else if (tipo === 'SALIDA') {
        if (stockActual < cantidad)
            throw new Error('Stock insuficiente en bodega');
        cantidadDespues = stockActual - cantidad;
    }
    else {
        cantidadDespues = cantidad;
    }
    const movimientoId = (0, crypto_1.randomUUID)();
    await prisma_1.default.$transaction(async (tx) => {
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
    const stock = {
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
    return { stock, movimiento: movimientos[0] };
}
async function listarMaterialesBajoMinimo() {
    const todos = await listarStockBodega();
    return todos.filter((s) => s.bajoMinimo);
}
