"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardResumen = void 0;
const prisma_1 = __importDefault(require("../../../prisma"));
const partes_where_1 = require("../../operaciones/partes-where");
const checklist_estado_operativo_util_1 = require("../../../utils/checklist-estado-operativo.util");
const carro_estado_auditoria_util_1 = require("../../../utils/carro-estado-auditoria.util");
function parseMetadataParte(raw) {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    }
    catch {
        return null;
    }
}
function claveCodigoParte(p) {
    const meta = parseMetadataParte(p.metadata);
    const metaClave = typeof meta?.['claveEmergencia'] === 'string' ? String(meta['claveEmergencia']).trim() : '';
    return metaClave || p.clave?.codigo || 'SIN_CLAVE';
}
const getDashboardResumen = async (anioParam, claveFilter, carroIdFilter) => {
    const anio = anioParam || new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const inicioAnio = new Date(Date.UTC(anio, 0, 1, 0, 0, 0));
    const finAnio = new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));
    // Build filter criteria
    const whereClause = (0, partes_where_1.parteWhereNoAnulado)({
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
    const totalEmergencias = await prisma_1.default.parteEmergencia.count({ where: whereClause });
    // 2. Porcentaje resueltas (COMPLETADO; no usar estadoId numérico: PENDIENTE=2, COMPLETADO=3)
    const totalResueltas = await prisma_1.default.parteEmergencia.count({
        where: { ...whereClause, estado: { codigo: 'COMPLETADO' } },
    });
    const porcentajeResueltas = totalEmergencias > 0 ? Math.round((totalResueltas / totalEmergencias) * 100) : 0;
    // 3. Tiempo Promedio Respuesta
    const unidadesWhere = { parte: whereClause };
    if (carroIdFilter) {
        unidadesWhere.carroId = carroIdFilter;
    }
    const unidades = await prisma_1.default.unidadEnEmergencia.findMany({
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
    const emergenciasEsteMes = await prisma_1.default.parteEmergencia.count({ where: whereClauseMes });
    // 5. porMes
    const allPartes = await prisma_1.default.parteEmergencia.findMany({
        where: whereClause,
        select: { fechaEmergencia: true },
    });
    const monthGroups = {};
    for (const p of allPartes) {
        const d = p.fechaEmergencia;
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthGroups[period] = (monthGroups[period] || 0) + 1;
    }
    const porMes = Object.entries(monthGroups)
        .map(([periodo, cantidad]) => ({ periodo, cantidad }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo));
    const partesParaAnios = await prisma_1.default.parteEmergencia.findMany({
        where: (0, partes_where_1.parteWhereNoAnulado)(),
        select: { fechaEmergencia: true },
    });
    const aniosConDatos = [...new Set(partesParaAnios.map((p) => p.fechaEmergencia.getFullYear()))].sort((a, b) => b - a);
    // 6. porTipo
    const partesConClave = await prisma_1.default.parteEmergencia.findMany({
        where: whereClause,
        include: { clave: true },
    });
    const typeGroups = {};
    for (const p of partesConClave) {
        const code = claveCodigoParte(p);
        typeGroups[code] = (typeGroups[code] || 0) + 1;
    }
    const porTipo = Object.entries(typeGroups)
        .map(([claveEmergencia, cantidad]) => ({ claveEmergencia, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad || a.claveEmergencia.localeCompare(b.claveEmergencia));
    // 7. Recientes
    const recientesPartes = await prisma_1.default.parteEmergencia.findMany({
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
    const finHeatmap = anio === anioActual
        ? new Date(hoyReal.getFullYear(), hoyReal.getMonth(), hoyReal.getDate(), 23, 59, 59, 999)
        : new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999));
    const inicioHeatmap = new Date(finHeatmap);
    inicioHeatmap.setHours(0, 0, 0, 0);
    const diaSemana = inicioHeatmap.getDay();
    const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    inicioHeatmap.setDate(inicioHeatmap.getDate() - diasHastaLunes - (SEMANAS - 1) * 7);
    const partesHeatmap = await prisma_1.default.parteEmergencia.findMany({
        where: whereClause,
        select: { fechaEmergencia: true },
    });
    const conteoPorDia = {};
    for (const p of partesHeatmap) {
        const fecha = p.fechaEmergencia;
        if (fecha < inicioHeatmap || fecha > finHeatmap)
            continue;
        const key = fecha.toISOString().slice(0, 10);
        conteoPorDia[key] = (conteoPorDia[key] || 0) + 1;
    }
    const heatmapSemanas = [];
    for (let w = 0; w < SEMANAS; w++) {
        const semana = [];
        for (let d = 0; d < 7; d++) {
            const celda = new Date(inicioHeatmap);
            celda.setDate(inicioHeatmap.getDate() + w * 7 + d);
            const key = celda.toISOString().slice(0, 10);
            semana.push(conteoPorDia[key] || 0);
        }
        heatmapSemanas.push(semana);
    }
    // 9–10. Alertas y semáforo de unidades (checklist + estado en BD)
    const alertas = [];
    const carrosTodos = await prisma_1.default.carro.findMany({
        include: {
            mantenimientos: {
                orderBy: { fechaRegistro: 'desc' },
                take: 1,
            },
        },
    });
    const carros = carroIdFilter ? carrosTodos.filter((c) => c.id === carroIdFilter) : carrosTodos;
    const cambiosEstadoAuditoria = await prisma_1.default.auditoriaUsuario.findMany({
        where: {
            accion: 'CAMBIAR_ESTADO_CARRO',
            resultado: 'OK',
            entidadId: { in: carros.map((c) => c.id) },
        },
        orderBy: { createdAt: 'desc' },
        select: { entidadId: true, detalle: true },
    });
    const ultimoCambioEstadoPorCarro = new Map();
    for (const row of cambiosEstadoAuditoria) {
        if (!row.entidadId || ultimoCambioEstadoPorCarro.has(row.entidadId))
            continue;
        const parsed = (0, carro_estado_auditoria_util_1.parsearUltimoCambioEstadoCarro)(row.detalle);
        if (parsed)
            ultimoCambioEstadoPorCarro.set(row.entidadId, parsed);
    }
    const ejecucionesSemaforo = await prisma_1.default.checklistEjecucion.findMany({
        orderBy: { fechaRevision: 'desc' },
    });
    const ultimaEjecucionPorCarroTipo = new Map();
    for (const exec of ejecucionesSemaforo) {
        if ((0, checklist_estado_operativo_util_1.esChecklistBorrador)(exec.respuestasJson) || exec.estado === 'BORRADOR')
            continue;
        const key = `${exec.entidadId}::${exec.entidadTipo}`;
        if (!ultimaEjecucionPorCarroTipo.has(key)) {
            ultimaEjecucionPorCarroTipo.set(key, exec);
        }
    }
    const mapChecklist = (exec) => {
        if (!exec)
            return null;
        const fuente = exec.respuestasJson;
        const conteo = (0, checklist_estado_operativo_util_1.contarItemsDesdeRespuestas)(fuente);
        const evaluacion = (0, checklist_estado_operativo_util_1.evaluarEstadoOperativoDesdeChecklist)(fuente);
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
        const checkUnidad = ultimaEjecucionPorCarroTipo.get(`${c.id}::CARRO`) ??
            ultimaEjecucionPorCarroTipo.get(`${c.id}::UNIDAD`);
        const checkEra = ultimaEjecucionPorCarroTipo.get(`${c.id}::ERA`);
        const checkTrauma = ultimaEjecucionPorCarroTipo.get(`${c.id}::TRAUMA`);
        const semaforoChecklist = (0, checklist_estado_operativo_util_1.combinarSemaforos)((0, checklist_estado_operativo_util_1.resolverSemaforoUnidad)(c.estadoOperativo, checkUnidad?.respuestasJson), (0, checklist_estado_operativo_util_1.resolverSemaforoDesdeChecklist)(checkEra?.respuestasJson), (0, checklist_estado_operativo_util_1.resolverSemaforoDesdeChecklist)(checkTrauma?.respuestasJson));
        const mant = c.mantenimientos[0];
        const semaforoMantenimiento = (0, checklist_estado_operativo_util_1.evaluarSemaforoMantenimiento)({
            proximoMantenimiento: mant?.fechaProximoMantenimiento ?? null,
            proximaRevisionTecnica: mant?.fechaProximaRevTecnica ?? null,
        });
        const semaforo = (0, checklist_estado_operativo_util_1.combinarSemaforos)(semaforoChecklist, semaforoMantenimiento);
        const evaluacionUnidad = checkUnidad
            ? (0, checklist_estado_operativo_util_1.evaluarEstadoOperativoDesdeChecklist)(checkUnidad.respuestasJson)
            : null;
        const cleanCarId = c.id.replace(/[^0-9]/g, '');
        const carroIdNum = parseInt(cleanCarId, 10) || 0;
        const ultimoCambioEstado = ultimoCambioEstadoPorCarro.get(c.id);
        if (semaforo === 'fuera_servicio') {
            let detalleCriticos;
            if (c.estadoOperativo === 0) {
                detalleCriticos = (0, carro_estado_auditoria_util_1.detalleEstadoOficialCarro)(ultimoCambioEstado, `${c.nomenclatura} fuera de servicio por decisión oficial.`);
            }
            else if (evaluacionUnidad?.itemsCriticos) {
                detalleCriticos = `Faltan ${evaluacionUnidad.itemsCriticos} material(es) crítico(s) según el último checklist.`;
            }
            else {
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
        }
        else if (c.estadoOperativo === 2) {
            alertas.push({
                tipo: 'mantencion_manual',
                severidad: 'advertencia',
                titulo: `Unidad ${c.nomenclatura} en mantención`,
                detalle: (0, carro_estado_auditoria_util_1.detalleEstadoOficialCarro)(ultimoCambioEstado, `${c.nomenclatura} en mantención (decisión oficial).`),
                carroId: carroIdNum,
                nomenclatura: c.nomenclatura,
            });
        }
        else if (semaforoMantenimiento === 'mantencion') {
            alertas.push({
                tipo: 'mantenimiento_vencido',
                severidad: 'advertencia',
                titulo: `Unidad ${c.nomenclatura} con mantención o revisión vencida`,
                detalle: `Revise fechas de mantención o revisión técnica del carro ${c.nombre}.`,
                carroId: carroIdNum,
                nomenclatura: c.nomenclatura,
            });
        }
        else if (semaforo === 'mantencion' && evaluacionUnidad) {
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
            semaforo: semaforo,
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
exports.getDashboardResumen = getDashboardResumen;
