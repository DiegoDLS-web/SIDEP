import prisma from '../../../prisma';
import { StorageService, cloudinary } from '../../../shared/storage';
import { mapUsuarioToDto } from './rrhh.service';
import bcrypt from 'bcrypt';
import { validarRut, normalizarRut } from '../../../utils/rut.util';

export const buscarUsuarioPorRut = async (rut: string) => {
  if (!rut) return null;
  return prisma.usuario.findUnique({
    where: { rut: normalizarRut(rut) || rut },
    include: {
      rol: true,
      cargo: true,
      tipoVoluntario: true,
      estadoVoluntario: true,
      grupoSanguineo: true,
    },
  });
};

export const listarUsuarios = async () => {
  const usuarios = await prisma.usuario.findMany({
    include: {
      rol: true,
      cargo: true,
      tipoVoluntario: true,
      estadoVoluntario: true,
      grupoSanguineo: true,
    },
    orderBy: { rut: 'asc' },
  });
  return usuarios.map(mapUsuarioToDto);
};

export const obtenerMetricasUsuarios = async () => {
  const totalSistema = await prisma.usuario.count();
  const activos = await prisma.usuario.count({ where: { activo: 1 } });
  const inactivos = await prisma.usuario.count({ where: { activo: 0 } });

  // Licencias médicas activas hoy
  const hoy = new Date();
  const licenciasActivas = await prisma.licenciaMedica.findMany({
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
  const suspension = await prisma.usuario.count({
    where: {
      estadoVoluntario: {
        nombre: {
          contains: 'suspens',
          mode: 'insensitive',
        },
      },
    },
  });

  const totalRoles = await prisma.rolUsuario.count();

  return {
    totalSistema,
    activos,
    inactivos,
    conLicencia,
    suspension,
    totalRoles,
  };
};

export const listarUsuariosPaginado = async (
  page: number,
  pageSize: number,
  q?: string,
  estado?: string,
  tipoVoluntario?: string,
  cargo?: string
) => {
  const andConditions: any[] = [];

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
    andConditions.push({
      estadoVoluntario: {
        nombre: { equals: estado.trim(), mode: 'insensitive' },
      },
    });
  }

  if (tipoVoluntario && tipoVoluntario.trim()) {
    andConditions.push({
      tipoVoluntario: {
        nombre: { equals: tipoVoluntario.trim(), mode: 'insensitive' },
      },
    });
  }

  if (cargo && cargo.trim()) {
    andConditions.push({
      cargo: {
        nombre: { equals: cargo.trim(), mode: 'insensitive' },
      },
    });
  }

  const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

  const total = await prisma.usuario.count({ where: whereClause });
  const skip = (page - 1) * pageSize;

  const usuarios = await prisma.usuario.findMany({
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
    items: usuarios.map(mapUsuarioToDto),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const crearUsuario = async (datos: any) => {
  // Buscar o fallback para catálogos por nombre
  let rolId = 2; // Default
  if (datos.rol) {
    const r = await prisma.rolUsuario.findFirst({
      where: { nombre: { equals: datos.rol.trim(), mode: 'insensitive' } },
    });
    if (r) rolId = r.id;
  }

  let cargoId: number | null = null;
  if (datos.cargoOficialidad) {
    const c = await prisma.catalogoCargoOficialidad.findFirst({
      where: { nombre: { equals: datos.cargoOficialidad.trim(), mode: 'insensitive' } },
    });
    if (c) cargoId = c.id;
  }

  let tipoVoluntarioId: number | null = null;
  if (datos.tipoVoluntario) {
    const tv = await prisma.catalogoTipoVoluntario.findFirst({
      where: { nombre: { equals: datos.tipoVoluntario.trim(), mode: 'insensitive' } },
    });
    if (tv) tipoVoluntarioId = tv.id;
  }

  let estadoVoluntarioId: number | null = null;
  if (datos.estadoVoluntario) {
    const ev = await prisma.catalogoEstadoVoluntario.findFirst({
      where: { nombre: { equals: datos.estadoVoluntario.trim(), mode: 'insensitive' } },
    });
    if (ev) estadoVoluntarioId = ev.id;
  }

  let grupoSanguineoId: number | null = null;
  if (datos.grupoSanguineo) {
    const gs = await prisma.catalogoGrupoSanguineo.findFirst({
      where: { nombre: { equals: datos.grupoSanguineo.trim(), mode: 'insensitive' } },
    });
    if (gs) grupoSanguineoId = gs.id;
  }

  let fotoPerfilUrl: string | null = null;
  let fotoPerfilPublicId: string | null = null;
  if (datos.fotoPerfil && String(datos.fotoPerfil).startsWith('data:image/')) {
    const uploadRes = await cloudinary.uploader.upload(datos.fotoPerfil, {
      folder: 'sidep/perfiles',
    });
    fotoPerfilUrl = uploadRes.secure_url;
    fotoPerfilPublicId = uploadRes.public_id;
  }

  let firmaImagenUrl: string | null = null;
  let firmaImagenPublicId: string | null = null;
  if (datos.firmaImagen && String(datos.firmaImagen).startsWith('data:image/')) {
    const uploadRes = await cloudinary.uploader.upload(datos.firmaImagen, {
      folder: 'sidep/firmas',
    });
    firmaImagenUrl = uploadRes.secure_url;
    firmaImagenPublicId = uploadRes.public_id;
  }

  if (!datos.rut || !validarRut(datos.rut)) {
    throw new Error('El RUT no es válido.');
  }
  const rutNormalizado = normalizarRut(datos.rut);
  const hashedPassword = await bcrypt.hash(rutNormalizado || 'sidep123', 10);

  // Validar rango de fechas (1900 - 2100)
  if (datos.fechaNacimiento) {
    const d = new Date(datos.fechaNacimiento);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
      throw new Error('La fecha de nacimiento debe tener un año válido (entre 1900 y 2100).');
    }
  }
  if (datos.fechaIngreso) {
    const d = new Date(datos.fechaIngreso);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
      throw new Error('La fecha de ingreso debe tener un año válido (entre 1900 y 2100).');
    }
  }

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      rut: rutNormalizado,
      nombres: datos.nombres,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      email: datos.email,
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

  return mapUsuarioToDto(nuevoUsuario);
};

export const actualizarUsuario = async (rut: string, datos: any) => {
  const usuarioExistente = await buscarUsuarioPorRut(rut);
  if (!usuarioExistente) {
    throw new Error('Usuario no encontrado');
  }

  const updateData: any = {};

  if (datos.nombres !== undefined) updateData.nombres = datos.nombres;
  if (datos.apellidoPaterno !== undefined) updateData.apellidoPaterno = datos.apellidoPaterno;
  if (datos.apellidoMaterno !== undefined) updateData.apellidoMaterno = datos.apellidoMaterno;
  if (datos.rut !== undefined) {
    if (!validarRut(datos.rut)) {
      throw new Error('El RUT no es válido.');
    }
    updateData.rut = normalizarRut(datos.rut);
  }

  if (datos.email !== undefined) updateData.email = datos.email;
  if (datos.telefono !== undefined) updateData.telefono = datos.telefono;
  if (datos.direccion !== undefined) updateData.direccion = datos.direccion;
  if (datos.region !== undefined) updateData.region = datos.region;
  if (datos.comuna !== undefined) updateData.comuna = datos.comuna;
  if (datos.actividad !== undefined) updateData.actividad = datos.actividad;
  if (datos.compania !== undefined) updateData.compania = datos.compania;
  if (datos.cuerpoBombero !== undefined) updateData.cuerpoBombero = datos.cuerpoBombero;
  if (datos.activo !== undefined) updateData.activo = datos.activo ? 1 : 0;
  
  if (datos.nacionalidad !== undefined) updateData.nacionalidad = datos.nacionalidad;
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
    const r = await prisma.rolUsuario.findFirst({
      where: { nombre: { equals: datos.rol.trim(), mode: 'insensitive' } },
    });
    if (r) updateData.rolId = r.id;
  }

  if (datos.cargoOficialidad !== undefined) {
    if (datos.cargoOficialidad === null || String(datos.cargoOficialidad).trim() === '') {
      updateData.cargoId = null;
    } else {
      const c = await prisma.catalogoCargoOficialidad.findFirst({
        where: { nombre: { equals: datos.cargoOficialidad.trim(), mode: 'insensitive' } },
      });
      if (c) updateData.cargoId = c.id;
    }
  }

  if (datos.tipoVoluntario !== undefined) {
    if (datos.tipoVoluntario === null || String(datos.tipoVoluntario).trim() === '') {
      updateData.tipoVoluntarioId = null;
    } else {
      const tv = await prisma.catalogoTipoVoluntario.findFirst({
        where: { nombre: { equals: datos.tipoVoluntario.trim(), mode: 'insensitive' } },
      });
      if (tv) updateData.tipoVoluntarioId = tv.id;
    }
  }

  if (datos.estadoVoluntario !== undefined) {
    if (datos.estadoVoluntario === null || String(datos.estadoVoluntario).trim() === '') {
      updateData.estadoVoluntarioId = null;
    } else {
      const ev = await prisma.catalogoEstadoVoluntario.findFirst({
        where: { nombre: { equals: datos.estadoVoluntario.trim(), mode: 'insensitive' } },
      });
      if (ev) updateData.estadoVoluntarioId = ev.id;
    }
  }

  if (datos.grupoSanguineo !== undefined) {
    if (datos.grupoSanguineo === null || String(datos.grupoSanguineo).trim() === '') {
      updateData.grupoSanguineoId = null;
    } else {
      const gs = await prisma.catalogoGrupoSanguineo.findFirst({
        where: { nombre: { equals: datos.grupoSanguineo.trim(), mode: 'insensitive' } },
      });
      if (gs) updateData.grupoSanguineoId = gs.id;
    }
  }

  // Foto de Perfil
  if (datos.fotoPerfil !== undefined) {
    if (datos.fotoPerfil === null || String(datos.fotoPerfil).trim() === '') {
      if (usuarioExistente.fotoPerfilPublicId) {
        await StorageService.deleteFile(usuarioExistente.fotoPerfilPublicId);
      }
      updateData.fotoPerfilUrl = null;
      updateData.fotoPerfilPublicId = null;
    } else if (String(datos.fotoPerfil).startsWith('data:image/')) {
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

  // Firma
  if (datos.firmaImagen !== undefined) {
    if (datos.firmaImagen === null || String(datos.firmaImagen).trim() === '') {
      if (usuarioExistente.firmaImagenPublicId) {
        await StorageService.deleteFile(usuarioExistente.firmaImagenPublicId);
      }
      updateData.firmaImagenUrl = null;
      updateData.firmaImagenPublicId = null;
    } else if (String(datos.firmaImagen).startsWith('data:image/')) {
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

  return mapUsuarioToDto(usuarioActualizado);
};

export const eliminarUsuario = async (rut: string) => {
  const usuario = await buscarUsuarioPorRut(rut);
  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  // Borrar archivos de Cloudinary si existen
  if (usuario.fotoPerfilPublicId) {
    await StorageService.deleteFile(usuario.fotoPerfilPublicId);
  }
  if (usuario.firmaImagenPublicId) {
    await StorageService.deleteFile(usuario.firmaImagenPublicId);
  }

  try {
    // Intentar eliminación física
    await prisma.usuario.delete({
      where: { rut: usuario.rut },
    });
    return { softDeleted: false };
  } catch (error) {
    // Si falla por FKey, realizar soft delete (dar de baja) y limpiar referencias a archivos
    await prisma.usuario.update({
      where: { rut: usuario.rut },
      data: {
        activo: 0,
        fotoPerfilUrl: null,
        fotoPerfilPublicId: null,
        firmaImagenUrl: null,
        firmaImagenPublicId: null,
      },
    });
    return {
      softDeleted: true,
      message: 'No se pudo eliminar físicamente por historial relacionado; usuario dado de baja.',
    };
  }
};
