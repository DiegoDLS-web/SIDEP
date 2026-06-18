import prisma from '../../../prisma';

export const getEmergenciasReporte = async (desde?: string, hasta?: string) => {
  const dateFilter: any = {};
  if (desde) dateFilter.gte = new Date(desde);
  if (hasta) dateFilter.lte = new Date(hasta);

  const whereClause: any = {};
  if (desde || hasta) {
    whereClause.fechaEmergencia = dateFilter;
  }

  // Count total
  const totalEmergencias = await prisma.parteEmergencia.count({
    where: whereClause,
  });

  // Count resolved (estadoId = 2)
  const totalResueltas = await prisma.parteEmergencia.count({
    where: {
      ...whereClause,
      estadoId: 2,
    },
  });

  const porcentajeResueltas = totalEmergencias > 0 ? Math.round((totalResueltas / totalEmergencias) * 100) : 0;

  // Calculate average response time: average of (horaLlegada - horaSalida) in minutes
  const unidades = await prisma.unidadEnEmergencia.findMany({
    where: {
      parte: whereClause,
    },
    select: {
      horaSalida: true,
      horaLlegada: true,
    },
  });

  let totalDiffMin = 0;
  let validUnidadesCount = 0;

  for (const u of unidades) {
    if (u.horaSalida && u.horaLlegada) {
      const diffMs = u.horaLlegada.getTime() - u.horaSalida.getTime();
      const diffMin = diffMs / (1000 * 60);
      if (diffMin >= 0) {
        totalDiffMin += diffMin;
        validUnidadesCount++;
      }
    }
  }

  const tiempoPromedioRespuestaMin = validUnidadesCount > 0 ? Math.round(totalDiffMin / validUnidadesCount) : 0;

  // Group by month
  // Fetch all within range to group in memory (robust and DB-agnostic)
  const allPartes = await prisma.parteEmergencia.findMany({
    where: whereClause,
    select: {
      fechaEmergencia: true,
    },
  });

  const monthGroups: Record<string, number> = {};
  // Initialize with some months or just populate from data
  for (const p of allPartes) {
    const date = new Date(p.fechaEmergencia);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthGroups[period] = (monthGroups[period] || 0) + 1;
  }

  const porMes = Object.entries(monthGroups)
    .map(([periodo, cantidad]) => ({ periodo, cantidad }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  return {
    totalEmergencias,
    porcentajeResueltas,
    tiempoPromedioRespuestaMin,
    porMes,
  };
};
