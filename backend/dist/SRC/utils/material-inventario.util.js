"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInventarioLookup = buildInventarioLookup;
exports.ubicacionesDesdeInventario = ubicacionesDesdeInventario;
exports.aplicarInventarioAlPayload = aplicarInventarioAlPayload;
exports.cargarFilasInventarioCarro = cargarFilasInventarioCarro;
exports.cargarLookupInventarioCarro = cargarLookupInventarioCarro;
exports.cargarLookupInventarioPorCarros = cargarLookupInventarioPorCarros;
exports.sincronizarInventarioDesdeUbicaciones = sincronizarInventarioDesdeUbicaciones;
const prisma_1 = __importDefault(require("../prisma"));
const crypto_1 = require("crypto");
const AppError_1 = require("./errors/AppError");
function normTexto(value) {
    return value.trim().toLowerCase();
}
function normUbicacion(value) {
    const t = (value ?? '').trim();
    return t.length > 0 ? t : 'Sin ubicación';
}
function claveMaterial(ubicacion, materialId, nombre) {
    const ub = normUbicacion(ubicacion);
    if (materialId != null && Number.isFinite(materialId)) {
        return `${ub}::id:${materialId}`;
    }
    return `${ub}::nom:${normTexto(nombre ?? '')}`;
}
/** Índice de inventario por ubicación + material (id o nombre). */
function buildInventarioLookup(filas) {
    const map = new Map();
    for (const fila of filas) {
        const ubicacion = normUbicacion(fila.ubicacion);
        const entry = {
            materialId: fila.materialId,
            inventarioId: fila.id,
            cantidadObjetivo: Math.max(0, Number(fila.cantidadObjetivo ?? 0)),
            nombre: fila.material.nombre,
        };
        map.set(claveMaterial(ubicacion, fila.materialId), entry);
        map.set(claveMaterial(ubicacion, null, fila.material.nombre), entry);
    }
    return map;
}
/** Agrupa filas de material_por_carro en ubicaciones para el checklist. */
function ubicacionesDesdeInventario(filas) {
    const porUbicacion = new Map();
    for (const fila of filas) {
        const nombreUbicacion = normUbicacion(fila.ubicacion);
        const lista = porUbicacion.get(nombreUbicacion) ?? [];
        lista.push({
            id: fila.id,
            inventarioId: fila.id,
            materialId: fila.materialId,
            nombre: fila.material.nombre,
            cantidadRequerida: Math.max(0, Number(fila.cantidadObjetivo ?? 0)),
            cantidadActual: 0,
        });
        porUbicacion.set(nombreUbicacion, lista);
    }
    return [...porUbicacion.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([nombre, materiales]) => ({
        nombre,
        materiales: materiales.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }));
}
function parsePayload(data) {
    if (data == null)
        return null;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : null;
        }
        catch {
            return null;
        }
    }
    if (typeof data === 'object' && !Array.isArray(data)) {
        return data;
    }
    return null;
}
function aplicarInventarioAlPayload(data, inventario) {
    const obj = parsePayload(data);
    if (!obj || !Array.isArray(obj['ubicaciones']) || inventario.size === 0) {
        return obj;
    }
    const ubicaciones = obj['ubicaciones'].map((ubicacion) => {
        const nombreUb = String(ubicacion['nombre'] ?? '');
        const materiales = Array.isArray(ubicacion['materiales'])
            ? ubicacion['materiales'].map((mat) => {
                const materialId = mat['materialId'] != null ? Number(mat['materialId']) : undefined;
                const nombre = String(mat['nombre'] ?? '');
                const clave = materialId != null && Number.isFinite(materialId)
                    ? claveMaterial(nombreUb, materialId)
                    : claveMaterial(nombreUb, null, nombre);
                const ref = inventario.get(clave);
                if (!ref) {
                    return { ...mat };
                }
                return {
                    ...mat,
                    inventarioId: ref.inventarioId,
                    materialId: ref.materialId,
                    nombre: ref.nombre || nombre,
                    cantidadRequerida: ref.cantidadObjetivo,
                };
            })
            : [];
        return { ...ubicacion, materiales };
    });
    return { ...obj, ubicaciones, inventarioAplicado: true };
}
async function cargarFilasInventarioCarro(carroId) {
    return prisma_1.default.materialPorCarro.findMany({
        where: { carroId, activo: 1 },
        include: { material: { select: { nombre: true } } },
        orderBy: [{ ubicacion: 'asc' }, { material: { nombre: 'asc' } }],
    });
}
async function cargarLookupInventarioCarro(carroId) {
    const filas = await cargarFilasInventarioCarro(carroId);
    return buildInventarioLookup(filas);
}
async function cargarLookupInventarioPorCarros(carroIds) {
    const mapa = new Map();
    if (carroIds.length === 0)
        return mapa;
    const filas = await prisma_1.default.materialPorCarro.findMany({
        where: { carroId: { in: carroIds }, activo: 1 },
        include: { material: { select: { nombre: true } } },
    });
    const porCarro = new Map();
    for (const fila of filas) {
        const lista = porCarro.get(fila.carroId) ?? [];
        lista.push(fila);
        porCarro.set(fila.carroId, lista);
    }
    for (const carroId of carroIds) {
        mapa.set(carroId, buildInventarioLookup(porCarro.get(carroId) ?? []));
    }
    return mapa;
}
function slugMaterialCodigo(nombre) {
    const base = nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 48);
    return base || `MAT_${(0, crypto_1.randomUUID)().slice(0, 8).toUpperCase()}`;
}
async function resolverMaterialCatalogo(nombre) {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
        throw new AppError_1.AppError('El material debe tener nombre.', 400);
    }
    const existente = await prisma_1.default.catalogoMaterial.findFirst({
        where: {
            OR: [
                { nombre: { equals: nombreTrim, mode: 'insensitive' } },
                { codigo: slugMaterialCodigo(nombreTrim) },
            ],
        },
    });
    if (existente)
        return existente.id;
    const codigoBase = slugMaterialCodigo(nombreTrim);
    let codigo = codigoBase;
    let sufijo = 1;
    while (await prisma_1.default.catalogoMaterial.findUnique({ where: { codigo } })) {
        codigo = `${codigoBase.slice(0, 44)}_${sufijo}`;
        sufijo += 1;
    }
    const creado = await prisma_1.default.catalogoMaterial.create({
        data: {
            codigo,
            nombre: nombreTrim,
            categoria: 'Checklist unidad',
            activo: 1,
        },
    });
    return creado.id;
}
/** Crea o actualiza filas en material_por_carro desde ubicaciones del checklist. */
async function sincronizarInventarioDesdeUbicaciones(carroId, ubicaciones) {
    const carro = await prisma_1.default.carro.findUnique({ where: { id: carroId } });
    if (!carro)
        throw new AppError_1.AppError('Carro no encontrado', 404);
    let creados = 0;
    let actualizados = 0;
    let desactivados = 0;
    const clavesActivas = new Set();
    await prisma_1.default.$transaction(async (tx) => {
        for (const ubicacion of ubicaciones ?? []) {
            const nombreUbicacion = String(ubicacion.nombre ?? '').trim() || 'Sin ubicación';
            for (const mat of ubicacion.materiales ?? []) {
                const nombre = String(mat.nombre ?? '').trim();
                if (!nombre)
                    continue;
                const cantidadObjetivo = Math.max(0, Math.round(Number(mat.cantidadRequerida ?? 0)));
                const materialId = mat.materialId != null && Number.isFinite(Number(mat.materialId))
                    ? Number(mat.materialId)
                    : await resolverMaterialCatalogo(nombre);
                clavesActivas.add(`${materialId}::${nombreUbicacion}`);
                const existente = await tx.materialPorCarro.findFirst({
                    where: { carroId, materialId, ubicacion: nombreUbicacion },
                });
                if (existente) {
                    await tx.materialPorCarro.update({
                        where: { id: existente.id },
                        data: { cantidadObjetivo, activo: 1 },
                    });
                    actualizados += 1;
                }
                else {
                    await tx.materialPorCarro.create({
                        data: {
                            id: (0, crypto_1.randomUUID)(),
                            carroId,
                            materialId,
                            cantidadObjetivo,
                            ubicacion: nombreUbicacion,
                            activo: 1,
                        },
                    });
                    creados += 1;
                }
            }
        }
        const filasActivas = await tx.materialPorCarro.findMany({ where: { carroId, activo: 1 } });
        for (const fila of filasActivas) {
            const ub = String(fila.ubicacion ?? '').trim() || 'Sin ubicación';
            const clave = `${fila.materialId}::${ub}`;
            if (!clavesActivas.has(clave)) {
                await tx.materialPorCarro.update({
                    where: { id: fila.id },
                    data: { activo: 0 },
                });
                desactivados += 1;
            }
        }
    });
    return { creados, actualizados, desactivados };
}
