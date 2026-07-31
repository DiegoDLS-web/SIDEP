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
import { obtenerCuarteleroEnTurno } from '../../cuartel/services/asistencia-cuarteleros.service';

const DASHBOARD_CACHE_TTL_MS = 120_000;
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

  const anioActual = new Date().getFullYear();
  const mesReferencia = anio === anioActual ? currentMonth : 12;
  const inicioMesFiltrado = new Date(Date.UTC(anio, mesReferencia - 1, 1, 0, 0, 0));
  const finMesFiltrado = new Date(Date.UTC(anio, mesReferencia, 0, 23, 59, 59, 999));
  const whereClauseMes = { ...whereClause, fechaEmergencia: { gte: inicioMesFiltrado, lte: finMesFiltrado } };

  const unidadesWhere: { parte: typeof whereClause; carroId?: string } = { parte: whereClause };
  if (carroIdFilter) {
    unidadesWhere.carroId = carroIdFilter;
  }

  const carrosWhere = carroIdFilter ? { id: carroIdFilter } : {};

  // Lecturas independientes en paralelo (mayor impacto en latencia del dashboard)
  const [
    totalEmergencias,
    totalResueltas,
    unidades,
    emergenciasEsteMes,
    partesAnio,
    aniosRows,
    recientesPartes,
    carros,
    alertasInvResult,
    cuarteleroResult,
  ] = await Promise.all([
    prisma.parteEmergencia.count({ where: whereClause }),
    prisma.parteEmergencia.count({
      where: { ...whereClause, estado: { codigo: 'COMPLETADO' } },
    }),
    prisma.unidadEnEmergencia.findMany({
      where: unidadesWhere,
      select: { horaSalida: true, horaLlegada: true },
    }),
    prisma.parteEmergencia.count({ where: whereClauseMes }),
    prisma.parteEmergencia.findMany({
      where: whereClause,
      select: {
        fechaEmergencia: true,
        metadata: true,
        clave: { select: { codigo: true } },
      },
    }),
    prisma.$queryRaw<{ anio: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM p.fecha_emergencia)::int AS anio
      FROM parte_emergencia p
      INNER JOIN catalogo_estado_parte e ON e.id = p.estado_id
      WHERE e.codigo <> 'ANULADO'
      ORDER BY anio DESC
    `,
    prisma.parteEmergencia.findMany({
      where: whereClause,
      orderBy: { fechaEmergencia: 'desc' },
      take: 5,
      select: {
        id: true,
        correlativo: true,
        direccion: true,
        fechaEmergencia: true,
        metadata: true,
        clave: { select: { codigo: true, nombre: true } },
        estado: { select: { nombre: true } },
        unidades: { select: { carro: { select: { nomenclatura: true } } } },
      },
    }),
    prisma.carro.findMany({
      where: carrosWhere,
      include: {
        mantenimientos: {
          orderBy: { fechaRegistro: 'desc' },
          take: 1,
        },
      },
    }),
    obtenerAlertasInventario()
      .then((a) => ({ ok: true as const, a }))
      .catch((err) => {
        console.error('[SIDEP dashboard] alertas inventario:', err);
        return { ok: false as const, a: [] as Awaited<ReturnType<typeof obtenerAlertasInventario>> };
      }),
    obtenerCuarteleroEnTurno()
      .then((c) => ({ ok: true as const, c }))
      .catch((err) => {
        console.error('[SIDEP dashboard] cuartelero en turno:', err);
        return { ok: false as const, c: null };
      }),
  ]);

  const porcentajeResueltas =
    totalEmergencias > 0 ? Math.round((totalResueltas / totalEmergencias) * 100) : 0;

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
  const tiempoPromedioRespuestaMin =
    validRespuestaCount > 0 ? Math.round(totalRespuestaMs / (validRespuestaCount * 1000 * 60)) : 0;

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

  const aniosConDatos = aniosRows.map((r) => Number(r.anio)).filter((n) => Number.isFinite(n));

  const porTipo = Object.entries(typeGroups)
    .map(([claveEmergencia, cantidad]) => ({ claveEmergencia, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.claveEmergencia.localeCompare(b.claveEmergencia));

  const recientes = recientesPartes.map((p) => ({
    id: p.id,
    correlativo: p.correlativo,
    claveEmergencia: claveCodigoParte(p),
    direccion: p.direccion,
    fecha: p.fechaEmergencia.toISOString(),
    estado: p.estado.nombre,
    unidades: p.unidades.map((u) => u.carro.nomenclatura),
  }));

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

  const alertas: any[] = [];
  const carroIds = carros.map((c) => c.id);

  const [cambiosEstadoAuditoria, ejecucionesSemaforo] = await Promise.all([
    carroIds.length
      ? prisma.auditoriaUsuario.findMany({
          where: {
            accion: 'CAMBIAR_ESTADO_CARRO',
            resultado: 'OK',
            entidadId: { in: carroIds },
          },
          orderBy: { createdAt: 'desc' },
          select: { entidadId: true, detalle: true },
        })
      : Promise.resolve([] as Array<{ entidadId: string | null; detalle: string | null }>),
    carroIds.length
      ? prisma.checklistEjecucion.findMany({
          where: { entidadId: { in: carroIds } },
          orderBy: { fechaRevision: 'desc' },
          take: Math.max(carroIds.length * 6, 120),
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof prisma.checklistEjecucion.findMany>>),
  ]);

  const ultimoCambioEstadoPorCarro = new Map<string, { motivo: string; fechaEfectiva: string }>();
  for (const row of cambiosEstadoAuditoria) {
    if (!row.entidadId || ultimoCambioEstadoPorCarro.has(row.entidadId)) continue;
    const parsed = parsearUltimoCambioEstadoCarro(row.detalle);
    if (parsed) ultimoCambioEstadoPorCarro.set(row.entidadId, parsed);
  }

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

  for (const a of alertasInvResult.a.slice(0, 20)) {
    alertas.push({
      tipo: a.tipo,
      severidad: a.severidad,
      titulo: a.titulo,
      detalle: a.detalle,
      inventarioItemId: a.itemId ?? null,
      bodega: a.bodega ?? null,
    });
  }

  const cuarteleroEnTurno = cuarteleroResult.c;
  if (cuarteleroEnTurno && !cuarteleroEnTurno.activo) {
    alertas.unshift({
      tipo: 'cuartelero_sin_turno',
      severidad: 'advertencia',
      titulo: 'Sin cuartelero de turno',
      detalle: `No hay cuartelero marcado de turno (${cuarteleroEnTurno.tipoTurno}) para hoy ${cuarteleroEnTurno.fecha}.`,
    });
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
    cuarteleroEnTurno,
    generadoEn: new Date().toISOString(),
  };
  return payload;
};
