import prisma from '../../../prisma';
import { parteWhereNoAnulado } from '../../operaciones/partes-where';
import {
  combinarSemaforos,
  contarItemsDesdeRespuestas,
  esChecklistBorrador,
  evaluarEstadoOperativoDesdeChecklist,
  evaluarSemaforoMantenimiento,
  resolverSemaforoDesdeChecklist,
  resolverSemaforoUnidad,
} from '../../../utils/checklist-estado-operativo.util';

function parseMetadataParte(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function claveCodigoParte(p: {
  clave?: { codigo: string } | null;
  metadata: string | null;
}): string {
  const meta = parseMetadataParte(p.metadata);
  const metaClave =
    typeof meta?.['claveEmergencia'] === 'string' ? String(meta['claveEmergencia']).trim() : '';
  return metaClave || p.clave?.codigo || 'SIN_CLAVE';
}

export const getDashboardResumen = async (anioParam?: number, claveFilter?: string, carroIdFilter?: string) => {
  const anio = anioParam || new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const inicioAnio = new Date(Date.UTC(anio, 0, 1, 0, 0, 0));
  const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));

  // Build filter criteria
  const whereClause = parteWhereNoAnulado({
    fechaEmergencia: { gte: inicioAnio, lte: finAnio },
  });

  if (claveFilter && claveFilter !== 'todos') {
    whereClause.OR = [
      { clave: { codigo: claveFilter } },
      { metadata: { contains: `"claveEmergencia":"${claveFilter}"` } },
      { metadata: { contains: `"claveEmergencia": "${claveFilter}"` } },
    ];
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
  const unidadesWhere: { parte: typeof whereClause; carroId?: string } = { parte: whereClause };
  if (carroIdFilter) {
    unidadesWhere.carroId = carroIdFilter;
  }
  const unidades = await prisma.unidadEnEmergencia.findMany({
    where: unidadesWhere,
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
  const anioActual = new Date().getFullYear();
  const mesReferencia = anio === anioActual ? currentMonth : 12;
  const inicioMesFiltrado = new Date(Date.UTC(anio, mesReferencia - 1, 1, 0, 0, 0));
  const finMesFiltrado = new Date(Date.UTC(anio, mesReferencia, 0, 23, 59, 59, 999));
  const whereClauseMes = { ...whereClause, fechaEmergencia: { gte: inicioMesFiltrado, lte: finMesFiltrado } };
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
    where: parteWhereNoAnulado(),
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
    const code = claveCodigoParte(p);
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
    claveEmergencia: claveCodigoParte(p),
    direccion: p.direccion,
    fecha: p.fechaEmergencia.toISOString(),
    estado: p.estado.nombre,
    unidades: p.unidades.map((u) => u.carro.nomenclatura),
  }));

  // Heatmap: últimas 4 semanas respecto al año filtrado (fin de año si es pasado)
  const SEMANAS = 4;
  const hoyReal = new Date();
  const finHeatmap =
    anio === anioActual
      ? new Date(hoyReal.getFullYear(), hoyReal.getMonth(), hoyReal.getDate(), 23, 59, 59, 999)
      : new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));
  const inicioHeatmap = new Date(finHeatmap);
  inicioHeatmap.setHours(0, 0, 0, 0);
  const diaSemana = inicioHeatmap.getDay();
  const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  inicioHeatmap.setDate(inicioHeatmap.getDate() - diasHastaLunes - (SEMANAS - 1) * 7);

  const partesHeatmap = await prisma.parteEmergencia.findMany({
    where: whereClause,
    select: { fechaEmergencia: true },
  });
  const conteoPorDia: Record<string, number> = {};
  for (const p of partesHeatmap) {
    const fecha = p.fechaEmergencia;
    if (fecha < inicioHeatmap || fecha > finHeatmap) continue;
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

  // 9–10. Alertas y semáforo de unidades (checklist + estado en BD)
  const alertas: any[] = [];
  const carrosTodos = await prisma.carro.findMany({
    include: {
      mantenimientos: {
        orderBy: { fechaRegistro: 'desc' },
        take: 1,
      },
    },
  });
  const carros = carroIdFilter ? carrosTodos.filter((c) => c.id === carroIdFilter) : carrosTodos;

  const ejecucionesSemaforo = await prisma.checklistEjecucion.findMany({
    orderBy: { fechaRevision: 'desc' },
  });

  const ultimaEjecucionPorCarroTipo = new Map<string, (typeof ejecucionesSemaforo)[number]>();
  for (const exec of ejecucionesSemaforo) {
    if (esChecklistBorrador(exec.respuestasJson) || exec.estado === 'BORRADOR') continue;
    const key = `${exec.entidadId}::${exec.entidadTipo}`;
    if (!ultimaEjecucionPorCarroTipo.has(key)) {
      ultimaEjecucionPorCarroTipo.set(key, exec);
    }
  }

  const mapChecklist = (exec: (typeof ejecucionesSemaforo)[number] | undefined) => {
    if (!exec) return null;
    const fuente = exec.respuestasJson;
    const conteo = contarItemsDesdeRespuestas(fuente);
    const evaluacion = evaluarEstadoOperativoDesdeChecklist(fuente);
    return {
      fecha: exec.fechaRevision.toISOString(),
      totalItems: conteo?.totalItems ?? null,
      itemsOk: conteo?.itemsOk ?? null,
      itemsCriticos: evaluacion?.itemsCriticos ?? null,
      porcentajeCompleto: evaluacion?.porcentajeCompleto ?? null,
      completo: exec.estado === 'COMPLETADO' && (conteo ? conteo.itemsOk >= conteo.totalItems : false),
    };
  };

  const unidadesSemaforo = carros.map((c) => {
    const checkUnidad =
      ultimaEjecucionPorCarroTipo.get(`${c.id}::CARRO`) ??
      ultimaEjecucionPorCarroTipo.get(`${c.id}::UNIDAD`);
    const checkEra = ultimaEjecucionPorCarroTipo.get(`${c.id}::ERA`);
    const checkTrauma = ultimaEjecucionPorCarroTipo.get(`${c.id}::TRAUMA`);

    const semaforoChecklist = combinarSemaforos(
      resolverSemaforoUnidad(c.estadoOperativo, checkUnidad?.respuestasJson),
      resolverSemaforoDesdeChecklist(checkEra?.respuestasJson),
      resolverSemaforoDesdeChecklist(checkTrauma?.respuestasJson),
    );
    const mant = c.mantenimientos[0];
    const semaforoMantenimiento = evaluarSemaforoMantenimiento({
      proximoMantenimiento: mant?.fechaProximoMantenimiento ?? null,
      proximaRevisionTecnica: mant?.fechaProximaRevTecnica ?? null,
    });
    const semaforo = combinarSemaforos(semaforoChecklist, semaforoMantenimiento);
    const evaluacionUnidad = checkUnidad
      ? evaluarEstadoOperativoDesdeChecklist(checkUnidad.respuestasJson)
      : null;

    const cleanCarId = c.id.replace(/[^0-9]/g, '');
    const carroIdNum = parseInt(cleanCarId, 10) || 0;

    if (semaforo === 'fuera_servicio') {
      const detalleCriticos = evaluacionUnidad?.itemsCriticos
        ? `Faltan ${evaluacionUnidad.itemsCriticos} material(es) crítico(s) según el último checklist.`
        : `El carro ${c.nombre} está marcado como no operativo.`;
      alertas.push({
        tipo: 'carro_fuera_servicio',
        severidad: 'critico',
        titulo: `Unidad ${c.nomenclatura} Fuera de Servicio`,
        detalle: detalleCriticos,
        carroId: carroIdNum,
        nomenclatura: c.nomenclatura,
      });
    } else if (semaforoMantenimiento === 'mantencion') {
      alertas.push({
        tipo: 'mantenimiento_vencido',
        severidad: 'advertencia',
        titulo: `Unidad ${c.nomenclatura} con mantención o revisión vencida`,
        detalle: `Revise fechas de mantención o revisión técnica del carro ${c.nombre}.`,
        carroId: carroIdNum,
        nomenclatura: c.nomenclatura,
      });
    } else if (semaforo === 'mantencion' && evaluacionUnidad) {
      alertas.push({
        tipo: 'inventario_incompleto',
        severidad: 'advertencia',
        titulo: `Unidad ${c.nomenclatura} con inventario incompleto`,
        detalle: `Checklist al ${evaluacionUnidad.porcentajeCompleto}% (${evaluacionUnidad.itemsOk}/${evaluacionUnidad.totalItems} ítems OK).`,
        carroId: carroIdNum,
        nomenclatura: c.nomenclatura,
      });
    }

    return {
      id: c.id,
      nomenclatura: c.nomenclatura,
      nombre: c.nombre,
      estadoOperativo: semaforo === 'operativa',
      semaforo: semaforo as 'operativa' | 'mantencion' | 'fuera_servicio',
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
