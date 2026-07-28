"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarGuardias = listarGuardias;
exports.resumenGuardias = resumenGuardias;
exports.obtenerGuardia = obtenerGuardia;
exports.crearGuardia = crearGuardia;
exports.actualizarGuardia = actualizarGuardia;
exports.eliminarGuardia = eliminarGuardia;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../../prisma"));
const usuario_map_util_1 = require("../utils/usuario-map.util");
const INCLUDE_GUARDIA = {
    cuartelero: { include: { rol: true, cargo: true } },
    obac: { include: { rol: true, cargo: true } },
    registradoPor: { include: { rol: true, cargo: true } },
    miembros: { include: { usuario: { include: { rol: true, cargo: true } } } },
};
function mapGuardia(g) {
    return {
        id: g.id,
        fecha: g.fecha.toISOString().slice(0, 10),
        grupo: g.grupo,
        tipoTurno: g.tipoTurno,
        cuarteleroRut: g.cuarteleroRut,
        obacRut: g.obacRut,
        observaciones: g.observaciones,
        cuartelero: (0, usuario_map_util_1.mapUsuarioBasico)(g.cuartelero),
        obac: (0, usuario_map_util_1.mapUsuarioBasico)(g.obac),
        registradoPor: (0, usuario_map_util_1.mapUsuarioBasico)(g.registradoPor),
        miembros: (g.miembros ?? []).map((m) => ({
            id: m.id,
            usuarioRut: m.usuarioRut,
            rolEnGuardia: m.rolEnGuardia,
            usuario: (0, usuario_map_util_1.mapUsuarioBasico)(m.usuario),
        })),
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
    };
}
function parseFechaLocal(key) {
    return new Date(`${key}T12:00:00.000Z`);
}
async function listarGuardias(filtros) {
    const where = {};
    if (filtros.grupo)
        where.grupo = filtros.grupo;
    if (filtros.desde || filtros.hasta) {
        where.fecha = {};
        if (filtros.desde)
            where.fecha.gte = parseFechaLocal(filtros.desde);
        if (filtros.hasta)
            where.fecha.lte = parseFechaLocal(filtros.hasta);
    }
    const rows = await prisma_1.default.guardiaTurno.findMany({
        where,
        include: INCLUDE_GUARDIA,
        orderBy: [{ fecha: 'desc' }, { grupo: 'asc' }],
    });
    return rows.map(mapGuardia);
}
async function resumenGuardias(fechaKey) {
    const fecha = parseFechaLocal(fechaKey);
    const turnos = await prisma_1.default.guardiaTurno.findMany({
        where: { fecha },
        include: INCLUDE_GUARDIA,
        orderBy: { grupo: 'asc' },
    });
    return {
        fecha: fechaKey,
        turnos: turnos.map(mapGuardia),
        gruposCubiertos: turnos.length,
        totalMiembros: turnos.reduce((acc, t) => acc + t.miembros.length, 0),
    };
}
async function obtenerGuardia(id) {
    const row = await prisma_1.default.guardiaTurno.findUnique({ where: { id }, include: INCLUDE_GUARDIA });
    if (!row)
        throw new Error('Turno de guardia no encontrado');
    return mapGuardia(row);
}
async function crearGuardia(registradoPorRut, data) {
    const id = crypto_1.default.randomUUID();
    const miembros = [...new Set((data.miembrosRut ?? []).filter(Boolean))];
    const created = await prisma_1.default.$transaction(async (tx) => {
        const turno = await tx.guardiaTurno.create({
            data: {
                id,
                fecha: parseFechaLocal(data.fecha),
                grupo: data.grupo,
                tipoTurno: data.tipoTurno ?? '24H',
                cuarteleroRut: data.cuarteleroRut || null,
                obacRut: data.obacRut || null,
                observaciones: data.observaciones?.trim() || null,
                registradoPorRut,
            },
        });
        if (miembros.length) {
            await tx.guardiaMiembro.createMany({
                data: miembros.map((rut) => ({
                    id: crypto_1.default.randomUUID(),
                    guardiaId: turno.id,
                    usuarioRut: rut,
                })),
            });
        }
        return tx.guardiaTurno.findUnique({ where: { id: turno.id }, include: INCLUDE_GUARDIA });
    });
    return mapGuardia(created);
}
async function actualizarGuardia(id, data) {
    const existente = await prisma_1.default.guardiaTurno.findUnique({ where: { id } });
    if (!existente)
        throw new Error('Turno de guardia no encontrado');
    const updated = await prisma_1.default.$transaction(async (tx) => {
        await tx.guardiaTurno.update({
            where: { id },
            data: {
                ...(data.fecha ? { fecha: parseFechaLocal(data.fecha) } : {}),
                ...(data.grupo ? { grupo: data.grupo } : {}),
                ...(data.tipoTurno ? { tipoTurno: data.tipoTurno } : {}),
                ...(data.cuarteleroRut !== undefined ? { cuarteleroRut: data.cuarteleroRut || null } : {}),
                ...(data.obacRut !== undefined ? { obacRut: data.obacRut || null } : {}),
                ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
            },
        });
        if (data.miembrosRut) {
            const miembros = [...new Set(data.miembrosRut.filter(Boolean))];
            await tx.guardiaMiembro.deleteMany({ where: { guardiaId: id } });
            if (miembros.length) {
                await tx.guardiaMiembro.createMany({
                    data: miembros.map((rut) => ({
                        id: crypto_1.default.randomUUID(),
                        guardiaId: id,
                        usuarioRut: rut,
                    })),
                });
            }
        }
        return tx.guardiaTurno.findUnique({ where: { id }, include: INCLUDE_GUARDIA });
    });
    return mapGuardia(updated);
}
async function eliminarGuardia(id) {
    await prisma_1.default.guardiaTurno.delete({ where: { id } });
    return true;
}
