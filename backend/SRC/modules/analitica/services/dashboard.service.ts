import prisma from '../../../prisma';

export const getDashboardResumen = async (anioParam?: number, claveFilter?: string, carroIdFilter?: number) => {
  const anio = anioParam || new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const inicioAnio = new Date(Date.UTC(anio, 0, 1, 0, 0, 0));
  const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));

  const inicioMes = new Date(Date.UTC(anio, currentMonth - 1, 1, 0, 0, 0));
  const finMes = new Date(Date.UTC(anio, currentMonth, 0, 23, 59, 59, 999));

  // Build filter criteria
  const whereClause: any = {
    fechaEmergencia: { gte: inicioAnio, lte: finAnio },
    estadoId: { not: 3 }, // Not canceled
  };

  if (claveFilter && claveFilter !== 'todos') {
    whereClause.clave = { codigo: claveFilter };
  }

  if (carroIdFilter) {
    whereClause.unidades = {
      some: {
        carro: {
          id: {
            endsWith: String(carroIdFilter), // Simple match since ID is string/UUID
          },
        },
      },
    };
  }

  // 1. Total Emergencias
  const totalEmergencias = await prisma.parteEmergencia.count({ where: whereClause });

  // 2. Porcentaje Resueltas (estadoId = 2)
  const totalResueltas = await prisma.parteEmergencia.count({
    where: { ...whereClause, estadoId: 2 },
  });
  const porcentajeResueltas = totalEmergencias > 0 ? Math.round((totalResueltas / totalEmergencias) * 100) : 0;

  // 3. Tiempo Promedio Respuesta
  const unidades = await prisma.unidadEnEmergencia.findMany({
    where: { parte: whereClause },
    select: { horaSalida: true, horaLlegada: true },
  });

  let totalRespuestaMs = 0;
  let validRespuestaCount = 0;
  for (const u of unidades) {
    if (u.horaSalida && u.horaLlegada) {
      const diff = u.horaLlegada.getTime() - u.horaSalida.getTime();
      if (diff >= 0) {
        totalRespuestaMs += diff;
        validRespuestaCount++;
      }
    }
  }
  const tiempoPromedioRespuestaMin = validRespuestaCount > 0 ? Math.round(totalRespuestaMs / (validRespuestaCount * 1000 * 60)) : 0;

  // 4. Emergencias Este Mes
  const whereClauseMes = { ...whereClause, fechaEmergencia: { gte: inicioMes, lte: finMes } };
  const emergenciasEsteMes = await prisma.parteEmergencia.count({ where: whereClauseMes });

  // 5. porMes
  const allPartes = await prisma.parteEmergencia.findMany({
    where: whereClause,
    select: { fechaEmergencia: true },
  });
  const monthGroups: Record<string, number> = {};
  for (const p of allPartes) {
    const d = p.fechaEmergencia;
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthGroups[period] = (monthGroups[period] || 0) + 1;
  }
  const porMes = Object.entries(monthGroups).map(([period, cantidad]) => ({ period, cantidad })).sort((a, b) => a.period.localeCompare(b.period));

  // 6. porTipo
  const partesConClave = await prisma.parteEmergencia.findMany({
    where: whereClause,
    include: { clave: true },
  });
  const typeGroups: Record<string, number> = {};
  for (const p of partesConClave) {
    const code = p.clave.codigo;
    typeGroups[code] = (typeGroups[code] || 0) + 1;
  }
  const porTipo = Object.entries(typeGroups).map(([claveEmergencia, cantidad]) => ({ claveEmergencia, cantidad }));

  // 7. Recientes
  const recientesPartes = await prisma.parteEmergencia.findMany({
    where: whereClause,
    orderBy: { fechaEmergencia: 'desc' },
    take: 5,
    include: { clave: true, estado: true, unidades: { include: { carro: true } } },
  });

  const recientes = recientesPartes.map((p) => ({
    id: p.id,
    correlativo: p.correlativo,
    claveEmergencia: p.clave.codigo,
    direccion: p.direccion,
    fecha: p.fechaEmergencia.toISOString(),
    estado: p.estado.nombre,
    unidades: p.unidades.map((u) => u.carro.nomenclatura),
  }));

  // Heatmap: últimas 4 semanas (lun–dom), cada celda = emergencias ese día
  const SEMANAS = 4;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  const inicioHeatmap = new Date(hoy);
  inicioHeatmap.setHours(0, 0, 0, 0);
  const diaSemana = inicioHeatmap.getDay();
  const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  inicioHeatmap.setDate(inicioHeatmap.getDate() - diasHastaLunes - (SEMANAS - 1) * 7);

  const conteoPorDia: Record<string, number> = {};
  for (const p of allPartes) {
    const fecha = p.fechaEmergencia;
    if (fecha < inicioHeatmap || fecha > hoy) continue;
    const key = fecha.toISOString().slice(0, 10);
    conteoPorDia[key] = (conteoPorDia[key] || 0) + 1;
  }

  const heatmapSemanas: number[][] = [];
  for (let w = 0; w < SEMANAS; w++) {
    const semana: number[] = [];
    for (let d = 0; d < 7; d++) {
      const celda = new Date(inicioHeatmap);
      celda.setDate(inicioHeatmap.getDate() + w * 7 + d);
      const key = celda.toISOString().slice(0, 10);
      semana.push(conteoPorDia[key] || 0);
    }
    heatmapSemanas.push(semana);
  }

  // 9. Alertas
  const alertas: any[] = [];
  const carros = await prisma.carro.findMany();
  for (const c of carros) {
    if (c.estadoOperativo === 0) {
      const cleanCarId = c.id.replace(/[^0-9]/g, '');
      alertas.push({
        tipo: 'carro_fuera_servicio',
        severidad: 'critico',
        titulo: `Unidad ${c.nomenclatura} Fuera de Servicio`,
        detalle: `El carro ${c.nombre} está marcado como no operativo en el sistema.`,
        carroId: parseInt(cleanCarId, 10) || 0,
        nomenclatura: c.nomenclatura,
      });
    }
  }

  // 10. Unidades Semáforo
  const ejecucionesChecklist = await prisma.checklistEjecucion.findMany({
    where: {
      fechaRevision: { gte: inicioMes, lte: finMes },
    },
    orderBy: { fechaRevision: 'desc' },
  });

  const unidadesSemaforo = carros.map((c) => {
    const semaforo = c.estadoOperativo === 1 ? 'operativa' : 'fuera_servicio';
    const cleanCarId = c.id.replace(/[^0-9]/g, '');
    const id = parseInt(cleanCarId, 10) || 0;

    // Get latest checklist for this carro
    const checkUnidad = ejecucionesChecklist.find((e) => e.entidadId === c.id && e.entidadTipo === 'CARRO');
    const checkEra = ejecucionesChecklist.find((e) => e.entidadId === c.id && e.entidadTipo === 'ERA');
    const checkTrauma = ejecucionesChecklist.find((e) => e.entidadId === c.id && e.entidadTipo === 'TRAUMA');

    const mapChecklist = (exec: any) => {
      if (!exec) return null;
      try {
        const resp = JSON.parse(exec.respuestasJson || '{}');
        const items = Object.values(resp);
        const totalItems = items.length;
        const itemsOk = items.filter((v) => v === 'OK' || v === true || v === 'cumple').length;
        return {
          fecha: exec.fechaRevision.toISOString(),
          totalItems,
          itemsOk,
          completo: exec.estado === 'COMPLETADO',
        };
      } catch {
        return {
          fecha: exec.fechaRevision.toISOString(),
          totalItems: null,
          itemsOk: null,
          completo: exec.estado === 'COMPLETADO',
        };
      }
    };

    return {
      id,
      nomenclatura: c.nomenclatura,
      nombre: c.nombre,
      estadoOperativo: c.estadoOperativo === 1,
      semaforo: semaforo as any,
      checklistUnidad: mapChecklist(checkUnidad),
      checklistEra: mapChecklist(checkEra),
      checklistTrauma: mapChecklist(checkTrauma),
    };
  });

  return {
    anio,
    filtros: {
      clave: claveFilter || null,
      carroId: carroIdFilter || null,
    },
    totalEmergencias,
    porcentajeResueltas,
    tiempoPromedioRespuestaMin,
    emergenciasEsteMes,
    porMes,
    porTipo,
    recientes,
    heatmapSemanas,
    alertas,
    unidadesSemaforo,
    generadoEn: new Date().toISOString(),
  };
};
