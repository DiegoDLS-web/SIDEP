import prisma from '../../../prisma';

export const getCuadroHonorReporte = async (anioParam?: number, mesParam?: number) => {
  const anio = anioParam || new Date().getFullYear();
  const mes = mesParam || (new Date().getMonth() + 1);

  // Calculate date ranges
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0));
  const finMes = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));
  const finQuincena = new Date(Date.UTC(anio, mes - 1, 15, 23, 59, 59, 999));

  const inicioAnio = new Date(Date.UTC(anio, 0, 1, 0, 0, 0));
  const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));

  // Get all active/active-ish users
  const usuarios = await prisma.usuario.findMany({
    where: { activo: 1 },
    include: {
      cargo: true,
      tipoVoluntario: true,
    },
  });

  // Query assistances in ranges
  const [asistenciasMes, asistenciasAnio, asistenciasQuincena] = await Promise.all([
    prisma.asistenciaPersonal.findMany({
      where: {
        parte: {
          fechaEmergencia: { gte: inicioMes, lte: finMes },
          estadoId: { not: 3 }, // Not canceled
        },
      },
      select: { usuarioRut: true },
    }),
    prisma.asistenciaPersonal.findMany({
      where: {
        parte: {
          fechaEmergencia: { gte: inicioAnio, lte: finAnio },
          estadoId: { not: 3 },
        },
      },
      select: { usuarioRut: true },
    }),
    prisma.asistenciaPersonal.findMany({
      where: {
        parte: {
          fechaEmergencia: { gte: inicioMes, lte: finQuincena },
          estadoId: { not: 3 },
        },
      },
      select: { usuarioRut: true },
    }),
  ]);

  // Helper to count by user rut
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

  const rows = usuarios.map((u) => {
    // Parse numeric part of RUT for unique integer ID
    const cleanRut = u.rut.replace(/[^0-9]/g, '');
    const usuarioId = parseInt(cleanRut, 10) || 0;

    return {
      usuarioId,
      nombre: `${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`.trim(),
      cargo: u.cargo?.nombre || 'Voluntario',
      tipo: u.tipoVoluntario?.nombre || 'Activo',
      diasMensual: countsMes[u.rut] || 0,
      diasAnual: countsAnio[u.rut] || 0,
      diasQuincena: countsQuincena[u.rut] || 0,
    };
  });

  // Sort by monthly assistances descending
  rows.sort((a, b) => b.diasMensual - a.diasMensual || b.diasAnual - a.diasAnual);

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
