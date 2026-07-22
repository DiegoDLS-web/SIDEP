"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportarAuditoriaExcel = exports.listarAuditoria = exports.registrarAccion = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const crypto_1 = __importDefault(require("crypto"));
const exceljs_1 = __importDefault(require("exceljs"));
/**
 * Registra una acción en la tabla de auditoría.
 */
const registrarAccion = async (params) => {
    try {
        await prisma_1.default.auditoriaUsuario.create({
            data: {
                id: crypto_1.default.randomUUID(),
                usuarioRut: params.usuarioRut || null,
                accion: params.accion,
                entidad: params.entidad || null,
                entidadId: params.entidadId || null,
                metodoHttp: params.metodoHttp || null,
                ruta: params.ruta || null,
                ipOrigen: params.ipOrigen || null,
                userAgent: params.userAgent?.substring(0, 500) || null,
                detalle: params.detalle || null,
                resultado: params.resultado || 'OK',
            },
        });
    }
    catch (error) {
        // No lanzar error — la auditoría no debe bloquear la operación principal
        console.error('⚠️ Error al registrar auditoría:', error);
    }
};
exports.registrarAccion = registrarAccion;
/**
 * Listar registros de auditoría paginados con filtros opcionales.
 */
const listarAuditoria = async (params) => {
    const page = params.page || 1;
    const pageSize = Math.min(params.pageSize || 20, 100);
    const where = {};
    if (params.rut) {
        where.usuarioRut = { contains: params.rut, mode: 'insensitive' };
    }
    if (params.accion) {
        where.accion = { contains: params.accion, mode: 'insensitive' };
    }
    if (params.entidad) {
        where.entidad = { contains: params.entidad, mode: 'insensitive' };
    }
    if (params.desde || params.hasta) {
        where.createdAt = {};
        if (params.desde)
            where.createdAt.gte = new Date(params.desde);
        if (params.hasta)
            where.createdAt.lte = new Date(params.hasta + 'T23:59:59.999Z');
    }
    const total = await prisma_1.default.auditoriaUsuario.count({ where });
    const skip = (page - 1) * pageSize;
    const items = await prisma_1.default.auditoriaUsuario.findMany({
        where,
        include: {
            usuario: {
                select: {
                    rut: true,
                    nombres: true,
                    apellidoPaterno: true,
                    apellidoMaterno: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
    });
    return {
        items: items.map((i) => ({
            id: i.id,
            usuarioRut: i.usuarioRut,
            usuarioNombre: i.usuario
                ? `${i.usuario.nombres} ${i.usuario.apellidoPaterno} ${i.usuario.apellidoMaterno}`.trim()
                : null,
            accion: i.accion,
            entidad: i.entidad,
            entidadId: i.entidadId,
            metodoHttp: i.metodoHttp,
            ruta: i.ruta,
            ipOrigen: i.ipOrigen,
            detalle: i.detalle,
            resultado: i.resultado,
            createdAt: i.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
    };
};
exports.listarAuditoria = listarAuditoria;
const exportarAuditoriaExcel = async (params) => {
    const where = {};
    if (params.rut) {
        where.usuarioRut = { contains: params.rut, mode: 'insensitive' };
    }
    if (params.accion) {
        where.accion = { contains: params.accion, mode: 'insensitive' };
    }
    if (params.entidad) {
        where.entidad = { contains: params.entidad, mode: 'insensitive' };
    }
    if (params.desde || params.hasta) {
        where.createdAt = {};
        if (params.desde)
            where.createdAt.gte = new Date(params.desde);
        if (params.hasta)
            where.createdAt.lte = new Date(params.hasta + 'T23:59:59.999Z');
    }
    const items = await prisma_1.default.auditoriaUsuario.findMany({
        where,
        include: {
            usuario: {
                select: {
                    rut: true,
                    nombres: true,
                    apellidoPaterno: true,
                    apellidoMaterno: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
    });
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet('Auditoría');
    worksheet.columns = [
        { header: 'Fecha/Hora', key: 'fecha', width: 25 },
        { header: 'Usuario', key: 'usuario', width: 30 },
        { header: 'RUT', key: 'rut', width: 15 },
        { header: 'Acción', key: 'accion', width: 25 },
        { header: 'Entidad', key: 'entidad', width: 15 },
        { header: 'ID Entidad', key: 'entidadId', width: 15 },
        { header: 'Método HTTP', key: 'metodoHttp', width: 12 },
        { header: 'Ruta', key: 'ruta', width: 30 },
        { header: 'IP Origen', key: 'ipOrigen', width: 15 },
        { header: 'Detalle', key: 'detalle', width: 50 },
        { header: 'Resultado', key: 'resultado', width: 12 },
    ];
    for (const i of items) {
        worksheet.addRow({
            fecha: i.createdAt.toISOString(),
            usuario: i.usuario ? `${i.usuario.nombres} ${i.usuario.apellidoPaterno} ${i.usuario.apellidoMaterno}`.trim() : 'Sistema',
            rut: i.usuarioRut || 'N/A',
            accion: i.accion,
            entidad: i.entidad || 'N/A',
            entidadId: i.entidadId || 'N/A',
            metodoHttp: i.metodoHttp || 'N/A',
            ruta: i.ruta || 'N/A',
            ipOrigen: i.ipOrigen || 'N/A',
            detalle: i.detalle || '',
            resultado: i.resultado,
        });
    }
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};
exports.exportarAuditoriaExcel = exportarAuditoriaExcel;
