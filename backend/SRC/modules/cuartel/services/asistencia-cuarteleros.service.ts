import crypto from 'crypto';
import prisma from '../../../prisma';
import { mapUsuarioBasico } from '../utils/usuario-map.util';

const INCLUDE_ASISTENCIA = {
  usuario: { include: { rol: true, cargo: true } },
  registradoPor: { include: { rol: true, cargo: true } },
};

const ESTADOS_ASISTENCIA = ['ASISTE', 'NO_ASISTE', 'DEJA_REEMPLAZO', 'REEMPLAZA', 'LIBERADO'] as const;
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

  const [voluntarios, registros] = await Promise.all([
    prisma.usuario.findMany({
      where: { activo: 1 },
      include: { rol: true, cargo: true },
      orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }, { nombres: 'asc' }],
      take: 2000,
    }),
    prisma.asistenciaCuartelero.findMany({
      where: whereAsistencia,
      include: INCLUDE_ASISTENCIA,
    }),
  ]);

  const mapaRegistros = new Map<string, ReturnType<typeof mapAsistencia>>();
  for (const r of registros) {
    const mapped = mapAsistencia(r);
    mapaRegistros.set(claveCelda(mapped.fecha, mapped.tipoTurno) + '|' + mapped.usuarioRut, mapped);
  }

  const filas = voluntarios.map((v, idx) => {
    const celdas: Record<
      string,
      {
        id: string | null;
        estadoAsistencia: EstadoAsistenciaGuardia | null;
        registradoPor: ReturnType<typeof mapUsuarioBasico> | null;
        updatedAt: string | null;
      }
    > = {};
    let totalAsistencias = 0;
    let grupoGuardia: string | null = null;

    for (const col of columnas) {
      const hit = mapaRegistros.get(`${col.key}|${v.rut}`);
      if (hit) {
        celdas[col.key] = {
          id: hit.id,
          estadoAsistencia: hit.estadoAsistencia,
          registradoPor: hit.registradoPor,
          updatedAt: hit.updatedAt,
        };
        totalAsistencias += cuentaAsistencias(hit.estadoAsistencia);
        if (hit.grupoGuardia) grupoGuardia = hit.grupoGuardia;
      } else {
        celdas[col.key] = {
          id: null,
          estadoAsistencia: null,
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
    const mapped = mapAsistencia(r);
    const rol = String(mapped.registradoPor?.rolCodigo ?? '').toUpperCase();
    if (rol !== 'ADMIN' && rol !== 'CAPITAN' && rol !== 'TENIENTE') continue;
    const prev = registradoresMap.get(r.registradoPorRut);
    if (!prev || mapped.updatedAt > prev.ultimaActualizacion) {
      registradoresMap.set(r.registradoPorRut, {
        rut: r.registradoPorRut,
        nombre: mapped.registradoPor?.nombre ?? r.registradoPorRut,
        rol: mapped.registradoPor?.rol ?? rol,
        ultimaActualizacion: mapped.updatedAt,
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

export async function upsertCeldaAsistencia(
  registradoPorRut: string,
  data: {
    fecha: string;
    usuarioRut: string;
    tipoTurno: TipoTurnoAsistencia;
    estadoAsistencia?: EstadoAsistenciaGuardia | null;
    grupoGuardia?: string | null;
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
      registradoPorRut,
    },
    update: {
      estadoAsistencia: estado,
      presente: presenteDesdeEstado(estado),
      ...(data.grupoGuardia !== undefined ? { grupoGuardia: data.grupoGuardia || null } : {}),
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
      observaciones: data.observaciones?.trim() || null,
      registradoPorRut,
    },
    update: {
      estadoAsistencia: estado,
      presente: presenteDesdeEstado(estado),
      grupoGuardia: data.grupoGuardia || null,
      horaEntrada: data.horaEntrada || null,
      horaSalida: data.horaSalida || null,
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
      ...(data.observaciones !== undefined ? { observaciones: data.observaciones?.trim() || null } : {}),
      registradoPorRut,
    },
    include: INCLUDE_ASISTENCIA,
  });
  return mapAsistencia(row);
}

export async function eliminarAsistencia(id: string) {
  await prisma.asistenciaCuartelero.delete({ where: { id } });
  return true;
}
