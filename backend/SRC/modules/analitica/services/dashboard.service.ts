import prisma from '../../../prisma';

function contarItemsDesdeRespuestas(raw: string | null | undefined): { totalItems: number; itemsOk: number } | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj['equipos']) || Array.isArray(obj['cilindrosRecambio'])) {
      const equipos = (obj['equipos'] as unknown[]) ?? [];
      const recambios = (obj['cilindrosRecambio'] as unknown[]) ?? [];
      const items = [...equipos, ...recambios];
      const totalItems = items.length;
      const itemsOk = items.filter((it: any) =>
        it?.arnesCondicion === 'Operativo' || it?.condicionGeneral === 'Operativo',
      ).length;
      return totalItems > 0 ? { totalItems, itemsOk } : null;
    }

    if (Array.isArray(obj['ubicaciones'])) {
      const ubicaciones = obj['ubicaciones'] as Array<{
        materiales?: Array<{ cantidadActual?: number; cantidadRequerida?: number; nombre?: string }>;
      }>;
      let totalItems = 0;
      let itemsOk = 0;
      for (const u of ubicaciones) {
        for (const m of u.materiales ?? []) {
          const req = Math.max(0, Number(m.cantidadRequerida ?? 0));
          const act = Math.max(0, Number(m.cantidadActual ?? 0));
          if (!m.nombre?.trim()) continue;
          totalItems += 1;
          if (req > 0 && act >= req) itemsOk += 1;
        }
      }
      return totalItems > 0 ? { totalItems, itemsOk } : null;
    }

    if (typeof obj['totalItems'] === 'number') {
      return {
        totalItems: Number(obj['totalItems']),
        itemsOk: Number(obj['itemsOk'] ?? 0),
      };
    }
  }

  if (Array.isArray(data)) {
    const totalItems = data.length;
    const itemsOk = data.filter((m: any) => m?.ok || m?.estado === 'OK').length;
    return totalItems > 0 ? { totalItems, itemsOk } : null;
  }

  return null;
}

export const getDashboardResumen = async (anioParam?: number, claveFilter?: string, carroIdFilter?: string) => {
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
        carroId: carroIdFilter,
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
  const porMes = Object.entries(monthGroups)
    .map(([periodo, cantidad]) => ({ periodo, cantidad }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  const partesParaAnios = await prisma.parteEmergencia.findMany({
    where: { estadoId: { not: 3 } },
    select: { fechaEmergencia: true },
  });
  const aniosConDatos = [...new Set(partesParaAnios.map((p) => p.fechaEmergencia.getFullYear()))].sort((a, b) => b - a);

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
      fechaRevision: { gte: inicioAnio, lte: finAnio },
    },
    orderBy: { fechaRevision: 'desc' },
  });

  const ultimaEjecucionPorCarroTipo = new Map<string, (typeof ejecucionesChecklist)[number]>();
  for (const exec of ejecucionesChecklist) {
    const key = `${exec.entidadId}::${exec.entidadTipo}`;
    if (!ultimaEjecucionPorCarroTipo.has(key)) {
      ultimaEjecucionPorCarroTipo.set(key, exec);
    }
  }

  const unidadesSemaforo = carros.map((c) => {
    const semaforo = c.estadoOperativo === 1 ? 'operativa' : 'fuera_servicio';

    const mapChecklist = (exec: (typeof ejecucionesChecklist)[number] | undefined) => {
      if (!exec) return null;
      const conteo = contarItemsDesdeRespuestas(exec.respuestasJson);
      return {
        fecha: exec.fechaRevision.toISOString(),
        totalItems: conteo?.totalItems ?? null,
        itemsOk: conteo?.itemsOk ?? null,
        completo: exec.estado === 'COMPLETADO' && (conteo ? conteo.itemsOk >= conteo.totalItems : false),
      };
    };

    const checkUnidad =
      ultimaEjecucionPorCarroTipo.get(`${c.id}::CARRO`) ??
      ultimaEjecucionPorCarroTipo.get(`${c.id}::UNIDAD`);
    const checkEra = ultimaEjecucionPorCarroTipo.get(`${c.id}::ERA`);
    const checkTrauma = ultimaEjecucionPorCarroTipo.get(`${c.id}::TRAUMA`);

    return {
      id: c.id,
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
    aniosConDatos,
    alertas,
    unidadesSemaforo,
    generadoEn: new Date().toISOString(),
  };
};
