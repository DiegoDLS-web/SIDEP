export type SemaforoUnidad = 'operativa' | 'mantencion' | 'fuera_servicio';

export interface AnalisisChecklistMateriales {
  totalItems: number;
  itemsOk: number;
  itemsCriticos: number;
  itemsBajo: number;
  porcentajeCompleto: number;
}

export interface EvaluacionEstadoOperativo extends AnalisisChecklistMateriales {
  semaforo: SemaforoUnidad;
  estadoOperativo: 0 | 1;
  completo: boolean;
}

type MaterialChecklist = {
  nombre?: string;
  cantidadActual?: number;
  cantidadRequerida?: number;
};

function parseRespuestas(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

export function esChecklistBorrador(data: unknown): boolean {
  const obj = parseRespuestas(data);
  return obj?.['borrador'] === true;
}

function estadoMaterial(m: MaterialChecklist): 'OK' | 'BAJO' | 'CRITICO' {
  const req = Math.max(0, Number(m.cantidadRequerida ?? 0));
  const act = Math.max(0, Number(m.cantidadActual ?? 0));
  if (act >= req) return 'OK';
  if (act <= 0) return 'CRITICO';
  return 'BAJO';
}

/** Analiza ubicaciones/materiales del checklist de unidad (misma lógica que el frontend). */
export function analizarMaterialesChecklist(data: unknown): AnalisisChecklistMateriales | null {
  const obj = parseRespuestas(data);
  if (!obj) return null;

  const ubicaciones = obj['ubicaciones'];
  if (!Array.isArray(ubicaciones)) return null;

  let totalItems = 0;
  let itemsOk = 0;
  let itemsCriticos = 0;
  let itemsBajo = 0;

  for (const ubicacion of ubicaciones) {
    if (!ubicacion || typeof ubicacion !== 'object') continue;
    const materiales = (ubicacion as { materiales?: MaterialChecklist[] }).materiales ?? [];
    for (const m of materiales) {
      if (!m?.nombre?.trim()) continue;
      totalItems += 1;
      const estado = estadoMaterial(m);
      if (estado === 'OK') itemsOk += 1;
      else if (estado === 'CRITICO') itemsCriticos += 1;
      else itemsBajo += 1;
    }
  }

  if (totalItems === 0) return null;

  return {
    totalItems,
    itemsOk,
    itemsCriticos,
    itemsBajo,
    porcentajeCompleto: Math.round((itemsOk / totalItems) * 100),
  };
}

/** Deriva semáforo y estado operativo a partir del checklist de unidad. */
export function evaluarEstadoOperativoDesdeChecklist(data: unknown): EvaluacionEstadoOperativo | null {
  const analisis = analizarMaterialesChecklist(data);
  if (!analisis) return null;

  let semaforo: SemaforoUnidad;
  let estadoOperativo: 0 | 1;

  if (analisis.itemsCriticos > 0) {
    semaforo = 'fuera_servicio';
    estadoOperativo = 0;
  } else if (analisis.itemsOk < analisis.totalItems) {
    semaforo = 'mantencion';
    estadoOperativo = 0;
  } else {
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
export function contarItemsDesdeRespuestas(raw: string | null | undefined): {
  totalItems: number;
  itemsOk: number;
} | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const unidad = analizarMaterialesChecklist(data);
  if (unidad) {
    return { totalItems: unidad.totalItems, itemsOk: unidad.itemsOk };
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj['equipos']) || Array.isArray(obj['cilindrosRecambio'])) {
      const equipos = (obj['equipos'] as unknown[]) ?? [];
      const recambios = (obj['cilindrosRecambio'] as unknown[]) ?? [];
      const items = [...equipos, ...recambios];
      const totalItems = items.length;
      const itemsOk = items.filter((it) => {
        const row = it as { arnesCondicion?: string; condicionGeneral?: string };
        return row?.arnesCondicion === 'Operativo' || row?.condicionGeneral === 'Operativo';
      }).length;
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
    const itemsOk = data.filter((m: { ok?: boolean; estado?: string }) => m?.ok || m?.estado === 'OK').length;
    return totalItems > 0 ? { totalItems, itemsOk } : null;
  }

  return null;
}

export function resolverSemaforoDesdeChecklist(
  respuestasChecklist: string | null | undefined,
): SemaforoUnidad | null {
  if (!respuestasChecklist || esChecklistBorrador(respuestasChecklist)) return null;

  const evaluacionUnidad = evaluarEstadoOperativoDesdeChecklist(respuestasChecklist);
  if (evaluacionUnidad) return evaluacionUnidad.semaforo;

  const conteo = contarItemsDesdeRespuestas(respuestasChecklist);
  if (!conteo || conteo.totalItems === 0) return null;
  if (conteo.itemsOk >= conteo.totalItems) return 'operativa';
  if (conteo.itemsOk === 0) return 'fuera_servicio';
  return 'mantencion';
}

export function resolverSemaforoUnidad(
  estadoOperativoDb: number,
  respuestasChecklist: string | null | undefined,
): SemaforoUnidad {
  const desdeChecklist = resolverSemaforoDesdeChecklist(respuestasChecklist);
  if (desdeChecklist) {
    return combinarSemaforos(desdeChecklist, estadoOperativoDb === 0 ? 'fuera_servicio' : null);
  }
  if (estadoOperativoDb === 0) return 'fuera_servicio';
  return 'operativa';
}

export function evaluarSemaforoMantenimiento(fechas: {
  proximoMantenimiento?: string | Date | null;
  proximaRevisionTecnica?: string | Date | null;
}): SemaforoUnidad | null {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  for (const raw of [fechas.proximoMantenimiento, fechas.proximaRevisionTecnica]) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    if (d < hoy) return 'mantencion';
  }
  return null;
}

const PESO_SEMAFORO: Record<SemaforoUnidad, number> = {
  operativa: 1,
  mantencion: 2,
  fuera_servicio: 3,
};

/** Toma el semáforo más restrictivo (fuera_servicio > mantencion > operativa). */
export function combinarSemaforos(...valores: Array<SemaforoUnidad | null | undefined>): SemaforoUnidad {
  let peor: SemaforoUnidad = 'operativa';
  for (const s of valores) {
    if (s && PESO_SEMAFORO[s] > PESO_SEMAFORO[peor]) {
      peor = s;
    }
  }
  return peor;
}
