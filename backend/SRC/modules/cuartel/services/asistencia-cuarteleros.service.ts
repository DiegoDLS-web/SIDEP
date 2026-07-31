import crypto from 'crypto';
import prisma from '../../../prisma';
import { mapUsuarioBasico } from '../utils/usuario-map.util';

const INCLUDE_ASISTENCIA = {
  usuario: { include: { rol: true, cargo: true } },
  registradoPor: { include: { rol: true, cargo: true } },
};

const ESTADOS_ASISTENCIA = [
  'ASISTE',
  'NO_ASISTE',
  'DEJA_REEMPLAZO',
  'REEMPLAZA',
  'LIBERADO',
  'VACACIONES',
] as const;
export type EstadoAsistenciaGuardia = (typeof ESTADOS_ASISTENCIA)[number];
export type TipoTurnoAsistencia = 'NOCTURNA' | 'DIURNA';

function presenteDesdeEstado(estado: string): number {
  return estado === 'ASISTE' || estado === 'REEMPLAZA' ? 1 : 0;
}

function mapAsistencia(a: any) {
  return {
    id: a.id,
    fecha: a.fecha.toISOString().slice(0, 10),
    usuarioRut: a.usuarioRut,
    grupoGuardia: a.grupoGuardia,
    tipoTurno: a.tipoTurno as TipoTurnoAsistencia,
    estadoAsistencia: a.estadoAsistencia as EstadoAsistenciaGuardia,
    presente: a.presente === 1,
    horaEntrada: a.horaEntrada,
    horaSalida: a.horaSalida,
    firmaImagenUrl: a.firmaImagenUrl ?? null,
    observaciones: a.observaciones,
    usuario: mapUsuarioBasico(a.usuario),
    registradoPor: mapUsuarioBasico(a.registradoPor),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function parseFechaLocal(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

function claveCelda(fecha: string, tipoTurno: string): string {
  return `${fecha}_${tipoTurno}`;
}

function enumerarFechas(desde: string, hasta: string): string[] {
  const out: string[] = [];
  const start = parseFechaLocal(desde);
  const end = parseFechaLocal(hasta);
  if (start > end) return out;
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function etiquetaFechaCorta(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function cuentaAsistencias(estado: string | null | undefined): number {
  if (!estado) return 0;
  return estado === 'ASISTE' || estado === 'REEMPLAZA' ? 1 : 0;
}

export async function listarAsistencias(filtros: {
  fecha?: string;
  desde?: string;
  hasta?: string;
  grupo?: string;
  presente?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 50;
  const where: any = {};
  if (filtros.grupo) where.grupoGuardia = filtros.grupo;
  if (filtros.presente !== undefined) where.presente = filtros.presente ? 1 : 0;
  if (filtros.fecha) {
    where.fecha = parseFechaLocal(filtros.fecha);
  } else if (filtros.desde || filtros.hasta) {
    where.fecha = {};
    if (filtros.desde) where.fecha.gte = parseFechaLocal(filtros.desde);
    if (filtros.hasta) where.fecha.lte = parseFechaLocal(filtros.hasta);
  }

  const [total, rows] = await Promise.all([
    prisma.asistenciaCuartelero.count({ where }),
    prisma.asistenciaCuartelero.findMany({
      where,
      include: INCLUDE_ASISTENCIA,
      orderBy: [{ fecha: 'desc' }, { usuario: { apellidoPaterno: 'asc' } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(mapAsistencia),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function resumenAsistencia(fechaKey: string) {
  const fecha = parseFechaLocal(fechaKey);
  const rows = await prisma.asistenciaCuartelero.findMany({
    where: { fecha },
    include: INCLUDE_ASISTENCIA,
  });
  const presentes = rows.filter((r) => r.presente === 1).length;
  return {
    fecha: fechaKey,
    total: rows.length,
    presentes,
    ausentes: rows.length - presentes,
    items: rows.map(mapAsistencia),
  };
}

export async function obtenerPlanillaAsistencia(filtros: { desde: string; hasta: string; grupo?: string }) {
  const fechas = enumerarFechas(filtros.desde, filtros.hasta);
  const columnas: Array<{
    key: string;
    fecha: string;
    tipoTurno: TipoTurnoAsistencia;
    label: string;
    sublabel: string;
  }> = [];

  for (const fecha of fechas) {
    for (const tipoTurno of ['NOCTURNA', 'DIURNA'] as const) {
      columnas.push({
        key: claveCelda(fecha, tipoTurno),
        fecha,
        tipoTurno,
        label: etiquetaFechaCorta(fecha),
        sublabel: tipoTurno === 'NOCTURNA' ? 'Nocturna' : 'Diurna',
      });
    }
  }

  const whereAsistencia: any = {
    fecha: {
      gte: parseFechaLocal(filtros.desde),
      lte: parseFechaLocal(filtros.hasta),
    },
  };
  if (filtros.grupo) whereAsistencia.grupoGuardia = filtros.grupo;

  const [voluntarios, registros, firmasIds] = await Promise.all([
    prisma.usuario.findMany({
      where: { activo: 1 },
      select: {
        rut: true,
        nombres: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
      },
      orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }, { nombres: 'asc' }],
      take: 2000,
    }),
    // Sin firmaImagenUrl (base64 pesado): se carga solo al abrir detalle.
    prisma.asistenciaCuartelero.findMany({
      where: whereAsistencia,
      select: {
        id: true,
        fecha: true,
        usuarioRut: true,
        grupoGuardia: true,
        tipoTurno: true,
        estadoAsistencia: true,
        horaEntrada: true,
        horaSalida: true,
        updatedAt: true,
        registradoPorRut: true,
        registradoPor: {
          select: {
            rut: true,
            nombres: true,
            apellidoPaterno: true,
            apellidoMaterno: true,
            rol: { select: { codigo: true, nombre: true } },
          },
        },
      },
    }),
    prisma.asistenciaCuartelero.findMany({
      where: {
        ...whereAsistencia,
        firmaImagenUrl: { not: null },
      },
      select: { id: true },
    }),
  ]);

  const idsConFirma = new Set(firmasIds.map((f) => f.id));

  type CeldaPlanilla = {
    id: string | null;
    estadoAsistencia: EstadoAsistenciaGuardia | null;
    horaEntrada: string | null;
    horaSalida: string | null;
    tieneFirma: boolean;
    registradoPor: ReturnType<typeof mapUsuarioBasico> | null;
    updatedAt: string | null;
  };

  const mapaRegistros = new Map<string, CeldaPlanilla & { grupoGuardia: string | null }>();
  for (const r of registros) {
    const fecha = r.fecha.toISOString().slice(0, 10);
    const key = `${claveCelda(fecha, r.tipoTurno)}|${r.usuarioRut}`;
    mapaRegistros.set(key, {
      id: r.id,
      estadoAsistencia: r.estadoAsistencia as EstadoAsistenciaGuardia,
      horaEntrada: r.horaEntrada,
      horaSalida: r.horaSalida,
      tieneFirma: idsConFirma.has(r.id),
      registradoPor: mapUsuarioBasico(r.registradoPor),
      updatedAt: r.updatedAt.toISOString(),
      grupoGuardia: r.grupoGuardia,
    });
  }

  const filas = voluntarios.map((v, idx) => {
    const celdas: Record<string, CeldaPlanilla> = {};
    let totalAsistencias = 0;
    let grupoGuardia: string | null = null;

    for (const col of columnas) {
      const hit = mapaRegistros.get(`${col.key}|${v.rut}`);
      if (hit) {
        celdas[col.key] = {
          id: hit.id,
          estadoAsistencia: hit.estadoAsistencia,
          horaEntrada: hit.horaEntrada,
          horaSalida: hit.horaSalida,
          tieneFirma: hit.tieneFirma,
          registradoPor: hit.registradoPor,
          updatedAt: hit.updatedAt,
        };
        totalAsistencias += cuentaAsistencias(hit.estadoAsistencia);
        if (hit.grupoGuardia) grupoGuardia = hit.grupoGuardia;
      } else {
        celdas[col.key] = {
          id: null,
          estadoAsistencia: null,
          horaEntrada: null,
          horaSalida: null,
          tieneFirma: false,
          registradoPor: null,
          updatedAt: null,
        };
      }
    }

    const nombre = [v.nombres, v.apellidoPaterno, v.apellidoMaterno].filter(Boolean).join(' ').trim();
    return {
      numero: idx + 1,
      usuarioRut: v.rut,
      nombre,
      grupoGuardia,
      totalAsistencias,
      celdas,
    };
  });

  const filasFiltradas = filtros.grupo
    ? filas.filter((f) => f.grupoGuardia === filtros.grupo || Object.values(f.celdas).some((c) => c.estadoAsistencia))
    : filas;

  const registradoresMap = new Map<
    string,
    { rut: string; nombre: string; rol: string; ultimaActualizacion: string }
  >();
  for (const r of registros) {
    const mapped = mapUsuarioBasico(r.registradoPor);
    const rol = String(mapped?.rolCodigo ?? '').toUpperCase();
    if (rol !== 'ADMIN' && rol !== 'CAPITAN' && rol !== 'TENIENTE') continue;
    const updatedAt = r.updatedAt.toISOString();
    const prev = registradoresMap.get(r.registradoPorRut);
    if (!prev || updatedAt > prev.ultimaActualizacion) {
      registradoresMap.set(r.registradoPorRut, {
        rut: r.registradoPorRut,
        nombre: mapped?.nombre ?? r.registradoPorRut,
        rol: mapped?.rol ?? rol,
        ultimaActualizacion: updatedAt,
      });
    }
  }

  return {
    desde: filtros.desde,
    hasta: filtros.hasta,
    columnas,
    filas: filasFiltradas,
    registradores: [...registradoresMap.values()].sort((a, b) => b.ultimaActualizacion.localeCompare(a.ultimaActualizacion)),
    estados: ESTADOS_ASISTENCIA,
  };
}

export async function obtenerAsistenciaPorId(id: string) {
  const row = await prisma.asistenciaCuartelero.findUnique({
    where: { id },
    include: INCLUDE_ASISTENCIA,
  });
  if (!row) throw new Error('Registro de asistencia no encontrado');
  return mapAsistencia(row);
}

export async function upsertCeldaAsistencia(
  registradoPorRut: string,
  data: {
    fecha: string;
    usuarioRut: string;
    tipoTurno: TipoTurnoAsistencia;
    estadoAsistencia?: EstadoAsistenciaGuardia | null;
    grupoGuardia?: string | null;
    horaEntrada?: string | null;
    horaSalida?: string | null;
    firmaImagenUrl?: string | null;
    observaciones?: string | null;
  },
) {
  const fecha = parseFechaLocal(data.fecha);
  const whereUnique = {
    fecha_usuarioRut_tipoTurno: {
      fecha,
      usuarioRut: data.usuarioRut,
      tipoTurno: data.tipoTurno,
    },
  };

  if (!data.estadoAsistencia) {
    const existente = await prisma.asistenciaCuartelero.findUnique({ where: whereUnique });
    if (existente) {
      await prisma.asistenciaCuartelero.delete({ where: { id: existente.id } });
    }
    return { ok: true, eliminado: true };
  }

  const estado = data.estadoAsistencia;
  const row = await prisma.asistenciaCuartelero.upsert({
    where: whereUnique,
    create: {
      id: crypto.randomUUID(),
      fecha,
      usuarioRut: data.usuarioRut,
      tipoTurno: data.tipoTurno,
      estadoAsistencia: estado,
      presente: presenteDesdeEstado(estado),
      grupoGuardia: data.grupoGuardia || null,
      horaEntrada: data.horaEntrada || null,
      horaSalida: data.horaSalida || null,
      firmaImagenUrl: data.firmaImagenUrl || null,
      observaciones: data.observaciones?.trim() || null,
      registradoPorRut,
    },
    update: {
      estadoAsistencia: estado,
      presente: presenteDesdeEstado(estado),
      ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
      ...(data.horaEntrada !== undefined ? { horaEntrada: data.horaEntrada || null } : {}),
      ...(data.horaSalida !== undefined ? { horaSalida: data.horaSalida || null } : {}),
      ...(data.firmaImagenUrl !== undefined ? { firmaImagenUrl: data.firmaImagenUrl || null } : {}),
      ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
      registradoPorRut,
    },
    include: INCLUDE_ASISTENCIA,
  });
  return mapAsistencia(row);
}

export async function registrarAsistencia(
  registradoPorRut: string,
  data: {
    fecha: string;
    usuarioRut: string;
    grupoGuardia?: string | null;
    tipoTurno?: TipoTurnoAsistencia;
    estadoAsistencia?: EstadoAsistenciaGuardia;
    presente?: boolean;
    horaEntrada?: string | null;
    horaSalida?: string | null;
    firmaImagenUrl?: string | null;
    observaciones?: string | null;
  },
) {
  const tipoTurno = data.tipoTurno ?? 'DIURNA';
  const estado =
    data.estadoAsistencia ??
    (data.presente === false ? 'NO_ASISTE' : 'ASISTE');
  const row = await prisma.asistenciaCuartelero.upsert({
    where: {
      fecha_usuarioRut_tipoTurno: {
        fecha: parseFechaLocal(data.fecha),
        usuarioRut: data.usuarioRut,
        tipoTurno,
      },
    },
    create: {
      id: crypto.randomUUID(),
      fecha: parseFechaLocal(data.fecha),
      usuarioRut: data.usuarioRut,
      tipoTurno,
      estadoAsistencia: estado,
      presente: presenteDesdeEstado(estado),
      grupoGuardia: data.grupoGuardia || null,
      horaEntrada: data.horaEntrada || null,
      horaSalida: data.horaSalida || null,
      firmaImagenUrl: data.firmaImagenUrl || null,
      observaciones: data.observaciones?.trim() || null,
      registradoPorRut,
    },
    update: {
      estadoAsistencia: estado,
      presente: presenteDesdeEstado(estado),
      grupoGuardia: data.grupoGuardia || null,
      horaEntrada: data.horaEntrada || null,
      horaSalida: data.horaSalida || null,
      firmaImagenUrl: data.firmaImagenUrl || null,
      observaciones: data.observaciones?.trim() || null,
      registradoPorRut,
    },
    include: INCLUDE_ASISTENCIA,
  });
  return mapAsistencia(row);
}

export async function actualizarAsistencia(
  id: string,
  registradoPorRut: string,
  data: Partial<{
    grupoGuardia: string | null;
    tipoTurno: TipoTurnoAsistencia;
    estadoAsistencia: EstadoAsistenciaGuardia;
    presente: boolean;
    horaEntrada: string | null;
    horaSalida: string | null;
    firmaImagenUrl: string | null;
    observaciones: string | null;
  }>,
) {
  const existente = await prisma.asistenciaCuartelero.findUnique({ where: { id } });
  if (!existente) throw new Error('Registro de asistencia no encontrado');

  let estado = data.estadoAsistencia;
  if (!estado && data.presente !== undefined) {
    estado = data.presente ? 'ASISTE' : 'NO_ASISTE';
  }

  const row = await prisma.asistenciaCuartelero.update({
    where: { id },
    data: {
      ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
      ...(data.tipoTurno !== undefined ? { tipoTurno: data.tipoTurno } : {}),
      ...(estado !== undefined
        ? { estadoAsistencia: estado, presente: presenteDesdeEstado(estado) }
        : data.presente !== undefined
          ? { presente: data.presente ? 1 : 0 }
          : {}),
      ...(data.horaEntrada !== undefined ? { horaEntrada: data.horaEntrada || null } : {}),
      ...(data.horaSalida !== undefined ? { horaSalida: data.horaSalida || null } : {}),
      ...(data.firmaImagenUrl !== undefined ? { firmaImagenUrl: data.firmaImagenUrl || null } : {}),
      ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
      registradoPorRut,
    },
    include: INCLUDE_ASISTENCIA,
  });
  return mapAsistencia(row);
}

/** Estado actual de cuartelero de turno (asistencia ASISTE hoy o GuardiaTurno del día). */
export async function obtenerCuarteleroEnTurno(ahora = new Date()) {
  const fechaKey = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
  const hora = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      hour12: false,
    }).format(ahora),
  );
  const tipoTurno: TipoTurnoAsistencia = hora >= 20 || hora < 8 ? 'NOCTURNA' : 'DIURNA';
  const fecha = parseFechaLocal(fechaKey);

  const selectUsuario = {
    rut: true,
    nombres: true,
    apellidoPaterno: true,
    apellidoMaterno: true,
    rol: { select: { codigo: true, nombre: true } },
    cargo: { select: { nombre: true } },
  } as const;

  const [asistencia, guardia] = await Promise.all([
    prisma.asistenciaCuartelero.findFirst({
      where: {
        fecha,
        tipoTurno,
        estadoAsistencia: { in: ['ASISTE', 'REEMPLAZA'] },
        presente: 1,
      },
      select: {
        usuarioRut: true,
        horaEntrada: true,
        horaSalida: true,
        usuario: { select: selectUsuario },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.guardiaTurno.findFirst({
      where: { fecha },
      select: {
        tipoTurno: true,
        cuarteleroRut: true,
        cuartelero: { select: selectUsuario },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  if (asistencia) {
    return {
      activo: true,
      fuente: 'asistencia' as const,
      fecha: fechaKey,
      tipoTurno,
      horaEntrada: asistencia.horaEntrada,
      horaSalida: asistencia.horaSalida,
      usuario: mapUsuarioBasico(asistencia.usuario),
      usuarioRut: asistencia.usuarioRut,
    };
  }

  if (guardia?.cuarteleroRut && guardia.cuartelero) {
    return {
      activo: true,
      fuente: 'guardia' as const,
      fecha: fechaKey,
      tipoTurno: guardia.tipoTurno as TipoTurnoAsistencia,
      horaEntrada: null as string | null,
      horaSalida: null as string | null,
      usuario: mapUsuarioBasico(guardia.cuartelero),
      usuarioRut: guardia.cuarteleroRut,
    };
  }

  return {
    activo: false,
    fuente: null as null,
    fecha: fechaKey,
    tipoTurno,
    horaEntrada: null as string | null,
    horaSalida: null as string | null,
    usuario: null,
    usuarioRut: null as string | null,
  };
}

export async function eliminarAsistencia(id: string) {
  await prisma.asistenciaCuartelero.delete({ where: { id } });
  return true;
}
