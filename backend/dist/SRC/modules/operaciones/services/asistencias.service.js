"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarAsistencia = exports.agregarAsistencia = exports.getAsistenciasVoluntario = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const partes_where_1 = require("../../operaciones/partes-where");
const AppError_1 = require("../../../utils/errors/AppError");
const parte_disponibilidad_util_1 = require("../../../utils/parte-disponibilidad.util");
const uuid_1 = require("uuid");
const getAsistenciasVoluntario = async (rut, anio, mes) => {
    if (!rut) {
        throw new AppError_1.ValidationError(['RUT del voluntario es requerido']);
    }
    const whereClause = {
        usuarioRut: rut,
        parte: (0, partes_where_1.parteWhereNoAnulado)(),
    };
    if (anio) {
        const inicio = new Date(Date.UTC(anio, mes ? mes - 1 : 0, 1, 0, 0, 0));
        const fin = new Date(Date.UTC(anio, mes ? mes : 12, 0, 23, 59, 59, 999));
        whereClause.parte.fechaEmergencia = { gte: inicio, lte: fin };
    }
    return await prisma_1.default.asistenciaPersonal.findMany({
        where: whereClause,
        include: {
            parte: {
                select: {
                    id: true,
                    correlativo: true,
                    fechaEmergencia: true,
                    direccion: true,
                    clave: {
                        select: {
                            codigo: true,
                            nombre: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            parte: {
                fechaEmergencia: 'desc',
            },
        },
    });
};
exports.getAsistenciasVoluntario = getAsistenciasVoluntario;
const agregarAsistencia = async (parteId, usuarioRut) => {
    if (!parteId || !usuarioRut) {
        throw new AppError_1.ValidationError(['parteId y usuarioRut son requeridos']);
    }
    // 1. Verify parte exists and is not canceled
    const parte = await prisma_1.default.parteEmergencia.findUnique({
        where: { id: parteId },
        include: { estado: { select: { codigo: true } } },
    });
    if (!parte) {
        throw new AppError_1.NotFoundError('Parte de emergencia', parteId);
    }
    if (parte.estado?.codigo === 'ANULADO') {
        throw new AppError_1.ValidationError(['No se puede agregar asistencia a un parte anulado']);
    }
    // 2. Verify usuario exists and is active
    const usuario = await prisma_1.default.usuario.findUnique({
        where: { rut: usuarioRut },
        include: { estadoVoluntario: true, tipoVoluntario: true },
    });
    if (!usuario) {
        throw new AppError_1.NotFoundError('Usuario', usuarioRut);
    }
    const fechaParte = parte.fechaEmergencia;
    const licencia = await prisma_1.default.licenciaMedica.findFirst({
        where: {
            usuarioRut,
            fechaInicio: { lte: parte.fechaEmergencia },
            fechaTermino: { gte: parte.fechaEmergencia },
            estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
        },
        select: { id: true },
    });
    const evaluacion = (0, parte_disponibilidad_util_1.evaluarDisponibilidadVoluntarioEnParte)(usuario, fechaParte, {
        licenciaMedicaActiva: !!licencia,
    });
    if (!evaluacion.disponible) {
        throw new AppError_1.ValidationError([evaluacion.motivo ?? 'No se puede agregar asistencia a un voluntario no disponible']);
    }
    // 3. Verify unique constraint
    const existente = await prisma_1.default.asistenciaPersonal.findUnique({
        where: {
            parteId_usuarioRut: {
                parteId,
                usuarioRut,
            },
        },
    });
    if (existente) {
        throw new AppError_1.ConflictError('El voluntario ya está registrado en este parte');
    }
    // 4. Create assistance
    return await prisma_1.default.asistenciaPersonal.create({
        data: {
            id: (0, uuid_1.v4)(),
            parteId,
            usuarioRut,
        },
        include: {
            usuario: {
                select: {
                    nombres: true,
                    apellidoPaterno: true,
                    rol: true,
                },
            },
        },
    });
};
exports.agregarAsistencia = agregarAsistencia;
const eliminarAsistencia = async (parteId, asistenciaId) => {
    if (!parteId || !asistenciaId) {
        throw new AppError_1.ValidationError(['parteId y asistenciaId son requeridos']);
    }
    // 1. Verify parte
    const parte = await prisma_1.default.parteEmergencia.findUnique({
        where: { id: parteId },
        include: { estado: { select: { codigo: true } } },
    });
    if (!parte) {
        throw new AppError_1.NotFoundError('Parte de emergencia', parteId);
    }
    if (parte.estado?.codigo === 'ANULADO') {
        throw new AppError_1.ValidationError(['No se puede modificar un parte anulado']);
    }
    // 2. Verify assistance exists and belongs to this parte
    const asistencia = await prisma_1.default.asistenciaPersonal.findUnique({
        where: { id: asistenciaId },
    });
    if (!asistencia) {
        throw new AppError_1.NotFoundError('Asistencia', asistenciaId);
    }
    if (asistencia.parteId !== parteId) {
        throw new AppError_1.ValidationError(['La asistencia no pertenece al parte especificado']);
    }
    // 3. Delete
    return await prisma_1.default.asistenciaPersonal.delete({
        where: { id: asistenciaId },
    });
};
exports.eliminarAsistencia = eliminarAsistencia;
