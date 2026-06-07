import prisma from '../../../prisma';
import { StorageService, cloudinary } from '../../../shared/storage';

// Mapea un modelo Usuario de la BD al DTO UsuarioListaDto del frontend
export function mapUsuarioToDto(usuario: any): any {
  const nombreCompleto = `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
  return {
    id: parseInt(usuario.rut.replace(/[^0-9]/g, ''), 10) || 0,
    nombre: nombreCompleto,
    rut: usuario.rut,
    rol: usuario.rol?.nombre || 'USER',
    email: usuario.email,
    telefono: usuario.telefono || null,
    activo: usuario.activo === 1,
    nombres: usuario.nombres,
    apellidoPaterno: usuario.apellidoPaterno,
    apellidoMaterno: usuario.apellidoMaterno,
    nacionalidad: 'Chilena',
    grupoSanguineo: usuario.grupoSanguineo?.nombre || null,
    direccion: usuario.direccion || null,
    region: usuario.region || null,
    comuna: usuario.comuna || null,
    actividad: usuario.actividad || null,
    fechaNacimiento: null,
    fechaIngreso: null,
    tipoVoluntario: usuario.tipoVoluntario?.nombre || null,
    cuerpoBombero: usuario.cuerpoBombero || null,
    compania: usuario.compania || null,
    estadoVoluntario: usuario.estadoVoluntario?.nombre || null,
    cargoOficialidad: usuario.cargo?.nombre || null,
    observacionesRegistro: null,
    firmaImagen: usuario.firmaImagenUrl || null,
    fotoPerfil: usuario.fotoPerfilUrl || null,
    autorizadoConducir: false,
    claveNomina: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const obtenerMiPerfil = async (rut: string) => {
  const usuario = await prisma.usuario.findUnique({
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

export const actualizarMiPerfil = async (rut: string, datos: any) => {
  // 1. Obtener usuario existente para limpieza de archivos antiguos en Cloudinary
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { rut },
  });

  if (!usuarioExistente) {
    throw new Error('Usuario no encontrado');
  }

  let grupoSanguineoId: number | null | undefined = undefined;

  if (datos.grupoSanguineo !== undefined) {
    if (datos.grupoSanguineo === null || String(datos.grupoSanguineo).trim() === '') {
      grupoSanguineoId = null;
    } else {
      const bg = await prisma.catalogoGrupoSanguineo.findFirst({
        where: { nombre: { equals: datos.grupoSanguineo.trim(), mode: 'insensitive' } },
      });
      if (bg) {
        grupoSanguineoId = bg.id;
      }
    }
  }

  const updateData: any = {};
  if (datos.direccion !== undefined) updateData.direccion = datos.direccion;
  if (datos.region !== undefined) updateData.region = datos.region;
  if (datos.comuna !== undefined) updateData.comuna = datos.comuna;
  if (datos.actividad !== undefined) updateData.actividad = datos.actividad;
  if (datos.email !== undefined) updateData.email = datos.email;
  if (datos.telefono !== undefined) updateData.telefono = datos.telefono;
  if (grupoSanguineoId !== undefined) updateData.grupoSanguineoId = grupoSanguineoId;

  // 2. Procesar Foto de Perfil (soporta Base64/dataURL o URL directa)
  if (datos.fotoPerfil !== undefined) {
    if (datos.fotoPerfil === null || String(datos.fotoPerfil).trim() === '') {
      // Eliminar foto antigua de Cloudinary
      if (usuarioExistente.fotoPerfilPublicId) {
        await StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
      }
      updateData.fotoPerfilUrl = null;
      updateData.fotoPerfilPublicId = null;
    } else if (String(datos.fotoPerfil).startsWith('data:image/')) {
      // Reemplazar foto: borrar antigua y subir nueva
      if (usuarioExistente.fotoPerfilPublicId) {
        await StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
      }
      const uploadRes = await cloudinary.uploader.upload(datos.fotoPerfil, {
        folder: 'sidep/perfiles',
      });
      updateData.fotoPerfilUrl = uploadRes.secure_url;
      updateData.fotoPerfilPublicId = uploadRes.public_id;
    } else {
      updateData.fotoPerfilUrl = datos.fotoPerfil;
    }
  }

  // 3. Procesar Firma (soporta Base64/dataURL o URL directa)
  if (datos.firmaImagen !== undefined) {
    if (datos.firmaImagen === null || String(datos.firmaImagen).trim() === '') {
      // Eliminar firma antigua de Cloudinary
      if (usuarioExistente.firmaImagenPublicId) {
        await StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
      }
      updateData.firmaImagenUrl = null;
      updateData.firmaImagenPublicId = null;
    } else if (String(datos.firmaImagen).startsWith('data:image/')) {
      // Reemplazar firma: borrar antigua y subir nueva
      if (usuarioExistente.firmaImagenPublicId) {
        await StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
      }
      const uploadRes = await cloudinary.uploader.upload(datos.firmaImagen, {
        folder: 'sidep/firmas',
      });
      updateData.firmaImagenUrl = uploadRes.secure_url;
      updateData.firmaImagenPublicId = uploadRes.public_id;
    } else {
      updateData.firmaImagenUrl = datos.firmaImagen;
    }
  }

  const usuarioActualizado = await prisma.usuario.update({
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

export const obtenerMiResumenOperativo = async (rut: string) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Estadísticas de asistencia
  const marcasTotal = await prisma.asistenciaPersonal.count({
    where: { usuarioRut: rut },
  });

  const marcasAnio = await prisma.asistenciaPersonal.count({
    where: {
      usuarioRut: rut,
      parte: {
        fechaEmergencia: {
          gte: startOfYear,
        },
      },
    },
  });

  const marcasMes = await prisma.asistenciaPersonal.count({
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
  const licenciasList = await prisma.licenciaMedica.findMany({
    where: { usuarioRut: rut },
    orderBy: { fechaInicio: 'desc' },
    include: { estado: true },
  });

  const licenciasItems = licenciasList.map((lic: any) => ({
    id: parseInt(lic.id.replace(/[^0-9]/g, '').slice(0, 9), 10) || 1,
    fechaInicio: lic.fechaInicio.toISOString(),
    fechaTermino: lic.fechaTermino.toISOString(),
    estado: lic.estado?.nombre || 'Pendiente',
    motivo: lic.motivo,
  }));

  // 3. Emergencias Recientes
  const asistenciasConParte = await prisma.asistenciaPersonal.findMany({
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

  const emergenciasRecientes = asistenciasConParte.map((ap: any) => {
    const parte = ap.parte;
    const obacNombre = parte.obac
      ? `${parte.obac.nombres} ${parte.obac.apellidoPaterno} ${parte.obac.apellidoMaterno}`.trim()
      : '—';
    return {
      id: parseInt(parte.id.replace(/[^0-9]/g, '').slice(0, 9), 10) || 1,
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
