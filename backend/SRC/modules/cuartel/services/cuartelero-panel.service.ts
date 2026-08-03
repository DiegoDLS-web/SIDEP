import prisma from '../../../prisma';
import { mapUsuarioBasico } from '../utils/usuario-map.util';
import { mapAsistenciaFromRow } from './asistencia-cuarteleros.service';

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function parseFechaLocal(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

export async function obtenerPanelCuartelero(usuarioRut: string, anio?: number, mes?: number) {
  const now = new Date();
  const anioEff = anio ?? now.getFullYear();
  const mesEff = mes ?? now.getMonth() + 1;
  const mesStr = String(mesEff).padStart(2, '0');
  const ultimoDia = new Date(Date.UTC(anioEff, mesEff, 0)).getUTCDate();
  const desdeMes = `${anioEff}-${mesStr}-01`;
  const hastaMes = `${anioEff}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`;

  const usuario = await prisma.usuario.findUnique({
    where: { rut: usuarioRut },
    include: { rol: true, cargo: true, estadoVoluntario: true },
  });
  if (!usuario) throw new Error('Usuario no encontrado');

  const turnosMes = await prisma.guardiaTurno.findMany({
    where: {
      fecha: { gte: parseFechaLocal(desdeMes), lte: parseFechaLocal(hastaMes) },
      OR: [
        { cuarteleroRut: usuarioRut },
        { obacRut: usuarioRut },
        { miembros: { some: { usuarioRut } } },
      ],
    },
    include: {
      cuartelero: { include: { rol: true, cargo: true } },
      obac: { include: { rol: true, cargo: true } },
      miembros: { include: { usuario: { include: { rol: true, cargo: true } } } },
    },
    orderBy: [{ fecha: 'asc' }],
  });

  const porFecha = new Map<string, typeof turnosMes>();
  for (const t of turnosMes) {
    const key = t.fecha.toISOString().slice(0, 10);
    const arr = porFecha.get(key) ?? [];
    arr.push(t);
    porFecha.set(key, arr);
  }

  const calendario: Array<{
    fecha: string;
    dia: number;
    diaSemana: number;
    esFinDeSemana: boolean;
    tieneGuardia: boolean;
    turnos: Array<{ id: string; fecha: string; grupo: string; tipoTurno: string; rolEnTurno: string }>;
  }> = [];

  for (let d = 1; d <= ultimoDia; d++) {
    const fecha = `${anioEff}-${mesStr}-${String(d).padStart(2, '0')}`;
    const dt = parseFechaLocal(fecha);
    const delDia = porFecha.get(fecha) ?? [];
    calendario.push({
      fecha,
      dia: d,
      diaSemana: dt.getUTCDay(),
      esFinDeSemana: dt.getUTCDay() === 0 || dt.getUTCDay() === 6,
      tieneGuardia: delDia.length > 0,
      turnos: delDia.map((t) => ({
        id: t.id,
        fecha,
        grupo: t.grupo,
        tipoTurno: t.tipoTurno,
        rolEnTurno:
          t.cuarteleroRut === usuarioRut ? 'CONDUCTOR' : t.obacRut === usuarioRut ? 'OBAC' : 'MIEMBRO',
      })),
    });
  }

  const hace6Meses = new Date(now);
  hace6Meses.setUTCMonth(hace6Meses.getUTCMonth() - 6);

  const historialRows = await prisma.asistenciaCuartelero.findMany({
    where: {
      usuarioRut,
      fecha: { gte: parseFechaLocal(hace6Meses.toISOString().slice(0, 10)) },
    },
    include: {
      usuario: { include: { rol: true, cargo: true } },
      registradoPor: { include: { rol: true, cargo: true } },
    },
    orderBy: [{ fecha: 'desc' }, { tipoTurno: 'asc' }],
    take: 120,
  });

  const proximasGuardias = await prisma.guardiaTurno.findMany({
    where: {
      fecha: { gte: parseFechaLocal(now.toISOString().slice(0, 10)) },
      OR: [
        { cuarteleroRut: usuarioRut },
        { obacRut: usuarioRut },
        { miembros: { some: { usuarioRut } } },
      ],
    },
    orderBy: [{ fecha: 'asc' }],
    take: 8,
  });

  return {
    usuario: mapUsuarioBasico(usuario),
    anio: anioEff,
    mes: mesEff,
    mesLabel: MESES_ES[mesEff - 1] ?? String(mesEff),
    calendario,
    historialAsistencias: historialRows.map(mapAsistenciaFromRow),
    proximasGuardias: proximasGuardias.map((t) => ({
      id: t.id,
      fecha: t.fecha.toISOString().slice(0, 10),
      grupo: t.grupo,
      tipoTurno: t.tipoTurno,
      rolEnTurno:
        t.cuarteleroRut === usuarioRut ? 'CONDUCTOR' : t.obacRut === usuarioRut ? 'OBAC' : 'MIEMBRO',
    })),
    resumenMes: {
      diasConGuardia: calendario.filter((d) => d.tieneGuardia).length,
      asistenciasRegistradas: historialRows.filter(
        (r) => r.fecha >= parseFechaLocal(desdeMes) && r.fecha <= parseFechaLocal(hastaMes),
      ).length,
    },
  };
}

export async function listarHistorialPropio(usuarioRut: string, page = 1, pageSize = 20) {
  const where = { usuarioRut };
  const [total, rows] = await Promise.all([
    prisma.asistenciaCuartelero.count({ where }),
    prisma.asistenciaCuartelero.findMany({
      where,
      include: {
        usuario: { include: { rol: true, cargo: true } },
        registradoPor: { include: { rol: true, cargo: true } },
      },
      orderBy: [{ fecha: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items: rows.map(mapAsistenciaFromRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
