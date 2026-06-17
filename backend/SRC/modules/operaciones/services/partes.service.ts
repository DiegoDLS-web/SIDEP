import { Prisma, PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../prisma';

const parteInclude = {
  clave: true,
  estado: true,
  obac: {
    select: {
      nombres: true,
      apellidoPaterno: true,
      apellidoMaterno: true,
      rut: true,
    },
  },
  unidades: {
    include: {
      carro: { select: { id: true, nomenclatura: true, nombre: true } },
      conductor: { select: { nombres: true, apellidoPaterno: true, rut: true } },
    },
  },
  asistencias: {
    include: {
      usuario: { select: { nombres: true, apellidoPaterno: true, rut: true } },
    },
  },
  vehiculosCiviles: true,
  pacientes: { include: { triage: true } },
  _count: { select: { asistencias: true, unidades: true } },
} satisfies Prisma.ParteEmergenciaInclude;

type ParteConRelaciones = Prisma.ParteEmergenciaGetPayload<{ include: typeof parteInclude }>;

export interface PartesPaginaFiltros {
  page?: number | undefined;
  pageSize?: number | undefined;
  tipos?: string | undefined;
  carros?: string | undefined;
  q?: string | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
  estado?: string | undefined;
  persona?: string | undefined;
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function combinarFechaHora(fechaBase: Date, horaStr: string): Date {
  const m = (horaStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return fechaBase;
  const d = new Date(fechaBase);
  d.setHours(parseInt(m[1] ?? '0', 10), parseInt(m[2] ?? '0', 10), 0, 0);
  return d;
}

async function resolverEstadoId(estado?: string): Promise<number> {
  if (!estado) return 1;
  const codigo = estado.trim().toUpperCase();
  const encontrado = await prisma.catalogoEstadoParte.findFirst({
    where: {
      OR: [{ codigo }, { nombre: { equals: codigo, mode: 'insensitive' } }],
      activo: 1,
    },
  });
  return encontrado?.id ?? 1;
}

async function resolverClaveId(claveEmergencia?: string, claveId?: number): Promise<number> {
  if (claveId && Number.isFinite(claveId)) return Number(claveId);
  const codigo = (claveEmergencia || '10-0').trim();
  const clave = await prisma.catalogoClaveEmergencia.findFirst({
    where: { codigo, activo: 1 },
  });
  if (!clave) {
    const fallback = await prisma.catalogoClaveEmergencia.findFirst({ where: { activo: 1 } });
    if (!fallback) throw new Error(`Clave de emergencia "${codigo}" no encontrada`);
    return fallback.id;
  }
  return clave.id;
}

async function resolverObacRut(data: Record<string, unknown>): Promise<string> {
  const candidato = String(data.obacRut || data.obacId || '').trim();
  if (!candidato) throw new Error('OBAC es obligatorio');

  const porRut = await prisma.usuario.findUnique({ where: { rut: candidato } });
  if (porRut) return porRut.rut;

  const porRutParcial = await prisma.usuario.findFirst({
    where: {
      OR: [
        { rut: { contains: candidato } },
        { nombres: { contains: candidato, mode: 'insensitive' } },
      ],
      activo: 1,
    },
  });
  if (porRutParcial) return porRutParcial.rut;

  throw new Error(`OBAC "${candidato}" no encontrado`);
}

async function resolverTriageId(triage?: string): Promise<number> {
  const codigo = (triage || 'VERDE').trim().toUpperCase();
  const encontrado = await prisma.catalogoTriage.findFirst({
    where: { OR: [{ codigo }, { nombre: { equals: codigo, mode: 'insensitive' } }] },
  });
  return encontrado?.id ?? 1;
}

function generarCorrelativo(): string {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = `${ahora.getMonth() + 1}`.padStart(2, '0');
  const d = `${ahora.getDate()}`.padStart(2, '0');
  const suf = `${ahora.getTime()}`.slice(-6);
  return `P-${y}${m}${d}-${suf}`;
}

function construirMetadataPersistencia(data: Record<string, unknown>): string | null {
  const base = (data.metadata && typeof data.metadata === 'object'
    ? { ...(data.metadata as Record<string, unknown>) }
    : {}) as Record<string, unknown>;

  const campos = [
    'descripcionEmergencia',
    'trabajoRealizado',
    'materialUtilizado',
    'observaciones',
    'horaDelLlamado',
    'vehiculos',
    'apoyoExterno',
    'otrasCompanias',
    'asistencia',
    'conductoresPorCarroId',
  ] as const;

  for (const campo of campos) {
    if (data[campo] !== undefined && data[campo] !== null) {
      base[campo] = data[campo];
    }
  }

  if (data.vehiculosAfectados) base.vehiculos = data.vehiculosAfectados;
  if (data.apoyosExternos) base.apoyoExterno = data.apoyosExternos;

  return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
}

export function mapParteToDto(p: ParteConRelaciones | null) {
  if (!p) return null;

  const metadata = parseMetadata(p.metadata);
  const estadoCodigo = (p.estado?.codigo || p.estado?.nombre || 'PENDIENTE').toUpperCase();
  const nombreObac = p.obac
    ? `${p.obac.nombres} ${p.obac.apellidoPaterno}`.trim()
    : undefined;

  return {
    id: p.id,
    correlativo: p.correlativo,
    direccion: p.direccion,
    estadoId: p.estadoId,
    claveId: p.claveId,
    obacRut: p.obacRut,
    obacId: p.obacRut,
    fechaEmergencia: p.fechaEmergencia,
    fecha: p.fechaEmergencia,
    referenciaLugar: p.referenciaLugar,
    trabajoRealizado: p.trabajoRealizado ?? (metadata?.trabajoRealizado as string | undefined),
    materialUtilizado: p.materialUtilizado ?? (metadata?.materialUtilizado as string | undefined),
    metadata,
    descripcionEmergencia: metadata?.descripcionEmergencia,
    observaciones: metadata?.observaciones,
    claveEmergencia: p.clave?.codigo,
    codigoEmergencia: p.clave?.codigo,
    estado: estadoCodigo,
    clave: p.clave,
    obac: p.obac
      ? { ...p.obac, nombre: nombreObac }
      : undefined,
    unidades: p.unidades?.map((u) => ({
      id: u.id,
      carroId: u.carroId,
      conductorRut: u.conductorRut,
      horaSalida: u.horaSalida,
      horaLlegada: u.horaLlegada,
      kmSalida: Number(u.kmSalida),
      kmLlegada: Number(u.kmLlegada),
      carro: u.carro,
      conductor: u.conductor,
    })),
    carrosAsistentes: p.unidades,
    asistencias: p.asistencias,
    vehiculosAfectados: p.vehiculosCiviles,
    pacientes: p.pacientes,
    _count: p._count,
    createdAt: p.createdAt,
  };
}

async function sincronizarUnidades(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  parteId: string,
  unidades: unknown[],
  fechaBase: Date,
  conductoresPorCarroId?: Record<string, string>,
) {
  await tx.unidadEnEmergencia.deleteMany({ where: { parteId } });
  if (!Array.isArray(unidades) || unidades.length === 0) return;

  const data: Prisma.UnidadEnEmergenciaCreateManyInput[] = [];
  for (const u of unidades as Record<string, unknown>[]) {
    const carroId = String(u.carroId || '').trim();
    if (!carroId) continue;

    const conductorRut = (u.conductorRut as string | undefined)
      || conductoresPorCarroId?.[carroId]
      || undefined;

    data.push({
      id: uuidv4(),
      parteId,
      carroId,
      conductorRut: conductorRut || null,
      horaSalida: combinarFechaHora(fechaBase, String(u.horaSalida || u.hora6_0 || '00:00')),
      horaLlegada: combinarFechaHora(fechaBase, String(u.horaLlegada || u.hora6_10 || '00:00')),
      kmSalida: Number(u.kmSalida) || 0,
      kmLlegada: Number(u.kmLlegada) || 0,
    });
  }

  if (data.length > 0) {
    await tx.unidadEnEmergencia.createMany({ data });
  }
}

async function sincronizarVehiculos(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  parteId: string,
  vehiculos: unknown[],
) {
  await tx.vehiculoCivilEmergencia.deleteMany({ where: { parteId } });
  if (!Array.isArray(vehiculos) || vehiculos.length === 0) return;

  const data: Prisma.VehiculoCivilEmergenciaCreateManyInput[] = [];
  for (const v of vehiculos as Record<string, unknown>[]) {
    data.push({
      id: uuidv4(),
      parteId,
      patente: String(v.patente || '').trim() || null,
      marca: String(v.marca || v.tipo || '').trim() || null,
      conductor: String(v.conductor || v.nombre || '').trim() || null,
      rutConductor: String(v.rutConductor || v.rut || '').trim() || null,
    });
  }

  if (data.length > 0) {
    await tx.vehiculoCivilEmergencia.createMany({ data });
  }
}

async function sincronizarPacientes(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  parteId: string,
  pacientes: unknown[],
) {
  await tx.pacienteEmergencia.deleteMany({ where: { parteId } });
  if (!Array.isArray(pacientes) || pacientes.length === 0) return;

  for (const pac of pacientes as Record<string, unknown>[]) {
    const nombre = String(pac.nombre || '').trim();
    if (!nombre) continue;
    const triageId = await resolverTriageId(String(pac.triage || 'VERDE'));
    await tx.pacienteEmergencia.create({
      data: {
        id: uuidv4(),
        parteId,
        nombre,
        rutPaciente: pac.rut ? String(pac.rut) : null,
        triageId,
      },
    });
  }
}

export const crearParteConRelaciones = async (data: Record<string, unknown>) => {
  const estadoId = await resolverEstadoId(String(data.estado || ''));
  const claveId = await resolverClaveId(
    data.claveEmergencia as string | undefined,
    data.claveId as number | undefined,
  );
  const obacRut = await resolverObacRut(data);
  const correlativo = String(data.correlativo || generarCorrelativo());
  const fechaEmergencia = data.fecha || data.fechaEmergencia
    ? new Date(String(data.fecha || data.fechaEmergencia))
    : new Date();
  const metadataStr = construirMetadataPersistencia(data);
  const conductores = (data.metadata as Record<string, unknown> | undefined)?.conductoresPorCarroId as
    | Record<string, string>
    | undefined;

  const parteId = uuidv4();

  await prisma.$transaction(async (tx) => {
    await tx.parteEmergencia.create({
      data: {
        id: parteId,
        correlativo,
        estadoId,
        fechaEmergencia,
        claveId,
        obacRut,
        direccion: String(data.direccion || '—'),
        referenciaLugar: data.referenciaLugar ? String(data.referenciaLugar) : null,
        trabajoRealizado: data.trabajoRealizado ? String(data.trabajoRealizado) : null,
        materialUtilizado: data.materialUtilizado ? String(data.materialUtilizado) : null,
        metadata: metadataStr,
      },
    });

    if (Array.isArray(data.asistencias) && data.asistencias.length > 0) {
      const asistenciasUnicas = new Map<string, Prisma.AsistenciaPersonalCreateManyInput>();
      for (const a of data.asistencias as Record<string, unknown>[]) {
        const rut = String(a.usuarioRut || a.rut || a).trim();
        if (rut && !asistenciasUnicas.has(rut)) {
          asistenciasUnicas.set(rut, { id: uuidv4(), parteId, usuarioRut: rut });
        }
      }
      const asistenciasData = Array.from(asistenciasUnicas.values());
      if (asistenciasData.length > 0) {
        await tx.asistenciaPersonal.createMany({ data: asistenciasData });
      }
    }

    await sincronizarUnidades(tx, parteId, data.unidades as unknown[], fechaEmergencia, conductores);
    await sincronizarVehiculos(tx, parteId, (data.vehiculosAfectados || data.vehiculosCiviles) as unknown[]);
    await sincronizarPacientes(tx, parteId, data.pacientes as unknown[]);
  });

  return obtenerPorId(parteId);
};

export const obtenerTodos = async () => {
  const partes = await prisma.parteEmergencia.findMany({
    where: { estadoId: { not: 3 } },
    include: parteInclude,
    orderBy: { fechaEmergencia: 'desc' },
  });
  return partes.map((p) => mapParteToDto(p));
};

export const obtenerPorId = async (id: string) => {
  const parte = await prisma.parteEmergencia.findUnique({
    where: { id },
    include: parteInclude,
  });
  return mapParteToDto(parte);
};

function construirWhereListado(filtros: PartesPaginaFiltros): Prisma.ParteEmergenciaWhereInput {
  const where: Prisma.ParteEmergenciaWhereInput = { estadoId: { not: 3 } };

  if (filtros.q?.trim()) {
    where.direccion = { contains: filtros.q.trim(), mode: 'insensitive' };
  }

  if (filtros.desde || filtros.hasta) {
    where.fechaEmergencia = {};
    if (filtros.desde) where.fechaEmergencia.gte = new Date(filtros.desde);
    if (filtros.hasta) {
      const hasta = new Date(filtros.hasta);
      hasta.setHours(23, 59, 59, 999);
      where.fechaEmergencia.lte = hasta;
    }
  }

  if (filtros.estado?.trim()) {
    where.estado = {
      OR: [
        { codigo: filtros.estado.trim().toUpperCase() },
        { nombre: { equals: filtros.estado.trim(), mode: 'insensitive' } },
      ],
    };
  }

  if (filtros.tipos?.trim()) {
    const codigos = filtros.tipos.split(',').map((t) => t.trim()).filter(Boolean);
    if (codigos.length > 0) {
      where.clave = { codigo: { in: codigos } };
    }
  }

  if (filtros.carros?.trim()) {
    const carroIds = filtros.carros.split(',').map((c) => c.trim()).filter(Boolean);
    if (carroIds.length > 0) {
      where.unidades = { some: { carroId: { in: carroIds } } };
    }
  }

  if (filtros.persona?.trim()) {
    const persona = filtros.persona.trim();
    where.obac = {
      OR: [
        { rut: { contains: persona } },
        { nombres: { contains: persona, mode: 'insensitive' } },
        { apellidoPaterno: { contains: persona, mode: 'insensitive' } },
        { apellidoMaterno: { contains: persona, mode: 'insensitive' } },
      ],
    };
  }

  return where;
}

export const listarPagina = async (filtros: PartesPaginaFiltros) => {
  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(2000, Math.max(1, Number(filtros.pageSize) || 10));
  const where = construirWhereListado(filtros);

  const [total, partes] = await Promise.all([
    prisma.parteEmergencia.count({ where }),
    prisma.parteEmergencia.findMany({
      where,
      include: parteInclude,
      orderBy: { fechaEmergencia: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: partes.map((p) => mapParteToDto(p)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

export const obtenerMetricas = async () => {
  const ahora = new Date();
  const inicioAnio = new Date(ahora.getFullYear(), 0, 1);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const baseWhere = { estadoId: { not: 3 } };

  const [totalSistema, enAnioActual, enMesActual] = await Promise.all([
    prisma.parteEmergencia.count({ where: baseWhere }),
    prisma.parteEmergencia.count({
      where: { ...baseWhere, fechaEmergencia: { gte: inicioAnio } },
    }),
    prisma.parteEmergencia.count({
      where: { ...baseWhere, fechaEmergencia: { gte: inicioMes } },
    }),
  ]);

  return { totalSistema, enAnioActual, enMesActual };
};

export const actualizarParte = async (id: string, data: Record<string, unknown>) => {
  const existente = await prisma.parteEmergencia.findUnique({ where: { id } });
  if (!existente) return null;

  const metadataActual = parseMetadata(existente.metadata) || {};
  const metadataNuevo = data.metadata && typeof data.metadata === 'object'
    ? { ...metadataActual, ...(data.metadata as Record<string, unknown>) }
    : metadataActual;

  const camposMeta = ['descripcionEmergencia', 'trabajoRealizado', 'materialUtilizado', 'observaciones', 'horaDelLlamado', 'asistencia', 'conductoresPorCarroId'] as const;
  for (const campo of camposMeta) {
    if (data[campo] !== undefined) metadataNuevo[campo] = data[campo];
  }
  if (data.vehiculosAfectados) metadataNuevo.vehiculos = data.vehiculosAfectados;
  if (data.apoyosExternos) metadataNuevo.apoyoExterno = data.apoyosExternos;

  const updateData: Prisma.ParteEmergenciaUpdateInput = {
    metadata: Object.keys(metadataNuevo).length > 0 ? JSON.stringify(metadataNuevo) : existente.metadata,
  };

  if (data.direccion !== undefined) updateData.direccion = String(data.direccion);
  if (data.referenciaLugar !== undefined) updateData.referenciaLugar = data.referenciaLugar ? String(data.referenciaLugar) : null;
  if (data.trabajoRealizado !== undefined) updateData.trabajoRealizado = data.trabajoRealizado ? String(data.trabajoRealizado) : null;
  if (data.materialUtilizado !== undefined) updateData.materialUtilizado = data.materialUtilizado ? String(data.materialUtilizado) : null;

  if (data.estado !== undefined) {
    updateData.estado = { connect: { id: await resolverEstadoId(String(data.estado)) } };
  } else if (data.estadoId !== undefined) {
    updateData.estado = { connect: { id: Number(data.estadoId) } };
  }

  if (data.claveEmergencia !== undefined || data.claveId !== undefined) {
    const claveId = await resolverClaveId(
      data.claveEmergencia as string | undefined,
      data.claveId as number | undefined,
    );
    updateData.clave = { connect: { id: claveId } };
  }

  if (data.fecha !== undefined || data.fechaEmergencia !== undefined) {
    updateData.fechaEmergencia = new Date(String(data.fecha || data.fechaEmergencia));
  }

  if (data.obacId !== undefined || data.obacRut !== undefined) {
    const obacRut = await resolverObacRut(data);
    updateData.obac = { connect: { rut: obacRut } };
  }

  const fechaBase = data.fecha || data.fechaEmergencia
    ? new Date(String(data.fecha || data.fechaEmergencia))
    : existente.fechaEmergencia;

  await prisma.$transaction(async (tx) => {
    await tx.parteEmergencia.update({ where: { id }, data: updateData });

    if (data.unidades !== undefined) {
      const conductores = metadataNuevo.conductoresPorCarroId as Record<string, string> | undefined;
      await sincronizarUnidades(tx, id, data.unidades as unknown[], fechaBase, conductores);
    }
    if (data.vehiculosAfectados !== undefined || data.vehiculosCiviles !== undefined) {
      await sincronizarVehiculos(tx, id, (data.vehiculosAfectados || data.vehiculosCiviles) as unknown[]);
    }
    if (data.pacientes !== undefined) {
      await sincronizarPacientes(tx, id, data.pacientes as unknown[]);
    }
  });

  return obtenerPorId(id);
};

export const anularParte = async (id: string) => {
  const anuladoId = await resolverEstadoId('ANULADO').catch(() => 3);
  await prisma.parteEmergencia.update({
    where: { id },
    data: { estadoId: anuladoId },
  });
  return true;
};
