"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolverRolId = resolverRolId;
exports.resolverCargoId = resolverCargoId;
exports.resolverTipoVoluntarioId = resolverTipoVoluntarioId;
exports.resolverEstadoVoluntarioId = resolverEstadoVoluntarioId;
exports.resolverGrupoSanguineoId = resolverGrupoSanguineoId;
const prisma_1 = __importDefault(require("../prisma"));
function condicionesCodigoNombre(valor) {
    const v = valor.trim();
    return [
        { codigo: { equals: v, mode: 'insensitive' } },
        { nombre: { equals: v, mode: 'insensitive' } },
    ];
}
const ALIAS_GRUPO_SANGUINEO = {
    'A+': ['A+', 'A_POSITIVO'],
    'A-': ['A-', 'A_NEGATIVO'],
    'B+': ['B+', 'B_POSITIVO'],
    'B-': ['B-', 'B_NEGATIVO'],
    'AB+': ['AB+', 'AB_POSITIVO'],
    'AB-': ['AB-', 'AB_NEGATIVO'],
    'O+': ['O+', 'O_POSITIVO'],
    'O-': ['O-', 'O_NEGATIVO'],
    DESCONOCIDO: ['DESCONOCIDO', 'NO_CONOCIDO', 'SIN_DATO'],
};
async function resolverRolId(valor, fallbackId = 2) {
    if (!valor?.trim())
        return fallbackId;
    const r = await prisma_1.default.rolUsuario.findFirst({
        where: { OR: condicionesCodigoNombre(valor), activo: 1 },
    });
    return r?.id ?? fallbackId;
}
const ALIAS_CARGO = {
    'TENIENTE 1': 'TENIENTE_PRIMERO',
    'TENIENTE PRIMERO': 'TENIENTE_PRIMERO',
    'TENIENTE 2': 'TENIENTE_SEGUNDO',
    'TENIENTE SEGUNDO': 'TENIENTE_SEGUNDO',
    'TENIENTE 3': 'TENIENTE_TERCERO',
    'TENIENTE TERCERO': 'TENIENTE_TERCERO',
    'TENIENTE 4': 'TENIENTE_CUARTO',
    'TENIENTE CUARTO': 'TENIENTE_CUARTO',
};
async function resolverCargoId(valor) {
    if (!valor?.trim())
        return null;
    const normalizado = ALIAS_CARGO[valor.trim().toUpperCase()] ?? valor.trim();
    const c = await prisma_1.default.catalogoCargoOficialidad.findFirst({
        where: { OR: condicionesCodigoNombre(normalizado), activo: 1 },
    });
    return c?.id ?? null;
}
async function resolverTipoVoluntarioId(valor) {
    if (!valor?.trim())
        return null;
    const c = await prisma_1.default.catalogoTipoVoluntario.findFirst({
        where: { OR: condicionesCodigoNombre(valor), activo: 1 },
    });
    return c?.id ?? null;
}
async function resolverEstadoVoluntarioId(valor) {
    if (!valor?.trim())
        return null;
    const c = await prisma_1.default.catalogoEstadoVoluntario.findFirst({
        where: { OR: condicionesCodigoNombre(valor), activo: 1 },
    });
    return c?.id ?? null;
}
async function resolverGrupoSanguineoId(valor) {
    if (!valor?.trim())
        return null;
    const clave = valor.trim().toUpperCase();
    const candidatos = ALIAS_GRUPO_SANGUINEO[clave] ?? [valor.trim()];
    for (const c of candidatos) {
        const gs = await prisma_1.default.catalogoGrupoSanguineo.findFirst({
            where: { OR: condicionesCodigoNombre(c), activo: 1 },
        });
        if (gs)
            return gs.id;
    }
    return null;
}
