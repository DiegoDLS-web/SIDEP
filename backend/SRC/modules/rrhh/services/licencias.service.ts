import prisma from '../../../prisma';
import crypto from 'crypto';

// ─── Helpers de mapeo ───────────────────────────────────────────────

/** Nombre completo a partir del modelo Usuario. */
function nombreCompleto(usuario: any): string {
  return `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
}

/** Mapea el modelo LicenciaMedica de Prisma al DTO esperado por el frontend. */
function mapLicenciaToDto(lic: any): any {
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

async function buscarEstadoPorNombre(nombre: string): Promise<number> {
  const valor = nombre.trim();
  const estado = await prisma.catalogoEstadoLicencia.findFirst({
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

async function buscarLicenciaPorId(id: string): Promise<any> {
  return prisma.licenciaMedica.findUnique({
    where: { id },
    include: INCLUDE_LICENCIA,
  });
}

// ─── 1. Listar licencias propias ────────────────────────────────────

export const listarMisLicencias = async (rut: string) => {
  const licencias = await prisma.licenciaMedica.findMany({
    where: { usuarioRut: rut },
    include: INCLUDE_LICENCIA,
    orderBy: { fechaInicio: 'desc' },
  });
  return licencias.map(mapLicenciaToDto);
};

// ─── 2. Crear licencia ──────────────────────────────────────────────

export const crearLicencia = async (
  rut: string,
  datos: {
    fechaInicio: string;
    fechaTermino: string;
    motivo: string;
    archivoUrl?: string | null;
    archivoPublicId?: string | null;
  },
) => {
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

  const licencia = await prisma.licenciaMedica.create({
    data: {
      id: crypto.randomUUID(),
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

// ─── 3. Editar licencia (solo el solicitante, solo si PENDIENTE) ────

export const editarLicencia = async (
  id: string,
  rut: string,
  datos: Partial<{ fechaInicio: string; fechaTermino: string; motivo: string; archivoUrl: string | null }>,
) => {
  const lic = await buscarLicenciaPorId(id);
  if (!lic) throw new Error('Licencia no encontrada.');
  if (lic.usuarioRut !== rut) throw new Error('No tienes permiso para editar esta licencia.');
  if (lic.estado?.nombre?.toUpperCase() !== 'PENDIENTE') {
    throw new Error('Solo se pueden editar licencias en estado PENDIENTE.');
  }

  const updateData: any = {};
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

  const actualizada = await prisma.licenciaMedica.update({
    where: { id: lic.id },
    data: updateData,
    include: INCLUDE_LICENCIA,
  });

  return mapLicenciaToDto(actualizada);
};

// ─── 4. Listar todas las licencias (gestión) ────────────────────────

export const listarGestion = async (estado?: string) => {
  const where: any = {};
  if (estado && estado.trim()) {
    where.estado = {
      nombre: { equals: estado.trim(), mode: 'insensitive' },
    };
  }

  const licencias = await prisma.licenciaMedica.findMany({
    where,
    include: INCLUDE_LICENCIA,
    orderBy: { createdAt: 'desc' },
  });
  return licencias.map(mapLicenciaToDto);
};

// ─── 5. Cambiar estado (aprobar/rechazar/anular) ────────────────────

export const cambiarEstado = async (
  id: string,
  resolutorRut: string,
  estado: string,
  observacionResolucion?: string,
) => {
  const lic = await buscarLicenciaPorId(id);
  if (!lic) throw new Error('Licencia no encontrada.');

  const estadoId = await buscarEstadoPorNombre(estado);

  const actualizada = await prisma.licenciaMedica.update({
    where: { id: lic.id },
    data: {
      estadoLicenciaId: estadoId,
      resolutorRut,
      observacionResolucion: observacionResolucion?.trim() || null,
      resueltoEn: new Date(),
    },
    include: INCLUDE_LICENCIA,
  });

  return mapLicenciaToDto(actualizada);
};

// ─── 6. Licencias activas en una fecha ──────────────────────────────

export const listarActivas = async (fechaIso: string) => {
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) {
    throw new Error('La fecha no es válida.');
  }

  const licencias = await prisma.licenciaMedica.findMany({
    where: {
      fechaInicio: { lte: fecha },
      fechaTermino: { gte: fecha },
      estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
    },
    include: INCLUDE_LICENCIA,
    orderBy: { fechaInicio: 'asc' },
  });

  return licencias.map((lic: any) => ({
    id: lic.id,
    usuarioId: lic.usuarioRut,
    fechaInicio: lic.fechaInicio.toISOString().slice(0, 10),
    fechaTermino: lic.fechaTermino.toISOString().slice(0, 10),
    motivo: lic.motivo,
  }));
};

// ─── 7. Resumen diario de licencias ─────────────────────────────────

export const obtenerResumen = async (fechaIso?: string) => {
  const fecha = fechaIso ? new Date(fechaIso) : new Date();
  if (isNaN(fecha.getTime())) {
    throw new Error('La fecha no es válida.');
  }

  // Usuarios con licencia aprobada vigente
  const licenciasActivas = await prisma.licenciaMedica.findMany({
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
  const licenciasPendientes = await prisma.licenciaMedica.findMany({
    where: {
      fechaInicio: { lte: fecha },
      fechaTermino: { gte: fecha },
      estado: { nombre: { equals: 'Pendiente', mode: 'insensitive' } },
    },
    include: {
      usuario: { include: { rol: true, cargo: true } },
    },
  });

  const mapUsuario = (u: any) => ({
    id: u.rut,
    nombre: nombreCompleto(u),
    rut: u.rut,
    rol: u.rol?.nombre || 'USER',
    cargoOficialidad: u.cargo?.nombre || null,
  });

  // Deduplicar por RUT
  const conLicenciaMap = new Map<string, any>();
  for (const l of licenciasActivas) {
    if (!conLicenciaMap.has(l.usuarioRut)) {
      conLicenciaMap.set(l.usuarioRut, mapUsuario(l.usuario));
    }
  }

  const mandoPermisoMap = new Map<string, any>();
  for (const l of licenciasPendientes) {
    if (!conLicenciaMap.has(l.usuarioRut) && !mandoPermisoMap.has(l.usuarioRut)) {
      mandoPermisoMap.set(l.usuarioRut, mapUsuario(l.usuario));
    }
  }

  return {
    fecha: fecha.toISOString().slice(0, 10),
    conLicencia: Array.from(conLicenciaMap.values()),
    mandoPermiso: Array.from(mandoPermisoMap.values()),
    sinPermiso: [] as any[], // No hay forma práctica de listar "sin permiso" sin definir quién debería tenerlo
  };
};
