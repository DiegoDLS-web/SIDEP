"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerResumen = exports.listarActivas = exports.cambiarEstado = exports.listarGestion = exports.editarLicencia = exports.crearLicencia = exports.listarMisLicencias = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const crypto_1 = __importDefault(require("crypto"));
const notificaciones_scheduler_service_1 = require("../../notificaciones/notificaciones-scheduler.service");
// ─── Helpers de mapeo ───────────────────────────────────────────────
/** Nombre completo a partir del modelo Usuario. */
function nombreCompleto(usuario) {
    return `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
}
/** Mapea el modelo LicenciaMedica de Prisma al DTO esperado por el frontend. */
function mapLicenciaToDto(lic) {
    return {
        id: lic.id,
        usuarioId: lic.usuarioRut,
        fechaInicio: lic.fechaInicio.toISOString().slice(0, 10),
        fechaTermino: lic.fechaTermino.toISOString().slice(0, 10),
        motivo: lic.motivo,
        archivoUrl: lic.archivoUrl || null,
        estado: lic.estado?.nombre?.toUpperCase() || 'PENDIENTE',
        observacionResolucion: lic.observacionResolucion || null,
        resueltoPorId: lic.resolutorRut || null,
        resueltoEn: lic.resueltoEn ? new Date(lic.resueltoEn).toISOString() : null,
        createdAt: lic.createdAt ? new Date(lic.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: lic.createdAt ? new Date(lic.createdAt).toISOString() : new Date().toISOString(),
        usuario: lic.usuario
            ? {
                id: lic.usuario.rut,
                nombre: nombreCompleto(lic.usuario),
                rut: lic.usuario.rut,
                rol: lic.usuario.rol?.nombre || 'USER',
                cargoOficialidad: lic.usuario.cargo?.nombre || null,
            }
            : undefined,
        resueltoPor: lic.resolutor
            ? {
                id: lic.resolutor.rut,
                nombre: nombreCompleto(lic.resolutor),
                rol: lic.resolutor.rol?.nombre || 'USER',
                cargoOficialidad: lic.resolutor.cargo?.nombre || null,
                firmaImagen: lic.resolutor.firmaImagenUrl || null,
            }
            : null,
    };
}
/** Include por defecto para incluir relaciones necesarias. */
const INCLUDE_LICENCIA = {
    estado: true,
    usuario: {
        include: { rol: true, cargo: true },
    },
    resolutor: {
        include: { rol: true, cargo: true },
    },
};
// ─── Buscar estado de licencia por nombre ───────────────────────────
async function buscarEstadoPorNombre(nombre) {
    const valor = nombre.trim();
    const estado = await prisma_1.default.catalogoEstadoLicencia.findFirst({
        where: {
            OR: [
                { codigo: { equals: valor, mode: 'insensitive' } },
                { nombre: { equals: valor, mode: 'insensitive' } },
            ],
            activo: 1,
        },
    });
    if (!estado) {
        throw new Error(`Estado de licencia "${nombre}" no encontrado en catálogo.`);
    }
    return estado.id;
}
// ─── Buscar licencia por ID ─────────────────────────────────────────
async function buscarLicenciaPorId(id) {
    return prisma_1.default.licenciaMedica.findUnique({
        where: { id },
        include: INCLUDE_LICENCIA,
    });
}
// ─── 1. Listar licencias propias ────────────────────────────────────
const listarMisLicencias = async (rut) => {
    const licencias = await prisma_1.default.licenciaMedica.findMany({
        where: { usuarioRut: rut },
        include: INCLUDE_LICENCIA,
        orderBy: { fechaInicio: 'desc' },
    });
    return licencias.map(mapLicenciaToDto);
};
exports.listarMisLicencias = listarMisLicencias;
// ─── 2. Crear licencia ──────────────────────────────────────────────
const crearLicencia = async (rut, datos) => {
    const fechaInicio = new Date(datos.fechaInicio);
    const fechaTermino = new Date(datos.fechaTermino);
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaTermino.getTime())) {
        throw new Error('Las fechas proporcionadas no son válidas.');
    }
    if (fechaTermino < fechaInicio) {
        throw new Error('La fecha de término no puede ser anterior a la fecha de inicio.');
    }
    if (!datos.motivo || datos.motivo.trim().length < 8) {
        throw new Error('El motivo debe tener al menos 8 caracteres.');
    }
    const estadoPendienteId = await buscarEstadoPorNombre('PENDIENTE');
    const licencia = await prisma_1.default.licenciaMedica.create({
        data: {
            id: crypto_1.default.randomUUID(),
            usuarioRut: rut,
            estadoLicenciaId: estadoPendienteId,
            fechaInicio,
            fechaTermino,
            motivo: datos.motivo.trim(),
            archivoUrl: datos.archivoUrl || null,
            archivoPublicId: datos.archivoPublicId || null,
        },
        include: INCLUDE_LICENCIA,
    });
    return mapLicenciaToDto(licencia);
};
exports.crearLicencia = crearLicencia;
// ─── 3. Editar licencia (solo el solicitante, solo si PENDIENTE) ────
const editarLicencia = async (id, rut, datos) => {
    const lic = await buscarLicenciaPorId(id);
    if (!lic)
        throw new Error('Licencia no encontrada.');
    if (lic.usuarioRut !== rut)
        throw new Error('No tienes permiso para editar esta licencia.');
    if (lic.estado?.nombre?.toUpperCase() !== 'PENDIENTE') {
        throw new Error('Solo se pueden editar licencias en estado PENDIENTE.');
    }
    const updateData = {};
    if (datos.fechaInicio !== undefined) {
        updateData.fechaInicio = new Date(datos.fechaInicio);
    }
    if (datos.fechaTermino !== undefined) {
        updateData.fechaTermino = new Date(datos.fechaTermino);
    }
    if (datos.motivo !== undefined) {
        if (datos.motivo.trim().length < 8) {
            throw new Error('El motivo debe tener al menos 8 caracteres.');
        }
        updateData.motivo = datos.motivo.trim();
    }
    if (datos.archivoUrl !== undefined) {
        updateData.archivoUrl = datos.archivoUrl;
    }
    const actualizada = await prisma_1.default.licenciaMedica.update({
        where: { id: lic.id },
        data: updateData,
        include: INCLUDE_LICENCIA,
    });
    return mapLicenciaToDto(actualizada);
};
exports.editarLicencia = editarLicencia;
// ─── 4. Listar todas las licencias (gestión) ────────────────────────
const listarGestion = async (opts) => {
    const where = {};
    if (opts?.estado?.trim()) {
        where.estado = {
            nombre: { equals: opts.estado.trim(), mode: 'insensitive' },
        };
    }
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(100, Math.max(10, opts?.pageSize ?? 50));
    const [total, licencias] = await Promise.all([
        prisma_1.default.licenciaMedica.count({ where }),
        prisma_1.default.licenciaMedica.findMany({
            where,
            include: INCLUDE_LICENCIA,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);
    return {
        items: licencias.map(mapLicenciaToDto),
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
};
exports.listarGestion = listarGestion;
// ─── 5. Cambiar estado (aprobar/rechazar/anular) ────────────────────
const cambiarEstado = async (id, resolutorRut, estado, observacionResolucion, fechaResolucion) => {
    const lic = await buscarLicenciaPorId(id);
    if (!lic)
        throw new Error('Licencia no encontrada.');
    const observacion = String(observacionResolucion ?? '').trim();
    if (observacion.length < 8) {
        throw new Error('Debe indicar el motivo de la resolución (mínimo 8 caracteres).');
    }
    const fechaRaw = String(fechaResolucion ?? '').trim();
    if (!fechaRaw) {
        throw new Error('Debe indicar la fecha de la resolución.');
    }
    const resueltoEn = new Date(fechaRaw);
    if (Number.isNaN(resueltoEn.getTime())) {
        throw new Error('La fecha de resolución no es válida.');
    }
    const estadoId = await buscarEstadoPorNombre(estado);
    const actualizada = await prisma_1.default.licenciaMedica.update({
        where: { id: lic.id },
        data: {
            estadoLicenciaId: estadoId,
            resolutorRut,
            observacionResolucion: observacion,
            resueltoEn,
        },
        include: INCLUDE_LICENCIA,
    });
    const dto = mapLicenciaToDto(actualizada);
    const estadoNorm = String(estado).trim().toUpperCase();
    if (['APROBADA', 'RECHAZADA', 'ANULADA'].includes(estadoNorm)) {
        void (0, notificaciones_scheduler_service_1.notificarLicenciaResuelta)(actualizada.id).catch((err) => {
            console.error('[SIDEP] Error al notificar resolución de licencia:', err);
        });
    }
    return dto;
};
exports.cambiarEstado = cambiarEstado;
// ─── 6. Licencias activas en una fecha ──────────────────────────────
const listarActivas = async (fechaIso) => {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
        throw new Error('La fecha no es válida.');
    }
    const licencias = await prisma_1.default.licenciaMedica.findMany({
        where: {
            fechaInicio: { lte: fecha },
            fechaTermino: { gte: fecha },
            estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
        },
        include: INCLUDE_LICENCIA,
        orderBy: { fechaInicio: 'asc' },
    });
    return licencias.map((lic) => ({
        id: lic.id,
        usuarioId: lic.usuarioRut,
        fechaInicio: lic.fechaInicio.toISOString().slice(0, 10),
        fechaTermino: lic.fechaTermino.toISOString().slice(0, 10),
        motivo: lic.motivo,
    }));
};
exports.listarActivas = listarActivas;
// ─── 7. Resumen diario de licencias ─────────────────────────────────
const obtenerResumen = async (fechaIso) => {
    const fecha = fechaIso ? new Date(fechaIso) : new Date();
    if (isNaN(fecha.getTime())) {
        throw new Error('La fecha no es válida.');
    }
    // Usuarios con licencia aprobada vigente
    const licenciasActivas = await prisma_1.default.licenciaMedica.findMany({
        where: {
            fechaInicio: { lte: fecha },
            fechaTermino: { gte: fecha },
            estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
        },
        include: {
            usuario: { include: { rol: true, cargo: true } },
        },
    });
    // Usuarios con licencia pendiente vigente (mandaron permiso)
    const licenciasPendientes = await prisma_1.default.licenciaMedica.findMany({
        where: {
            fechaInicio: { lte: fecha },
            fechaTermino: { gte: fecha },
            estado: { nombre: { equals: 'Pendiente', mode: 'insensitive' } },
        },
        include: {
            usuario: { include: { rol: true, cargo: true } },
        },
    });
    const mapUsuario = (u) => ({
        id: u.rut,
        nombre: nombreCompleto(u),
        rut: u.rut,
        rol: u.rol?.nombre || 'USER',
        cargoOficialidad: u.cargo?.nombre || null,
    });
    // Deduplicar por RUT
    const conLicenciaMap = new Map();
    for (const l of licenciasActivas) {
        if (!conLicenciaMap.has(l.usuarioRut)) {
            conLicenciaMap.set(l.usuarioRut, mapUsuario(l.usuario));
        }
    }
    const mandoPermisoMap = new Map();
    for (const l of licenciasPendientes) {
        if (!conLicenciaMap.has(l.usuarioRut) && !mandoPermisoMap.has(l.usuarioRut)) {
            mandoPermisoMap.set(l.usuarioRut, mapUsuario(l.usuario));
        }
    }
    return {
        fecha: fecha.toISOString().slice(0, 10),
        conLicencia: Array.from(conLicenciaMap.values()),
        mandoPermiso: Array.from(mandoPermisoMap.values()),
        sinPermiso: [], // No hay forma práctica de listar "sin permiso" sin definir quién debería tenerlo
    };
};
exports.obtenerResumen = obtenerResumen;
