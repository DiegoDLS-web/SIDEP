"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.esChecklistBorrador = esChecklistBorrador;
exports.contarItemsBolsoTrauma = contarItemsBolsoTrauma;
exports.analizarMaterialesChecklist = analizarMaterialesChecklist;
exports.evaluarEstadoOperativoDesdeChecklist = evaluarEstadoOperativoDesdeChecklist;
exports.contarItemsDesdeRespuestas = contarItemsDesdeRespuestas;
exports.resolverSemaforoDesdeChecklist = resolverSemaforoDesdeChecklist;
exports.resolverSemaforoUnidad = resolverSemaforoUnidad;
exports.evaluarSemaforoMantenimiento = evaluarSemaforoMantenimiento;
exports.combinarSemaforos = combinarSemaforos;
function parseRespuestas(data) {
    if (data == null)
        return null;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : null;
        }
        catch {
            return null;
        }
    }
    if (typeof data === 'object' && !Array.isArray(data)) {
        return data;
    }
    return null;
}
function esChecklistBorrador(data) {
    const obj = parseRespuestas(data);
    return obj?.['borrador'] === true;
}
function estadoMaterial(m) {
    const req = Math.max(0, Number(m.cantidadRequerida ?? m.cantidadMinima ?? 0));
    const act = Math.max(0, Number(m.cantidadActual ?? 0));
    if (act >= req)
        return 'OK';
    if (act <= 0)
        return 'CRITICO';
    return 'BAJO';
}
/** Conteo por bolso de trauma (estructura `bolsos[]` + `bolsoNumero`). */
function contarItemsBolsoTrauma(data) {
    const obj = parseRespuestas(data);
    if (!obj)
        return null;
    const bolsos = obj['bolsos'];
    if (!Array.isArray(bolsos) || bolsos.length === 0)
        return null;
    const bolsoNumRaw = obj['bolsoNumero'];
    let bolsoNum = 1;
    if (typeof bolsoNumRaw === 'number' && Number.isFinite(bolsoNumRaw) && bolsoNumRaw > 0) {
        bolsoNum = bolsoNumRaw;
    }
    else if (typeof bolsoNumRaw === 'string' && bolsoNumRaw.trim()) {
        const n = Number(bolsoNumRaw);
        if (Number.isFinite(n) && n > 0)
            bolsoNum = n;
    }
    const bolso = bolsos.find((b) => Number(b?.numero ?? 0) === bolsoNum) ?? bolsos[0];
    if (!bolso?.ubicaciones)
        return null;
    let totalItems = 0;
    let itemsOk = 0;
    for (const u of bolso.ubicaciones) {
        for (const m of u.materiales ?? []) {
            if (!m?.nombre?.trim())
                continue;
            totalItems += 1;
            if (estadoMaterial(m) === 'OK')
                itemsOk += 1;
        }
    }
    return totalItems > 0 ? { totalItems, itemsOk } : null;
}
/** Analiza ubicaciones/materiales del checklist de unidad (misma lógica que el frontend). */
function analizarMaterialesChecklist(data) {
    const obj = parseRespuestas(data);
    if (!obj)
        return null;
    const ubicaciones = obj['ubicaciones'];
    if (!Array.isArray(ubicaciones))
        return null;
    let totalItems = 0;
    let itemsOk = 0;
    let itemsCriticos = 0;
    let itemsBajo = 0;
    for (const ubicacion of ubicaciones) {
        if (!ubicacion || typeof ubicacion !== 'object')
            continue;
        const materiales = ubicacion.materiales ?? [];
        for (const m of materiales) {
            if (!m?.nombre?.trim())
                continue;
            totalItems += 1;
            const estado = estadoMaterial(m);
            if (estado === 'OK')
                itemsOk += 1;
            else if (estado === 'CRITICO')
                itemsCriticos += 1;
            else
                itemsBajo += 1;
        }
    }
    if (totalItems === 0)
        return null;
    return {
        totalItems,
        itemsOk,
        itemsCriticos,
        itemsBajo,
        porcentajeCompleto: Math.round((itemsOk / totalItems) * 100),
    };
}
/** Deriva semáforo y estado operativo a partir del checklist de unidad. */
function evaluarEstadoOperativoDesdeChecklist(data) {
    const analisis = analizarMaterialesChecklist(data);
    if (!analisis)
        return null;
    let semaforo;
    let estadoOperativo;
    if (analisis.itemsCriticos > 0) {
        semaforo = 'fuera_servicio';
        estadoOperativo = 0;
    }
    else if (analisis.itemsOk < analisis.totalItems) {
        semaforo = 'mantencion';
        estadoOperativo = 0;
    }
    else {
        semaforo = 'operativa';
        estadoOperativo = 1;
    }
    return {
        ...analisis,
        semaforo,
        estadoOperativo,
        completo: analisis.itemsOk >= analisis.totalItems,
    };
}
/** Conteo genérico para dashboard (unidad, ERA, trauma, arrays legacy). */
function contarItemsDesdeRespuestas(raw) {
    if (!raw)
        return null;
    let data;
    try {
        data = JSON.parse(raw);
    }
    catch {
        return null;
    }
    const unidad = analizarMaterialesChecklist(data);
    if (unidad) {
        return { totalItems: unidad.totalItems, itemsOk: unidad.itemsOk };
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const obj = data;
        if (Array.isArray(obj['equipos']) || Array.isArray(obj['cilindrosRecambio'])) {
            const equipos = obj['equipos'] ?? [];
            const recambios = obj['cilindrosRecambio'] ?? [];
            const items = [...equipos, ...recambios];
            const totalItems = items.length;
            const itemsOk = items.filter((it) => {
                const row = it;
                return row?.arnesCondicion === 'Operativo' || row?.condicionGeneral === 'Operativo';
            }).length;
            return totalItems > 0 ? { totalItems, itemsOk } : null;
        }
        const trauma = contarItemsBolsoTrauma(obj);
        if (trauma)
            return trauma;
        if (typeof obj['totalItems'] === 'number') {
            return {
                totalItems: Number(obj['totalItems']),
                itemsOk: Number(obj['itemsOk'] ?? 0),
            };
        }
    }
    if (Array.isArray(data)) {
        const totalItems = data.length;
        const itemsOk = data.filter((m) => m?.ok || m?.estado === 'OK').length;
        return totalItems > 0 ? { totalItems, itemsOk } : null;
    }
    return null;
}
function resolverSemaforoDesdeChecklist(respuestasChecklist) {
    if (!respuestasChecklist || esChecklistBorrador(respuestasChecklist))
        return null;
    const evaluacionUnidad = evaluarEstadoOperativoDesdeChecklist(respuestasChecklist);
    if (evaluacionUnidad)
        return evaluacionUnidad.semaforo;
    const conteo = contarItemsDesdeRespuestas(respuestasChecklist);
    if (!conteo || conteo.totalItems === 0)
        return null;
    if (conteo.itemsOk >= conteo.totalItems)
        return 'operativa';
    if (conteo.itemsOk === 0)
        return 'fuera_servicio';
    return 'mantencion';
}
function semaforoDesdeEstadoOperativoDb(estadoOperativoDb) {
    if (estadoOperativoDb === 0)
        return 'fuera_servicio';
    if (estadoOperativoDb === 2)
        return 'mantencion';
    return null;
}
function resolverSemaforoUnidad(estadoOperativoDb, respuestasChecklist) {
    const manualDb = semaforoDesdeEstadoOperativoDb(estadoOperativoDb);
    const desdeChecklist = resolverSemaforoDesdeChecklist(respuestasChecklist);
    if (desdeChecklist) {
        return combinarSemaforos(desdeChecklist, manualDb);
    }
    if (manualDb)
        return manualDb;
    return 'operativa';
}
function evaluarSemaforoMantenimiento(fechas) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    for (const raw of [fechas.proximoMantenimiento, fechas.proximaRevisionTecnica]) {
        if (!raw)
            continue;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime()))
            continue;
        d.setHours(0, 0, 0, 0);
        if (d < hoy)
            return 'mantencion';
    }
    return null;
}
const PESO_SEMAFORO = {
    operativa: 1,
    mantencion: 2,
    fuera_servicio: 3,
};
/** Toma el semáforo más restrictivo (fuera_servicio > mantencion > operativa). */
function combinarSemaforos(...valores) {
    let peor = 'operativa';
    for (const s of valores) {
        if (s && PESO_SEMAFORO[s] > PESO_SEMAFORO[peor]) {
            peor = s;
        }
    }
    return peor;
}
