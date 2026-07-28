"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarNovedades = listarNovedades;
exports.crearNovedad = crearNovedad;
exports.actualizarNovedad = actualizarNovedad;
exports.eliminarNovedad = eliminarNovedad;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../../prisma"));
const usuario_map_util_1 = require("../utils/usuario-map.util");
const INCLUDE_NOVEDAD = {
    autor: { include: { rol: true, cargo: true } },
};
function mapNovedad(n) {
    return {
        id: n.id,
        fechaHora: n.fechaHora.toISOString(),
        categoria: n.categoria,
        titulo: n.titulo,
        descripcion: n.descripcion,
        grupoGuardia: n.grupoGuardia,
        importante: n.importante === 1,
        autorRut: n.autorRut,
        autor: (0, usuario_map_util_1.mapUsuarioBasico)(n.autor),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
    };
}
function parseFechaInicio(key) {
    return new Date(`${key}T00:00:00.000Z`);
}
function parseFechaFin(key) {
    return new Date(`${key}T23:59:59.999Z`);
}
async function listarNovedades(filtros) {
    const page = filtros.page ?? 1;
    const pageSize = filtros.pageSize ?? 20;
    const where = {};
    if (filtros.categoria)
        where.categoria = filtros.categoria;
    if (filtros.importante !== undefined)
        where.importante = filtros.importante ? 1 : 0;
    if (filtros.desde || filtros.hasta) {
        where.fechaHora = {};
        if (filtros.desde)
            where.fechaHora.gte = parseFechaInicio(filtros.desde);
        if (filtros.hasta)
            where.fechaHora.lte = parseFechaFin(filtros.hasta);
    }
    if (filtros.q?.trim()) {
        const q = filtros.q.trim();
        where.OR = [
            { titulo: { contains: q, mode: 'insensitive' } },
            { descripcion: { contains: q, mode: 'insensitive' } },
        ];
    }
    const [total, rows] = await Promise.all([
        prisma_1.default.libroNovedad.count({ where }),
        prisma_1.default.libroNovedad.findMany({
            where,
            include: INCLUDE_NOVEDAD,
            orderBy: { fechaHora: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    return {
        items: rows.map(mapNovedad),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}
async function crearNovedad(autorRut, data) {
    const row = await prisma_1.default.libroNovedad.create({
        data: {
            id: crypto_1.default.randomUUID(),
            fechaHora: new Date(data.fechaHora),
            categoria: data.categoria,
            titulo: data.titulo.trim(),
            descripcion: data.descripcion.trim(),
            grupoGuardia: data.grupoGuardia || null,
            importante: data.importante ? 1 : 0,
            autorRut,
        },
        include: INCLUDE_NOVEDAD,
    });
    return mapNovedad(row);
}
async function actualizarNovedad(id, autorRut, esOficialidad, data) {
    const existente = await prisma_1.default.libroNovedad.findUnique({ where: { id } });
    if (!existente)
        throw new Error('Novedad no encontrada');
    if (!esOficialidad && existente.autorRut !== autorRut) {
        throw new Error('Solo el autor u oficialidad pueden editar esta novedad');
    }
    const row = await prisma_1.default.libroNovedad.update({
        where: { id },
        data: {
            ...(data.fechaHora !== undefined ? { fechaHora: new Date(data.fechaHora) } : {}),
            ...(data.categoria ? { categoria: data.categoria } : {}),
            ...(data.titulo ? { titulo: data.titulo.trim() } : {}),
            ...(data.descripcion ? { descripcion: data.descripcion.trim() } : {}),
            ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
            ...(data.importante !== undefined ? { importante: data.importante ? 1 : 0 } : {}),
        },
        include: INCLUDE_NOVEDAD,
    });
    return mapNovedad(row);
}
async function eliminarNovedad(id, autorRut, esOficialidad) {
    const existente = await prisma_1.default.libroNovedad.findUnique({ where: { id } });
    if (!existente)
        throw new Error('Novedad no encontrada');
    if (!esOficialidad && existente.autorRut !== autorRut) {
        throw new Error('Solo el autor u oficialidad pueden eliminar esta novedad');
    }
    await prisma_1.default.libroNovedad.delete({ where: { id } });
    return true;
}
