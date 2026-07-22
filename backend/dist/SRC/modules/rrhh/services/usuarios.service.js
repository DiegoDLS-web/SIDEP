"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eliminarUsuario = exports.actualizarUsuario = exports.crearUsuario = exports.listarUsuariosPaginado = exports.obtenerMetricasUsuarios = exports.listarUsuariosSelector = exports.listarUsuarios = exports.buscarUsuarioPorRut = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const storage_1 = require("../../../shared/storage");
const rrhh_service_1 = require("./rrhh.service");
const hash_1 = require("../../../utils/security/hash");
const rut_util_1 = require("../../../utils/rut.util");
const AppError_1 = require("../../../utils/errors/AppError");
const prisma_error_util_1 = require("../../../utils/prisma-error.util");
const catalogo_resolver_1 = require("../../../utils/catalogo-resolver");
const buscarUsuarioPorRut = async (rut) => {
    if (!rut)
        return null;
    return prisma_1.default.usuario.findUnique({
        where: { rut: (0, rut_util_1.normalizarRut)(rut) || rut },
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
    });
};
exports.buscarUsuarioPorRut = buscarUsuarioPorRut;
const listarUsuarios = async () => {
    const usuarios = await prisma_1.default.usuario.findMany({
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
        orderBy: { rut: 'asc' },
    });
    return usuarios.map(rrhh_service_1.mapUsuarioToDto);
};
exports.listarUsuarios = listarUsuarios;
/** Lista mínima de usuarios activos para selects (cualquier voluntario activo). */
const listarUsuariosSelector = async () => {
    const usuarios = await prisma_1.default.usuario.findMany({
        where: { activo: 1 },
        include: {
            rol: true,
            tipoVoluntario: true,
        },
        orderBy: [{ nombres: 'asc' }, { apellidoPaterno: 'asc' }],
    });
    return usuarios.map(rrhh_service_1.mapUsuarioToDto);
};
exports.listarUsuariosSelector = listarUsuariosSelector;
const obtenerMetricasUsuarios = async () => {
    const totalSistema = await prisma_1.default.usuario.count();
    const activos = await prisma_1.default.usuario.count({ where: { activo: 1 } });
    const inactivos = await prisma_1.default.usuario.count({ where: { activo: 0 } });
    // Licencias médicas activas hoy
    const hoy = new Date();
    const licenciasActivas = await prisma_1.default.licenciaMedica.findMany({
        where: {
            fechaInicio: { lte: hoy },
            fechaTermino: { gte: hoy },
            estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
        },
        select: { usuarioRut: true },
    });
    const rutsConLicencia = new Set(licenciasActivas.map((l) => l.usuarioRut));
    const conLicencia = rutsConLicencia.size;
    // Suspensiones (voluntarios con estadoVoluntario de suspensión/suspendido)
    const suspension = await prisma_1.default.usuario.count({
        where: {
            estadoVoluntario: {
                nombre: {
                    contains: 'suspens',
                    mode: 'insensitive',
                },
            },
        },
    });
    const totalRoles = await prisma_1.default.rolUsuario.count();
    return {
        totalSistema,
        activos,
        inactivos,
        conLicencia,
        suspension,
        totalRoles,
    };
};
exports.obtenerMetricasUsuarios = obtenerMetricasUsuarios;
const listarUsuariosPaginado = async (page, pageSize, q, estado, tipoVoluntario, cargo) => {
    const andConditions = [];
    if (q && q.trim()) {
        const term = q.trim();
        andConditions.push({
            OR: [
                { rut: { contains: term, mode: 'insensitive' } },
                { nombres: { contains: term, mode: 'insensitive' } },
                { apellidoPaterno: { contains: term, mode: 'insensitive' } },
                { apellidoMaterno: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { nacionalidad: { contains: term, mode: 'insensitive' } },
                { claveNomina: { contains: term, mode: 'insensitive' } },
                { rol: { nombre: { contains: term, mode: 'insensitive' } } },
                { cargo: { nombre: { contains: term, mode: 'insensitive' } } },
                { tipoVoluntario: { nombre: { contains: term, mode: 'insensitive' } } },
                { estadoVoluntario: { nombre: { contains: term, mode: 'insensitive' } } },
            ],
        });
    }
    if (estado && estado.trim()) {
        const estadoId = await (0, catalogo_resolver_1.resolverEstadoVoluntarioId)(estado);
        if (estadoId) {
            andConditions.push({ estadoVoluntarioId: estadoId });
        }
        else {
            andConditions.push({
                estadoVoluntario: {
                    OR: [
                        { codigo: { equals: estado.trim(), mode: 'insensitive' } },
                        { nombre: { equals: estado.trim(), mode: 'insensitive' } },
                    ],
                },
            });
        }
    }
    if (tipoVoluntario && tipoVoluntario.trim()) {
        const tipoId = await (0, catalogo_resolver_1.resolverTipoVoluntarioId)(tipoVoluntario);
        if (tipoId) {
            andConditions.push({ tipoVoluntarioId: tipoId });
        }
        else {
            andConditions.push({
                tipoVoluntario: {
                    OR: [
                        { codigo: { equals: tipoVoluntario.trim(), mode: 'insensitive' } },
                        { nombre: { equals: tipoVoluntario.trim(), mode: 'insensitive' } },
                    ],
                },
            });
        }
    }
    if (cargo && cargo.trim()) {
        const cargoId = await (0, catalogo_resolver_1.resolverCargoId)(cargo);
        if (cargoId) {
            andConditions.push({ cargoId });
        }
        else {
            andConditions.push({
                cargo: {
                    OR: [
                        { codigo: { equals: cargo.trim(), mode: 'insensitive' } },
                        { nombre: { equals: cargo.trim(), mode: 'insensitive' } },
                    ],
                },
            });
        }
    }
    const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};
    const total = await prisma_1.default.usuario.count({ where: whereClause });
    const skip = (page - 1) * pageSize;
    const usuarios = await prisma_1.default.usuario.findMany({
        where: whereClause,
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
        orderBy: { rut: 'asc' },
        skip: skip,
        take: pageSize,
    });
    return {
        items: usuarios.map(rrhh_service_1.mapUsuarioToDto),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
    };
};
exports.listarUsuariosPaginado = listarUsuariosPaginado;
const crearUsuario = async (datos) => {
    const rolId = await (0, catalogo_resolver_1.resolverRolId)(datos.rol);
    const cargoId = await (0, catalogo_resolver_1.resolverCargoId)(datos.cargoOficialidad);
    const tipoVoluntarioId = await (0, catalogo_resolver_1.resolverTipoVoluntarioId)(datos.tipoVoluntario);
    const estadoVoluntarioId = await (0, catalogo_resolver_1.resolverEstadoVoluntarioId)(datos.estadoVoluntario);
    const grupoSanguineoId = await (0, catalogo_resolver_1.resolverGrupoSanguineoId)(datos.grupoSanguineo);
    let fotoPerfilUrl = null;
    let fotoPerfilPublicId = null;
    if (datos.fotoPerfil && String(datos.fotoPerfil).startsWith('data:image/')) {
        try {
            const uploadRes = await storage_1.cloudinary.uploader.upload(datos.fotoPerfil, {
                folder: 'sidep/perfiles',
            });
            fotoPerfilUrl = uploadRes.secure_url;
            fotoPerfilPublicId = uploadRes.public_id;
        }
        catch (err) {
            console.warn('No se pudo subir foto de perfil (Cloudinary):', err);
        }
    }
    let firmaImagenUrl = null;
    let firmaImagenPublicId = null;
    if (datos.firmaImagen && String(datos.firmaImagen).startsWith('data:image/')) {
        try {
            const uploadRes = await storage_1.cloudinary.uploader.upload(datos.firmaImagen, {
                folder: 'sidep/firmas',
            });
            firmaImagenUrl = uploadRes.secure_url;
            firmaImagenPublicId = uploadRes.public_id;
        }
        catch (err) {
            console.warn('No se pudo subir firma (Cloudinary):', err);
        }
    }
    if (!datos.rut || !(0, rut_util_1.validarRut)(datos.rut)) {
        throw new AppError_1.ValidationError(['El RUT no es válido.']);
    }
    if (!datos.email || !String(datos.email).trim()) {
        throw new AppError_1.ValidationError(['El correo electrónico es obligatorio.']);
    }
    const rutNormalizado = (0, rut_util_1.normalizarRut)(datos.rut);
    const emailNormalizado = String(datos.email).trim().toLowerCase();
    const duplicado = await prisma_1.default.usuario.findFirst({
        where: {
            OR: [{ rut: rutNormalizado }, { email: emailNormalizado }],
        },
    });
    if (duplicado) {
        if (duplicado.rut === rutNormalizado) {
            throw new AppError_1.ConflictError('Ya existe un usuario con ese RUT.');
        }
        throw new AppError_1.ConflictError('Ya existe un usuario con ese correo electrónico.');
    }
    const hashedPassword = await (0, hash_1.hashPassword)(rutNormalizado || 'sidep123');
    // Validar rango de fechas (1900 - 2100)
    if (datos.fechaNacimiento) {
        const d = new Date(datos.fechaNacimiento);
        if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
            throw new AppError_1.ValidationError(['La fecha de nacimiento debe tener un año válido (entre 1900 y 2100).']);
        }
    }
    if (datos.fechaIngreso) {
        const d = new Date(datos.fechaIngreso);
        if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
            throw new AppError_1.ValidationError(['La fecha de ingreso debe tener un año válido (entre 1900 y 2100).']);
        }
    }
    const nuevoUsuario = await prisma_1.default.usuario.create({
        data: {
            rut: rutNormalizado,
            nombres: datos.nombres,
            apellidoPaterno: datos.apellidoPaterno,
            apellidoMaterno: datos.apellidoMaterno,
            email: emailNormalizado,
            passwordHash: hashedPassword,
            telefono: datos.telefono || null,
            direccion: datos.direccion || null,
            region: datos.region || null,
            comuna: datos.comuna || null,
            actividad: datos.actividad || null,
            compania: datos.compania || null,
            cuerpoBombero: datos.cuerpoBombero || null,
            rolId,
            cargoId,
            tipoVoluntarioId,
            estadoVoluntarioId,
            grupoSanguineoId,
            fotoPerfilUrl,
            fotoPerfilPublicId,
            firmaImagenUrl,
            firmaImagenPublicId,
            activo: datos.estadoVoluntario === 'VIGENTE' ? 1 : 0,
            nacionalidad: datos.nacionalidad || 'Chilena',
            fechaNacimiento: datos.fechaNacimiento ? new Date(datos.fechaNacimiento) : null,
            fechaIngreso: datos.fechaIngreso ? new Date(datos.fechaIngreso) : null,
            autorizadoConducir: datos.autorizadoConducir ? 1 : 0,
            claveNomina: datos.claveNomina || null,
            observacionesRegistro: datos.observacionesRegistro || null,
        },
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
    });
    return (0, rrhh_service_1.mapUsuarioToDto)(nuevoUsuario);
};
exports.crearUsuario = crearUsuario;
const actualizarUsuario = async (rut, datos) => {
    const usuarioExistente = await (0, exports.buscarUsuarioPorRut)(rut);
    if (!usuarioExistente) {
        throw new AppError_1.NotFoundError('Usuario', rut);
    }
    const updateData = {};
    if (datos.nombres !== undefined)
        updateData.nombres = datos.nombres;
    if (datos.apellidoPaterno !== undefined)
        updateData.apellidoPaterno = datos.apellidoPaterno;
    if (datos.apellidoMaterno !== undefined)
        updateData.apellidoMaterno = datos.apellidoMaterno;
    if (datos.rut !== undefined) {
        if (!(0, rut_util_1.validarRut)(datos.rut)) {
            throw new AppError_1.ValidationError(['El RUT no es válido.']);
        }
        updateData.rut = (0, rut_util_1.normalizarRut)(datos.rut);
    }
    if (datos.email !== undefined)
        updateData.email = datos.email;
    if (datos.telefono !== undefined)
        updateData.telefono = datos.telefono;
    if (datos.direccion !== undefined)
        updateData.direccion = datos.direccion;
    if (datos.region !== undefined)
        updateData.region = datos.region;
    if (datos.comuna !== undefined)
        updateData.comuna = datos.comuna;
    if (datos.actividad !== undefined)
        updateData.actividad = datos.actividad;
    if (datos.compania !== undefined)
        updateData.compania = datos.compania;
    if (datos.cuerpoBombero !== undefined)
        updateData.cuerpoBombero = datos.cuerpoBombero;
    if (datos.activo !== undefined)
        updateData.activo = datos.activo ? 1 : 0;
    if (datos.nacionalidad !== undefined)
        updateData.nacionalidad = datos.nacionalidad;
    if (datos.fechaNacimiento !== undefined) {
        if (datos.fechaNacimiento) {
            const d = new Date(datos.fechaNacimiento);
            if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
                throw new Error('La fecha de nacimiento debe tener un año válido (entre 1900 y 2100).');
            }
        }
        updateData.fechaNacimiento = datos.fechaNacimiento ? new Date(datos.fechaNacimiento) : null;
    }
    if (datos.fechaIngreso !== undefined) {
        if (datos.fechaIngreso) {
            const d = new Date(datos.fechaIngreso);
            if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
                throw new Error('La fecha de ingreso debe tener un año válido (entre 1900 y 2100).');
            }
        }
        updateData.fechaIngreso = datos.fechaIngreso ? new Date(datos.fechaIngreso) : null;
    }
    if (datos.autorizadoConducir !== undefined) {
        updateData.autorizadoConducir = datos.autorizadoConducir ? 1 : 0;
    }
    if (datos.claveNomina !== undefined) {
        updateData.claveNomina = datos.claveNomina || null;
    }
    if (datos.observacionesRegistro !== undefined) {
        updateData.observacionesRegistro = datos.observacionesRegistro || null;
    }
    if (datos.rol !== undefined) {
        updateData.rolId = await (0, catalogo_resolver_1.resolverRolId)(datos.rol, usuarioExistente.rolId);
    }
    if (datos.cargoOficialidad !== undefined) {
        if (datos.cargoOficialidad === null || String(datos.cargoOficialidad).trim() === '') {
            updateData.cargoId = null;
        }
        else {
            updateData.cargoId = await (0, catalogo_resolver_1.resolverCargoId)(datos.cargoOficialidad);
        }
    }
    if (datos.tipoVoluntario !== undefined) {
        if (datos.tipoVoluntario === null || String(datos.tipoVoluntario).trim() === '') {
            updateData.tipoVoluntarioId = null;
        }
        else {
            updateData.tipoVoluntarioId = await (0, catalogo_resolver_1.resolverTipoVoluntarioId)(datos.tipoVoluntario);
        }
    }
    if (datos.estadoVoluntario !== undefined) {
        if (datos.estadoVoluntario === null || String(datos.estadoVoluntario).trim() === '') {
            updateData.estadoVoluntarioId = null;
        }
        else {
            updateData.estadoVoluntarioId = await (0, catalogo_resolver_1.resolverEstadoVoluntarioId)(datos.estadoVoluntario);
        }
    }
    if (datos.grupoSanguineo !== undefined) {
        if (datos.grupoSanguineo === null || String(datos.grupoSanguineo).trim() === '') {
            updateData.grupoSanguineoId = null;
        }
        else {
            updateData.grupoSanguineoId = await (0, catalogo_resolver_1.resolverGrupoSanguineoId)(datos.grupoSanguineo);
        }
    }
    // Foto de Perfil
    if (datos.fotoPerfil !== undefined) {
        if (datos.fotoPerfil === null || String(datos.fotoPerfil).trim() === '') {
            if (usuarioExistente.fotoPerfilPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
            }
            updateData.fotoPerfilUrl = null;
            updateData.fotoPerfilPublicId = null;
        }
        else if (String(datos.fotoPerfil).startsWith('data:image/')) {
            if (usuarioExistente.fotoPerfilPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
            }
            try {
                const uploadRes = await storage_1.cloudinary.uploader.upload(datos.fotoPerfil, {
                    folder: 'sidep/perfiles',
                });
                updateData.fotoPerfilUrl = uploadRes.secure_url;
                updateData.fotoPerfilPublicId = uploadRes.public_id;
            }
            catch (err) {
                console.warn('No se pudo subir foto de perfil (Cloudinary):', err);
            }
        }
        else {
            updateData.fotoPerfilUrl = datos.fotoPerfil;
        }
    }
    // Firma
    if (datos.firmaImagen !== undefined) {
        if (datos.firmaImagen === null || String(datos.firmaImagen).trim() === '') {
            if (usuarioExistente.firmaImagenPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
            }
            updateData.firmaImagenUrl = null;
            updateData.firmaImagenPublicId = null;
        }
        else if (String(datos.firmaImagen).startsWith('data:image/')) {
            if (usuarioExistente.firmaImagenPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
            }
            try {
                const uploadRes = await storage_1.cloudinary.uploader.upload(datos.firmaImagen, {
                    folder: 'sidep/firmas',
                });
                updateData.firmaImagenUrl = uploadRes.secure_url;
                updateData.firmaImagenPublicId = uploadRes.public_id;
            }
            catch (err) {
                console.warn('No se pudo subir firma (Cloudinary):', err);
            }
        }
        else {
            updateData.firmaImagenUrl = datos.firmaImagen;
        }
    }
    const usuarioActualizado = await prisma_1.default.usuario.update({
        where: { rut: usuarioExistente.rut },
        data: updateData,
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
    });
    return (0, rrhh_service_1.mapUsuarioToDto)(usuarioActualizado);
};
exports.actualizarUsuario = actualizarUsuario;
async function referenciasUsuarioParaEliminar(rut) {
    const [partesObac, asistencias, checklists, licenciasPropias, mantInspector, mantConductor, unidadesConductor,] = await Promise.all([
        prisma_1.default.parteEmergencia.count({ where: { obacRut: rut } }),
        prisma_1.default.asistenciaPersonal.count({ where: { usuarioRut: rut } }),
        prisma_1.default.checklistEjecucion.count({ where: { revisorRut: rut } }),
        prisma_1.default.licenciaMedica.count({ where: { usuarioRut: rut } }),
        prisma_1.default.mantenimientoCarro.count({ where: { inspectorRut: rut } }),
        prisma_1.default.mantenimientoCarro.count({ where: { conductorRut: rut } }),
        prisma_1.default.unidadEnEmergencia.count({ where: { conductorRut: rut } }),
    ]);
    const refs = [];
    if (partesObac > 0)
        refs.push(`${partesObac} parte(s) como OBAC`);
    if (asistencias > 0)
        refs.push(`${asistencias} asistencia(s) en partes`);
    if (checklists > 0)
        refs.push(`${checklists} checklist(s)`);
    if (licenciasPropias > 0)
        refs.push(`${licenciasPropias} licencia(s) médica(s)`);
    if (mantInspector > 0)
        refs.push(`${mantInspector} mantención(es) como inspector`);
    if (mantConductor > 0)
        refs.push(`${mantConductor} mantención(es) como conductor`);
    if (unidadesConductor > 0)
        refs.push(`${unidadesConductor} unidad(es) como conductor`);
    return refs;
}
const eliminarUsuario = async (rut) => {
    const usuario = await (0, exports.buscarUsuarioPorRut)(rut);
    if (!usuario) {
        throw new AppError_1.NotFoundError('Usuario', rut);
    }
    const referencias = await referenciasUsuarioParaEliminar(usuario.rut);
    // Borrar archivos de Cloudinary si existen
    if (usuario.fotoPerfilPublicId) {
        await storage_1.StorageService.deleteFile(usuario.fotoPerfilPublicId);
    }
    if (usuario.firmaImagenPublicId) {
        await storage_1.StorageService.deleteFile(usuario.firmaImagenPublicId);
    }
    try {
        await prisma_1.default.usuario.delete({
            where: { rut: usuario.rut },
        });
        return { softDeleted: false };
    }
    catch (error) {
        if (!(0, prisma_error_util_1.esErrorIntegridadReferencial)(error)) {
            throw error;
        }
        await prisma_1.default.usuario.update({
            where: { rut: usuario.rut },
            data: {
                activo: 0,
                fotoPerfilUrl: null,
                fotoPerfilPublicId: null,
                firmaImagenUrl: null,
                firmaImagenPublicId: null,
            },
        });
        const detalle = referencias.length > 0
            ? ` Registros vinculados: ${referencias.join('; ')}.`
            : '';
        return {
            softDeleted: true,
            message: `No se pudo eliminar físicamente por historial relacionado; usuario dado de baja.${detalle}`,
        };
    }
};
exports.eliminarUsuario = eliminarUsuario;
