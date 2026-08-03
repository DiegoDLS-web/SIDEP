import prisma from '../../../prisma';
import { StorageService, cloudinary } from '../../../shared/storage';
import { mapUsuarioToDto, mapUsuarioSelectorDto } from './rrhh.service';
import { esUsuarioOperativo, whereUsuarioOperativo } from '../../../utils/usuario-operativo.util';
import { marcarAsistenciaPorBajaUsuario } from '../../cuartel/services/asistencia-cuarteleros.service';
import { hashPassword } from '../../../utils/security/hash';
import { generarPasswordProvisional } from '../../../utils/security/password-policy.util';
import { validarRut, normalizarRut } from '../../../utils/rut.util';
import { NotFoundError, ValidationError, ConflictError } from '../../../utils/errors/AppError';
import { esErrorIntegridadReferencial } from '../../../utils/prisma-error.util';
import {
  resolverRolId,
  resolverCargoId,
  resolverTipoVoluntarioId,
  resolverEstadoVoluntarioId,
  resolverGrupoSanguineoId,
} from '../../../utils/catalogo-resolver';

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
    take: 5000,
  });
  return usuarios.map((u) => mapUsuarioToDto(u));
};

/** Lista mínima de usuarios activos para selects (sin email/teléfono/firma). */
export const listarUsuariosSelector = async () => {
  const usuarios = await prisma.usuario.findMany({
    where: whereUsuarioOperativo(),
    include: {
      cargo: true,
      rol: true,
      estadoVoluntario: true,
    },
    orderBy: [{ nombres: 'asc' }, { apellidoPaterno: 'asc' }],
    take: 2000,
  });
  return usuarios.filter((u) => esUsuarioOperativo({
    activo: u.activo,
    rolCodigo: u.rol?.codigo,
    nombre: `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`.trim(),
    estadoVoluntario: u.estadoVoluntario?.codigo ?? null,
  })).map(mapUsuarioSelectorDto);
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
  cargo?: string,
  incluirClaveNomina = false,
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
    const estadoId = await resolverEstadoVoluntarioId(estado);
    if (estadoId) {
      andConditions.push({ estadoVoluntarioId: estadoId });
    } else {
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
    const tipoId = await resolverTipoVoluntarioId(tipoVoluntario);
    if (tipoId) {
      andConditions.push({ tipoVoluntarioId: tipoId });
    } else {
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
    const cargoId = await resolverCargoId(cargo);
    if (cargoId) {
      andConditions.push({ cargoId });
    } else {
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
    items: usuarios.map((u) => mapUsuarioToDto(u, { incluirClaveNomina })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const crearUsuario = async (datos: any) => {
  const rolId = await resolverRolId(datos.rol);
  const cargoId = await resolverCargoId(datos.cargoOficialidad);
  const tipoVoluntarioId = await resolverTipoVoluntarioId(datos.tipoVoluntario);
  const estadoVoluntarioId = await resolverEstadoVoluntarioId(datos.estadoVoluntario);
  const grupoSanguineoId = await resolverGrupoSanguineoId(datos.grupoSanguineo);

  let fotoPerfilUrl: string | null = null;
  let fotoPerfilPublicId: string | null = null;
  if (datos.fotoPerfil && String(datos.fotoPerfil).startsWith('data:image/')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(datos.fotoPerfil, {
        folder: 'sidep/perfiles',
      });
      fotoPerfilUrl = uploadRes.secure_url;
      fotoPerfilPublicId = uploadRes.public_id;
    } catch (err) {
      console.warn('No se pudo subir foto de perfil (Cloudinary):', err);
    }
  }

  let firmaImagenUrl: string | null = null;
  let firmaImagenPublicId: string | null = null;
  if (datos.firmaImagen && String(datos.firmaImagen).startsWith('data:image/')) {
    try {
      const uploadRes = await cloudinary.uploader.upload(datos.firmaImagen, {
        folder: 'sidep/firmas',
      });
      firmaImagenUrl = uploadRes.secure_url;
      firmaImagenPublicId = uploadRes.public_id;
    } catch (err) {
      console.warn('No se pudo subir firma (Cloudinary):', err);
    }
  }

  if (!datos.rut || !validarRut(datos.rut)) {
    throw new ValidationError(['El RUT no es válido.']);
  }
  if (!datos.email || !String(datos.email).trim()) {
    throw new ValidationError(['El correo electrónico es obligatorio.']);
  }

  const rutNormalizado = normalizarRut(datos.rut);
  const emailNormalizado = String(datos.email).trim().toLowerCase();

  const duplicado = await prisma.usuario.findFirst({
    where: {
      OR: [{ rut: rutNormalizado }, { email: emailNormalizado }],
    },
  });
  if (duplicado) {
    if (duplicado.rut === rutNormalizado) {
      throw new ConflictError('Ya existe un usuario con ese RUT.');
    }
    throw new ConflictError('Ya existe un usuario con ese correo electrónico.');
  }

  const passwordProvisional = generarPasswordProvisional();
  const hashFinal = await hashPassword(passwordProvisional);

  // Validar rango de fechas (1900 - 2100)
  if (datos.fechaNacimiento) {
    const d = new Date(datos.fechaNacimiento);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
      throw new ValidationError(['La fecha de nacimiento debe tener un año válido (entre 1900 y 2100).']);
    }
  }
  if (datos.fechaIngreso) {
    const d = new Date(datos.fechaIngreso);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900 || d.getFullYear() > 2100) {
      throw new ValidationError(['La fecha de ingreso debe tener un año válido (entre 1900 y 2100).']);
    }
  }

  const nuevoUsuario = await prisma.usuario.create({
    data: {
      rut: rutNormalizado,
      nombres: datos.nombres,
      apellidoPaterno: datos.apellidoPaterno,
      apellidoMaterno: datos.apellidoMaterno,
      email: emailNormalizado,
      passwordHash: hashFinal,
      requiereCambioPassword: 1,
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

  return {
    usuario: mapUsuarioToDto(nuevoUsuario, { incluirClaveNomina: true }),
    passwordProvisional,
  };
};

export const actualizarUsuario = async (rut: string, datos: any, registradoPorRut?: string) => {
  const usuarioExistente = await buscarUsuarioPorRut(rut);
  if (!usuarioExistente) {
    throw new NotFoundError('Usuario', rut);
  }

  const updateData: any = {};

  if (datos.nombres !== undefined) updateData.nombres = datos.nombres;
  if (datos.apellidoPaterno !== undefined) updateData.apellidoPaterno = datos.apellidoPaterno;
  if (datos.apellidoMaterno !== undefined) updateData.apellidoMaterno = datos.apellidoMaterno;
  if (datos.rut !== undefined) {
    if (!validarRut(datos.rut)) {
      throw new ValidationError(['El RUT no es válido.']);
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
    updateData.rolId = await resolverRolId(datos.rol, usuarioExistente.rolId);
  }

  if (datos.cargoOficialidad !== undefined) {
    if (datos.cargoOficialidad === null || String(datos.cargoOficialidad).trim() === '') {
      updateData.cargoId = null;
    } else {
      updateData.cargoId = await resolverCargoId(datos.cargoOficialidad);
    }
  }

  if (datos.tipoVoluntario !== undefined) {
    if (datos.tipoVoluntario === null || String(datos.tipoVoluntario).trim() === '') {
      updateData.tipoVoluntarioId = null;
    } else {
      updateData.tipoVoluntarioId = await resolverTipoVoluntarioId(datos.tipoVoluntario);
    }
  }

  if (datos.estadoVoluntario !== undefined) {
    if (datos.estadoVoluntario === null || String(datos.estadoVoluntario).trim() === '') {
      updateData.estadoVoluntarioId = null;
    } else {
      updateData.estadoVoluntarioId = await resolverEstadoVoluntarioId(datos.estadoVoluntario);
    }
  }

  if (datos.grupoSanguineo !== undefined) {
    if (datos.grupoSanguineo === null || String(datos.grupoSanguineo).trim() === '') {
      updateData.grupoSanguineoId = null;
    } else {
      updateData.grupoSanguineoId = await resolverGrupoSanguineoId(datos.grupoSanguineo);
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
      try {
        const uploadRes = await cloudinary.uploader.upload(datos.fotoPerfil, {
          folder: 'sidep/perfiles',
        });
        updateData.fotoPerfilUrl = uploadRes.secure_url;
        updateData.fotoPerfilPublicId = uploadRes.public_id;
      } catch (err) {
        console.warn('No se pudo subir foto de perfil (Cloudinary):', err);
      }
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
      try {
        const uploadRes = await cloudinary.uploader.upload(datos.firmaImagen, {
          folder: 'sidep/firmas',
        });
        updateData.firmaImagenUrl = uploadRes.secure_url;
        updateData.firmaImagenPublicId = uploadRes.public_id;
      } catch (err) {
        console.warn('No se pudo subir firma (Cloudinary):', err);
      }
    } else {
      updateData.firmaImagenUrl = datos.firmaImagen;
    }
  }

  const pasaInactivo =
    usuarioExistente.activo === 1 &&
    (updateData.activo === 0 ||
      (datos.estadoVoluntario !== undefined &&
        String(datos.estadoVoluntario).trim().toUpperCase() === 'INACTIVO'));
  if (pasaInactivo) {
    updateData.tokenVersion = { increment: 1 };
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

  if (pasaInactivo && registradoPorRut) {
    try {
      await marcarAsistenciaPorBajaUsuario(usuarioExistente.rut, registradoPorRut);
    } catch (err) {
      console.error('[SIDEP] marcar asistencia por baja:', err);
    }
  }

  return mapUsuarioToDto(usuarioActualizado);
};

async function referenciasUsuarioParaEliminar(rut: string): Promise<string[]> {
  const [
    partesObac,
    asistencias,
    checklists,
    licenciasPropias,
    mantInspector,
    mantConductor,
    unidadesConductor,
  ] = await Promise.all([
    prisma.parteEmergencia.count({ where: { obacRut: rut } }),
    prisma.asistenciaPersonal.count({ where: { usuarioRut: rut } }),
    prisma.checklistEjecucion.count({ where: { revisorRut: rut } }),
    prisma.licenciaMedica.count({ where: { usuarioRut: rut } }),
    prisma.mantenimientoCarro.count({ where: { inspectorRut: rut } }),
    prisma.mantenimientoCarro.count({ where: { conductorRut: rut } }),
    prisma.unidadEnEmergencia.count({ where: { conductorRut: rut } }),
  ]);

  const refs: string[] = [];
  if (partesObac > 0) refs.push(`${partesObac} parte(s) como OBAC`);
  if (asistencias > 0) refs.push(`${asistencias} asistencia(s) en partes`);
  if (checklists > 0) refs.push(`${checklists} checklist(s)`);
  if (licenciasPropias > 0) refs.push(`${licenciasPropias} licencia(s) médica(s)`);
  if (mantInspector > 0) refs.push(`${mantInspector} mantención(es) como inspector`);
  if (mantConductor > 0) refs.push(`${mantConductor} mantención(es) como conductor`);
  if (unidadesConductor > 0) refs.push(`${unidadesConductor} unidad(es) como conductor`);
  return refs;
}

export const eliminarUsuario = async (rut: string, registradoPorRut?: string) => {
  const usuario = await buscarUsuarioPorRut(rut);
  if (!usuario) {
    throw new NotFoundError('Usuario', rut);
  }

  const referencias = await referenciasUsuarioParaEliminar(usuario.rut);

  // Borrar archivos de Cloudinary si existen
  if (usuario.fotoPerfilPublicId) {
    await StorageService.deleteFile(usuario.fotoPerfilPublicId);
  }
  if (usuario.firmaImagenPublicId) {
    await StorageService.deleteFile(usuario.firmaImagenPublicId);
  }

  try {
    await prisma.usuario.delete({
      where: { rut: usuario.rut },
    });
    return { softDeleted: false };
  } catch (error) {
    if (!esErrorIntegridadReferencial(error)) {
      throw error;
    }
    await prisma.usuario.update({
      where: { rut: usuario.rut },
      data: {
        activo: 0,
        fotoPerfilUrl: null,
        fotoPerfilPublicId: null,
        firmaImagenUrl: null,
        firmaImagenPublicId: null,
        tokenVersion: { increment: 1 },
      },
    });
    if (registradoPorRut) {
      try {
        await marcarAsistenciaPorBajaUsuario(usuario.rut, registradoPorRut);
      } catch (err) {
        console.error('[SIDEP] marcar asistencia por baja (soft delete):', err);
      }
    }
    const detalle =
      referencias.length > 0
        ? ` Registros vinculados: ${referencias.join('; ')}.`
        : '';
    return {
      softDeleted: true,
      message: `No se pudo eliminar físicamente por historial relacionado; usuario dado de baja.${detalle}`,
    };
  }
};
