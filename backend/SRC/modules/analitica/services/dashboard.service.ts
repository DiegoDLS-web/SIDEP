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
import {
  detalleEstadoOficialCarro,
  parsearUltimoCambioEstadoCarro,
} from '../../../utils/carro-estado-auditoria.util';
import { obtenerAlertasInventario } from '../../logistica/services/inventario-items.service';
import {
  fechaCalendarioKey,
  inicioHeatmapDesdeFin,
  sumarDiasCalendarioKey,
} from '../../../utils/fecha-calendario.util';

const DASHBOARD_CACHE_TTL_MS = 90_000;
const dashboardCache = new Map<string, { data: unknown; expires: number }>();

/** Invalida caché del dashboard (p. ej. tras crear o editar un parte). */
export function invalidarCacheDashboard(): void {
  dashboardCache.clear();
}

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
  const cacheKey = `${anioParam ?? ''}:${claveFilter ?? ''}:${carroIdFilter ?? ''}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data as Awaited<ReturnType<typeof buildDashboardResumen>>;
  }
  const data = await buildDashboardResumen(anioParam, claveFilter, carroIdFilter);
  dashboardCache.set(cacheKey, { data, expires: Date.now() + DASHBOARD_CACHE_TTL_MS });
  return data;
};

const buildDashboardResumen = async (anioParam?: number, claveFilter?: string, carroIdFilter?: string) => {
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

  // 2. Porcentaje resueltas (COMPLETADO; no usar estadoId numérico: PENDIENTE=2, COMPLETADO=3)
  const totalResueltas = await prisma.parteEmergencia.count({
    where: { ...whereClause, estado: { codigo: 'COMPLETADO' } },
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

  // 5–6 y heatmap: una sola lectura de fechas/claves del año filtrado
  const partesAnio = await prisma.parteEmergencia.findMany({
    where: whereClause,
    select: {
      fechaEmergencia: true,
      metadata: true,
      clave: { select: { codigo: true } },
    },
  });

  const monthGroups: Record<string, number> = {};
  const typeGroups: Record<string, number> = {};
  const conteoPorDia: Record<string, number> = {};
  const SEMANAS = 4;
  const finHeatmapKey =
    anio === anioActual ? fechaCalendarioKey(new Date()) : `${anio}-12-31`;
  const inicioHeatmapKey = inicioHeatmapDesdeFin(finHeatmapKey, SEMANAS);

  for (const p of partesAnio) {
    const d = p.fechaEmergencia;
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthGroups[period] = (monthGroups[period] || 0) + 1;
    const code = claveCodigoParte(p);
    typeGroups[code] = (typeGroups[code] || 0) + 1;
    const key = fechaCalendarioKey(d);
    if (key >= inicioHeatmapKey && key <= finHeatmapKey) {
      conteoPorDia[key] = (conteoPorDia[key] || 0) + 1;
    }
  }
  const porMes = Object.entries(monthGroups)
    .map(([periodo, cantidad]) => ({ periodo, cantidad }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));

  const aniosConDatos = [
    ...new Set(
      (
        await prisma.parteEmergencia.findMany({
          where: parteWhereNoAnulado(),
          select: { fechaEmergencia: true },
          take: 5000,
        })
      ).map((p) => p.fechaEmergencia.getFullYear()),
    ),
  ].sort((a, b) => b - a);

  const porTipo = Object.entries(typeGroups)
    .map(([claveEmergencia, cantidad]) => ({ claveEmergencia, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.claveEmergencia.localeCompare(b.claveEmergencia));

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

  // Heatmap: últimas 4 semanas (calendario America/Santiago)
  const heatmapSemanas: number[][] = [];
  for (let w = 0; w < SEMANAS; w++) {
    const semana: number[] = [];
    for (let d = 0; d < 7; d++) {
      const offset = w * 7 + d;
      const key = sumarDiasCalendarioKey(inicioHeatmapKey, offset);
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

  const cambiosEstadoAuditoria = await prisma.auditoriaUsuario.findMany({
    where: {
      accion: 'CAMBIAR_ESTADO_CARRO',
      resultado: 'OK',
      entidadId: { in: carros.map((c) => c.id) },
    },
    orderBy: { createdAt: 'desc' },
    select: { entidadId: true, detalle: true },
  });
  const ultimoCambioEstadoPorCarro = new Map<string, { motivo: string; fechaEfectiva: string }>();
  for (const row of cambiosEstadoAuditoria) {
    if (!row.entidadId || ultimoCambioEstadoPorCarro.has(row.entidadId)) continue;
    const parsed = parsearUltimoCambioEstadoCarro(row.detalle);
    if (parsed) ultimoCambioEstadoPorCarro.set(row.entidadId, parsed);
  }

  const carroIds = carros.map((c) => c.id);
  const ejecucionesSemaforo = await prisma.checklistEjecucion.findMany({
    where: { entidadId: { in: carroIds } },
    orderBy: { fechaRevision: 'desc' },
    take: Math.max(carroIds.length * 6, 120),
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

    const ultimoCambioEstado = ultimoCambioEstadoPorCarro.get(c.id);

    if (semaforo === 'fuera_servicio') {
      let detalleCriticos: string;
      if (c.estadoOperativo === 0) {
        detalleCriticos = detalleEstadoOficialCarro(
          ultimoCambioEstado,
          `${c.nomenclatura} fuera de servicio por decisión oficial.`,
        );
      } else if (evaluacionUnidad?.itemsCriticos) {
        detalleCriticos = `Faltan ${evaluacionUnidad.itemsCriticos} material(es) crítico(s) según el último checklist.`;
      } else {
        detalleCriticos = `El carro ${c.nombre} está marcado como no operativo.`;
      }
      alertas.push({
        tipo: 'carro_fuera_servicio',
        severidad: 'critico',
        titulo: `Unidad ${c.nomenclatura} Fuera de Servicio`,
        detalle: detalleCriticos,
        carroId: carroIdNum,
        nomenclatura: c.nomenclatura,
      });
    } else if (c.estadoOperativo === 2) {
      alertas.push({
        tipo: 'mantencion_manual',
        severidad: 'advertencia',
        titulo: `Unidad ${c.nomenclatura} en mantención`,
        detalle: detalleEstadoOficialCarro(
          ultimoCambioEstado,
          `${c.nomenclatura} en mantención (decisión oficial).`,
        ),
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

  try {
    const alertasInv = await obtenerAlertasInventario();
    for (const a of alertasInv.slice(0, 20)) {
      alertas.push({
        tipo: a.tipo,
        severidad: a.severidad,
        titulo: a.titulo,
        detalle: a.detalle,
        inventarioItemId: a.itemId ?? null,
        bodega: a.bodega ?? null,
      });
    }
  } catch (err) {
    console.error('[SIDEP dashboard] alertas inventario:', err);
  }

  const payload = {
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
  return payload;
};
