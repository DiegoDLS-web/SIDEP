"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarAsistencias = listarAsistencias;
exports.resumenAsistencia = resumenAsistencia;
exports.registrarAsistencia = registrarAsistencia;
exports.actualizarAsistencia = actualizarAsistencia;
exports.eliminarAsistencia = eliminarAsistencia;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../../prisma"));
const usuario_map_util_1 = require("../utils/usuario-map.util");
const INCLUDE_ASISTENCIA = {
    usuario: { include: { rol: true, cargo: true } },
    registradoPor: { include: { rol: true, cargo: true } },
};
function mapAsistencia(a) {
    return {
        id: a.id,
        fecha: a.fecha.toISOString().slice(0, 10),
        usuarioRut: a.usuarioRut,
        grupoGuardia: a.grupoGuardia,
        presente: a.presente === 1,
        horaEntrada: a.horaEntrada,
        horaSalida: a.horaSalida,
        observaciones: a.observaciones,
        usuario: (0, usuario_map_util_1.mapUsuarioBasico)(a.usuario),
        registradoPor: (0, usuario_map_util_1.mapUsuarioBasico)(a.registradoPor),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
    };
}
function parseFechaLocal(key) {
    return new Date(`${key}T12:00:00.000Z`);
}
async function listarAsistencias(filtros) {
    const page = filtros.page ?? 1;
    const pageSize = filtros.pageSize ?? 50;
    const where = {};
    if (filtros.grupo)
        where.grupoGuardia = filtros.grupo;
    if (filtros.presente !== undefined)
        where.presente = filtros.presente ? 1 : 0;
    if (filtros.fecha) {
        where.fecha = parseFechaLocal(filtros.fecha);
    }
    else if (filtros.desde || filtros.hasta) {
        where.fecha = {};
        if (filtros.desde)
            where.fecha.gte = parseFechaLocal(filtros.desde);
        if (filtros.hasta)
            where.fecha.lte = parseFechaLocal(filtros.hasta);
    }
    const [total, rows] = await Promise.all([
        prisma_1.default.asistenciaCuartelero.count({ where }),
        prisma_1.default.asistenciaCuartelero.findMany({
            where,
            include: INCLUDE_ASISTENCIA,
            orderBy: [{ fecha: 'desc' }, { usuario: { apellidoPaterno: 'asc' } }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    return {
        items: rows.map(mapAsistencia),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}
async function resumenAsistencia(fechaKey) {
    const fecha = parseFechaLocal(fechaKey);
    const rows = await prisma_1.default.asistenciaCuartelero.findMany({
        where: { fecha },
        include: INCLUDE_ASISTENCIA,
    });
    const presentes = rows.filter((r) => r.presente === 1).length;
    return {
        fecha: fechaKey,
        total: rows.length,
        presentes,
        ausentes: rows.length - presentes,
        items: rows.map(mapAsistencia),
    };
}
async function registrarAsistencia(registradoPorRut, data) {
    const row = await prisma_1.default.asistenciaCuartelero.upsert({
        where: {
            fecha_usuarioRut: {
                fecha: parseFechaLocal(data.fecha),
                usuarioRut: data.usuarioRut,
            },
        },
        create: {
            id: crypto_1.default.randomUUID(),
            fecha: parseFechaLocal(data.fecha),
            usuarioRut: data.usuarioRut,
            grupoGuardia: data.grupoGuardia || null,
            presente: data.presente === false ? 0 : 1,
            horaEntrada: data.horaEntrada || null,
            horaSalida: data.horaSalida || null,
            observaciones: data.observaciones?.trim() || null,
            registradoPorRut,
        },
        update: {
            grupoGuardia: data.grupoGuardia || null,
            presente: data.presente === false ? 0 : 1,
            horaEntrada: data.horaEntrada || null,
            horaSalida: data.horaSalida || null,
            observaciones: data.observaciones?.trim() || null,
            registradoPorRut,
        },
        include: INCLUDE_ASISTENCIA,
    });
    return mapAsistencia(row);
}
async function actualizarAsistencia(id, registradoPorRut, data) {
    const existente = await prisma_1.default.asistenciaCuartelero.findUnique({ where: { id } });
    if (!existente)
        throw new Error('Registro de asistencia no encontrado');
    const row = await prisma_1.default.asistenciaCuartelero.update({
        where: { id },
        data: {
            ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
            ...(data.presente !== undefined ? { presente: data.presente ? 1 : 0 } : {}),
            ...(data.horaEntrada !== undefined ? { horaEntrada: data.horaEntrada || null } : {}),
            ...(data.horaSalida !== undefined ? { horaSalida: data.horaSalida || null } : {}),
            ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
            registradoPorRut,
        },
        include: INCLUDE_ASISTENCIA,
    });
    return mapAsistencia(row);
}
async function eliminarAsistencia(id) {
    await prisma_1.default.asistenciaCuartelero.delete({ where: { id } });
    return true;
}
