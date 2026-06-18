import prisma from '../../../prisma';
import { parteWhereNoAnulado } from '../../operaciones/partes-where';

function esUsuarioAdminCuadroHonor(u: {
  nombres: string;
  apellidoPaterno: string;
  rol?: { codigo?: string | null } | null;
}): boolean {
  const rol = (u.rol?.codigo ?? '').trim().toUpperCase();
  if (rol === 'ADMIN') return true;
  const nom = `${u.nombres} ${u.apellidoPaterno}`.trim().toLowerCase();
  return nom.includes('admin de pruebas') || nom.includes('admin pruebas');
}

export const getCuadroHonorReporte = async (anioParam?: number, mesParam?: number) => {
  const anio = anioParam || new Date().getFullYear();
  const mes = mesParam || new Date().getMonth() + 1;

  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
  const finMes = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));
  const finQuincena = new Date(Date.UTC(anio, mes - 1, 15, 23, 59, 59, 999));
  const inicioAnio = new Date(Date.UTC(anio, 0, 1, 0, 0, 0));
  const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));

  const parteVigenteMes = parteWhereNoAnulado({
    fechaEmergencia: { gte: inicioMes, lte: finMes },
  });
  const parteVigenteAnio = parteWhereNoAnulado({
    fechaEmergencia: { gte: inicioAnio, lte: finAnio },
  });
  const parteVigenteQuincena = parteWhereNoAnulado({
    fechaEmergencia: { gte: inicioMes, lte: finQuincena },
  });

  const usuarios = await prisma.usuario.findMany({
    where: { activo: 1 },
    include: {
      cargo: true,
      tipoVoluntario: true,
      rol: true,
    },
  });

  const [asistenciasMes, asistenciasAnio, asistenciasQuincena] = await Promise.all([
    prisma.asistenciaPersonal.findMany({
      where: { parte: parteVigenteMes },
      select: { usuarioRut: true },
    }),
    prisma.asistenciaPersonal.findMany({
      where: { parte: parteVigenteAnio },
      select: { usuarioRut: true },
    }),
    prisma.asistenciaPersonal.findMany({
      where: { parte: parteVigenteQuincena },
      select: { usuarioRut: true },
    }),
  ]);

  const countByRut = (asistencias: { usuarioRut: string }[]) => {
    const counts: Record<string, number> = {};
    for (const a of asistencias) {
      counts[a.usuarioRut] = (counts[a.usuarioRut] || 0) + 1;
    }
    return counts;
  };

  const countsMes = countByRut(asistenciasMes);
  const countsAnio = countByRut(asistenciasAnio);
  const countsQuincena = countByRut(asistenciasQuincena);

  const rows = usuarios
    .filter((u) => !esUsuarioAdminCuadroHonor(u))
    .map((u) => {
      const cleanRut = u.rut.replace(/[^0-9]/g, '');
      const usuarioId = parseInt(cleanRut, 10) || 0;

      return {
        usuarioId,
        nombre: `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`.trim(),
        cargo: u.cargo?.codigo || 'VOLUNTARIO',
        tipo: u.tipoVoluntario?.codigo || 'VOLUNTARIO',
        diasMensual: countsMes[u.rut] || 0,
        diasAnual: countsAnio[u.rut] || 0,
        diasQuincena: countsQuincena[u.rut] || 0,
      };
    })
    .filter((r) => r.diasMensual > 0 || r.diasAnual > 0)
    .sort((a, b) => b.diasMensual - a.diasMensual || b.diasAnual - a.diasAnual);

  return {
    anio,
    mes,
    rango: {
      inicioMes: inicioMes.toISOString().split('T')[0] || '',
      finMes: finMes.toISOString().split('T')[0] || '',
      finQuincena: finQuincena.toISOString().split('T')[0] || '',
    },
    rows: rows.slice(0, 15),
  };
};
