"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cambiarPassword = exports.actualizarArchivoLicencia = exports.actualizarFotoPerfil = exports.obtenerMiResumenOperativo = exports.actualizarMiPerfil = exports.obtenerMiPerfil = void 0;
exports.mapUsuarioToDto = mapUsuarioToDto;
const prisma_1 = __importDefault(require("../../../prisma"));
const storage_1 = require("../../../shared/storage");
const hash_1 = require("../../../utils/security/hash");
// Mapea un modelo Usuario de la BD al DTO UsuarioListaDto del frontend
function mapUsuarioToDto(usuario) {
    const nombreCompleto = `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
    return {
        id: usuario.rut,
        nombre: nombreCompleto,
        rut: usuario.rut,
        rol: usuario.rol?.codigo || usuario.rol?.nombre || 'USER',
        email: usuario.email,
        telefono: usuario.telefono || null,
        activo: usuario.activo === 1,
        nombres: usuario.nombres,
        apellidoPaterno: usuario.apellidoPaterno,
        apellidoMaterno: usuario.apellidoMaterno,
        nacionalidad: usuario.nacionalidad || null,
        grupoSanguineo: usuario.grupoSanguineo?.codigo || usuario.grupoSanguineo?.nombre || null,
        direccion: usuario.direccion || null,
        region: usuario.region || null,
        comuna: usuario.comuna || null,
        actividad: usuario.actividad || null,
        fechaNacimiento: usuario.fechaNacimiento ? new Date(usuario.fechaNacimiento).toISOString() : null,
        fechaIngreso: usuario.fechaIngreso ? new Date(usuario.fechaIngreso).toISOString() : null,
        tipoVoluntario: usuario.tipoVoluntario?.codigo || usuario.tipoVoluntario?.nombre || null,
        cuerpoBombero: usuario.cuerpoBombero || null,
        compania: usuario.compania || null,
        estadoVoluntario: usuario.estadoVoluntario?.codigo || usuario.estadoVoluntario?.nombre || null,
        cargoOficialidad: usuario.cargo?.codigo || usuario.cargo?.nombre || null,
        observacionesRegistro: usuario.observacionesRegistro || null,
        firmaImagen: usuario.firmaImagenUrl || null,
        fotoPerfil: usuario.fotoPerfilUrl || null,
        autorizadoConducir: usuario.autorizadoConducir === 1,
        claveNomina: usuario.claveNomina || null,
        createdAt: usuario.createdAt ? new Date(usuario.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: usuario.updatedAt ? new Date(usuario.updatedAt).toISOString() : new Date().toISOString(),
    };
}
const obtenerMiPerfil = async (rut) => {
    const usuario = await prisma_1.default.usuario.findUnique({
        where: { rut },
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
    });
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }
    return mapUsuarioToDto(usuario);
};
exports.obtenerMiPerfil = obtenerMiPerfil;
const actualizarMiPerfil = async (rut, datos) => {
    // 1. Obtener usuario existente para limpieza de archivos antiguos en Cloudinary
    const usuarioExistente = await prisma_1.default.usuario.findUnique({
        where: { rut },
    });
    if (!usuarioExistente) {
        throw new Error('Usuario no encontrado');
    }
    let grupoSanguineoId = undefined;
    if (datos.grupoSanguineo !== undefined) {
        if (datos.grupoSanguineo === null || String(datos.grupoSanguineo).trim() === '') {
            grupoSanguineoId = null;
        }
        else {
            const bg = await prisma_1.default.catalogoGrupoSanguineo.findFirst({
                where: { nombre: { equals: datos.grupoSanguineo.trim(), mode: 'insensitive' } },
            });
            if (bg) {
                grupoSanguineoId = bg.id;
            }
        }
    }
    const updateData = {};
    if (datos.direccion !== undefined)
        updateData.direccion = datos.direccion;
    if (datos.region !== undefined)
        updateData.region = datos.region;
    if (datos.comuna !== undefined)
        updateData.comuna = datos.comuna;
    if (datos.actividad !== undefined)
        updateData.actividad = datos.actividad;
    if (datos.email !== undefined)
        updateData.email = datos.email;
    if (datos.telefono !== undefined)
        updateData.telefono = datos.telefono;
    if (grupoSanguineoId !== undefined)
        updateData.grupoSanguineoId = grupoSanguineoId;
    // 2. Procesar Foto de Perfil (soporta Base64/dataURL o URL directa)
    if (datos.fotoPerfil !== undefined) {
        if (datos.fotoPerfil === null || String(datos.fotoPerfil).trim() === '') {
            // Eliminar foto antigua de Cloudinary
            if (usuarioExistente.fotoPerfilPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
            }
            updateData.fotoPerfilUrl = null;
            updateData.fotoPerfilPublicId = null;
        }
        else if (String(datos.fotoPerfil).startsWith('data:image/')) {
            // Reemplazar foto: borrar antigua y subir nueva
            if (usuarioExistente.fotoPerfilPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
            }
            const uploadRes = await storage_1.cloudinary.uploader.upload(datos.fotoPerfil, {
                folder: 'sidep/perfiles',
            });
            updateData.fotoPerfilUrl = uploadRes.secure_url;
            updateData.fotoPerfilPublicId = uploadRes.public_id;
        }
        else {
            updateData.fotoPerfilUrl = datos.fotoPerfil;
        }
    }
    // 3. Procesar Firma (soporta Base64/dataURL o URL directa)
    if (datos.firmaImagen !== undefined) {
        if (datos.firmaImagen === null || String(datos.firmaImagen).trim() === '') {
            // Eliminar firma antigua de Cloudinary
            if (usuarioExistente.firmaImagenPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
            }
            updateData.firmaImagenUrl = null;
            updateData.firmaImagenPublicId = null;
        }
        else if (String(datos.firmaImagen).startsWith('data:image/')) {
            // Reemplazar firma: borrar antigua y subir nueva
            if (usuarioExistente.firmaImagenPublicId) {
                await storage_1.StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
            }
            const uploadRes = await storage_1.cloudinary.uploader.upload(datos.firmaImagen, {
                folder: 'sidep/firmas',
            });
            updateData.firmaImagenUrl = uploadRes.secure_url;
            updateData.firmaImagenPublicId = uploadRes.public_id;
        }
        else {
            updateData.firmaImagenUrl = datos.firmaImagen;
        }
    }
    const usuarioActualizado = await prisma_1.default.usuario.update({
        where: { rut },
        data: updateData,
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
    });
    return mapUsuarioToDto(usuarioActualizado);
};
exports.actualizarMiPerfil = actualizarMiPerfil;
const obtenerMiResumenOperativo = async (rut) => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    // 1. Estadísticas de asistencia
    const marcasTotal = await prisma_1.default.asistenciaPersonal.count({
        where: { usuarioRut: rut },
    });
    const marcasAnio = await prisma_1.default.asistenciaPersonal.count({
        where: {
            usuarioRut: rut,
            parte: {
                fechaEmergencia: {
                    gte: startOfYear,
                },
            },
        },
    });
    const marcasMes = await prisma_1.default.asistenciaPersonal.count({
        where: {
            usuarioRut: rut,
            parte: {
                fechaEmergencia: {
                    gte: startOfMonth,
                },
            },
        },
    });
    // 2. Licencias Médicas
    const licenciasList = await prisma_1.default.licenciaMedica.findMany({
        where: { usuarioRut: rut },
        orderBy: { fechaInicio: 'desc' },
        include: { estado: true },
    });
    const licenciasItems = licenciasList.map((lic) => ({
        id: lic.id,
        fechaInicio: lic.fechaInicio.toISOString(),
        fechaTermino: lic.fechaTermino.toISOString(),
        estado: lic.estado?.nombre || 'Pendiente',
        motivo: lic.motivo,
    }));
    // 3. Emergencias Recientes
    const asistenciasConParte = await prisma_1.default.asistenciaPersonal.findMany({
        where: { usuarioRut: rut },
        take: 20,
        orderBy: {
            parte: {
                fechaEmergencia: 'desc',
            },
        },
        include: {
            parte: {
                include: {
                    clave: true,
                    obac: true,
                    estado: true,
                    _count: {
                        select: { asistencias: true },
                    },
                },
            },
        },
    });
    const emergenciasRecientes = asistenciasConParte.map((ap) => {
        const parte = ap.parte;
        const obacNombre = parte.obac
            ? `${parte.obac.nombres} ${parte.obac.apellidoPaterno} ${parte.obac.apellidoMaterno}`.trim()
            : '—';
        return {
            id: parte.id,
            correlativo: parte.correlativo,
            fecha: parte.fechaEmergencia.toISOString(),
            claveEmergencia: parte.clave?.nombre || '—',
            direccion: parte.direccion,
            estado: parte.estado?.nombre || 'Finalizado',
            obacNombre,
            marcasEnParte: parte._count?.asistencias || 0,
        };
    });
    return {
        asistencia: {
            marcasRegistradasTotal: marcasTotal,
            emergenciasDistintasTotal: marcasTotal,
            marcasRegistradasAnioActual: marcasAnio,
            emergenciasDistintasAnioActual: marcasAnio,
            marcasRegistradasMesActual: marcasMes,
            emergenciasDistintasMesActual: marcasMes,
            anioReferencia: now.getFullYear(),
            mesReferencia: now.getMonth() + 1,
        },
        licencias: {
            total: licenciasItems.length,
            items: licenciasItems,
        },
        emergenciasRecientes,
    };
};
exports.obtenerMiResumenOperativo = obtenerMiResumenOperativo;
const actualizarFotoPerfil = async (rut, url, publicId) => {
    const usuario = await prisma_1.default.usuario.findUnique({
        where: { rut },
    });
    if (usuario && usuario.fotoPerfilPublicId) {
        await storage_1.StorageService.deleteFile(usuario.fotoPerfilPublicId);
    }
    const usuarioActualizado = await prisma_1.default.usuario.update({
        where: { rut },
        data: {
            fotoPerfilUrl: url,
            fotoPerfilPublicId: publicId,
        },
        include: {
            rol: true,
            cargo: true,
            tipoVoluntario: true,
            estadoVoluntario: true,
            grupoSanguineo: true,
        },
    });
    return mapUsuarioToDto(usuarioActualizado);
};
exports.actualizarFotoPerfil = actualizarFotoPerfil;
const actualizarArchivoLicencia = async (licenciaId, url, publicId) => {
    const licencia = await prisma_1.default.licenciaMedica.findUnique({
        where: { id: licenciaId },
    });
    if (!licencia) {
        throw new Error('Licencia médica no encontrada');
    }
    if (licencia.archivoPublicId) {
        await storage_1.StorageService.deleteFile(licencia.archivoPublicId, 'raw');
    }
    return prisma_1.default.licenciaMedica.update({
        where: { id: licenciaId },
        data: {
            archivoUrl: url,
            archivoPublicId: publicId,
        },
    });
};
exports.actualizarArchivoLicencia = actualizarArchivoLicencia;
const cambiarPassword = async (rut, passwordActual, passwordNueva) => {
    const usuario = await prisma_1.default.usuario.findUnique({ where: { rut } });
    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }
    const coincide = await (0, hash_1.comparePassword)(passwordActual, usuario.passwordHash);
    if (!coincide) {
        throw new Error('La contraseña actual es incorrecta.');
    }
    const nuevoHash = await (0, hash_1.hashPassword)(passwordNueva);
    await prisma_1.default.usuario.update({
        where: { rut },
        data: { passwordHash: nuevoHash },
    });
};
exports.cambiarPassword = cambiarPassword;
