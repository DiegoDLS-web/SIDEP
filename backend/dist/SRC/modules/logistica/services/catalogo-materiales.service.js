"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarMateriales = listarMateriales;
exports.crearMaterial = crearMaterial;
exports.actualizarMaterial = actualizarMaterial;
exports.cambiarActivoMaterial = cambiarActivoMaterial;
const prisma_1 = __importDefault(require("../../../prisma"));
function slugCodigo(texto) {
    return texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50) || 'MATERIAL';
}
async function fetchMateriales(incluirInactivos) {
    return prisma_1.default.catalogoMaterial.findMany({
        where: incluirInactivos ? {} : { activo: 1 },
        include: { stockBodega: true },
        orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    });
}
function mapMaterial(row) {
    return {
        id: row.id,
        codigo: row.codigo,
        nombre: row.nombre,
        categoria: row.categoria,
        unidad: row.unidad,
        activo: row.activo === 1,
        stockBodega: row.stockBodega?.cantidad ?? 0,
        stockMinimo: row.stockBodega?.stockMinimo ?? 0,
    };
}
async function listarMateriales(opts) {
    const rows = await fetchMateriales(opts?.incluirInactivos);
    return rows.map(mapMaterial);
}
async function crearMaterial(datos) {
    const nombre = String(datos.nombre ?? '').trim();
    if (!nombre)
        throw new Error('El nombre es obligatorio');
    let codigo = String(datos.codigo ?? '').trim();
    if (!codigo)
        codigo = slugCodigo(nombre);
    const existente = await prisma_1.default.catalogoMaterial.findUnique({ where: { codigo } });
    if (existente)
        throw new Error('Ya existe un material con ese código');
    const row = await prisma_1.default.catalogoMaterial.create({
        data: {
            codigo,
            nombre,
            categoria: datos.categoria ? String(datos.categoria).trim() : null,
            unidad: datos.unidad ? String(datos.unidad).trim() : 'un',
            activo: 1,
            stockBodega: {
                create: {
                    cantidad: 0,
                    stockMinimo: Math.max(0, Number(datos.stockMinimo) || 0),
                },
            },
        },
        include: { stockBodega: true },
    });
    return mapMaterial(row);
}
async function actualizarMaterial(id, datos) {
    const actual = await prisma_1.default.catalogoMaterial.findUnique({
        where: { id },
        include: { stockBodega: true },
    });
    if (!actual)
        throw new Error('Material no encontrado');
    if (datos.codigo && datos.codigo.trim() !== actual.codigo) {
        const dup = await prisma_1.default.catalogoMaterial.findUnique({ where: { codigo: datos.codigo.trim() } });
        if (dup)
            throw new Error('Ya existe un material con ese código');
    }
    const stockMinimo = datos.stockMinimo !== undefined ? Math.max(0, Number(datos.stockMinimo) || 0) : undefined;
    const data = {};
    if (datos.codigo?.trim())
        data.codigo = datos.codigo.trim();
    if (datos.nombre?.trim())
        data.nombre = datos.nombre.trim();
    if (datos.categoria !== undefined) {
        data.categoria = datos.categoria ? String(datos.categoria).trim() : null;
    }
    if (datos.unidad !== undefined) {
        data.unidad = datos.unidad ? String(datos.unidad).trim() : null;
    }
    if (stockMinimo !== undefined) {
        data.stockBodega = {
            upsert: {
                create: { cantidad: actual.stockBodega?.cantidad ?? 0, stockMinimo },
                update: { stockMinimo },
            },
        };
    }
    const row = await prisma_1.default.catalogoMaterial.update({
        where: { id },
        data,
        include: { stockBodega: true },
    });
    return mapMaterial(row);
}
async function cambiarActivoMaterial(id, activo) {
    const row = await prisma_1.default.catalogoMaterial.update({
        where: { id },
        data: { activo: activo ? 1 : 0 },
        include: { stockBodega: true },
    });
    return mapMaterial(row);
}
