import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const dashboardRouter = Router();

function parseHoraEnFecha(base: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const d = new Date(base);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function inicioFinAnio(anio: number): { desde: Date; hasta: Date } {
  return {
    desde: new Date(anio, 0, 1, 0, 0, 0, 0),
    hasta: new Date(anio, 11, 31, 23, 59, 59, 999),
  };
}

function heatmap4x7(partes: { fecha: Date }[]): number[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dowMon0 = (today.getDay() + 6) % 7;
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(mondayThisWeek.getDate() - dowMon0);
  const startMonday = new Date(mondayThisWeek);
  startMonday.setDate(startMonday.getDate() - 21);

  const counts = new Map<string, number>();
  for (const p of partes) {
    const d = new Date(p.fecha);
    d.setHours(0, 0, 0, 0);
    const k = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const heat: number[][] = [];
  for (let w = 0; w < 4; w++) {
    const row: number[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const dt = new Date(startMonday);
      dt.setDate(startMonday.getDate() + w * 7 + dow);
      const k = `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, '0')}-${`${dt.getDate()}`.padStart(2, '0')}`;
      row.push(counts.get(k) ?? 0);
    }
    heat.push(row);
  }
  return heat;
}

type Semaforo = 'operativa' | 'mantencion' | 'fuera_servicio';

function semaforoUnidad(c: {
  estadoOperativo: boolean;
  proximoMantenimiento: Date | null;
}): Semaforo {
  if (c.estadoOperativo) {
    return 'operativa';
  }
  const pm = c.proximoMantenimiento;
  if (!pm) {
    return 'fuera_servicio';
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const lim = new Date(pm);
  lim.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((lim.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < -14) {
    return 'fuera_servicio';
  }
  return 'mantencion';
}

function detalleBorrador(detalle: unknown): boolean {
  if (detalle && typeof detalle === 'object' && 'borrador' in detalle) {
    return Boolean((detalle as { borrador?: boolean }).borrador);
  }
  return false;
}

dashboardRouter.get('/resumen', async (req, res) => {
  const anioRaw = req.query.anio;
  const clave = String(req.query.clave ?? 'todos').trim();
  const carroIdRaw = req.query.carroId;

  const anio =
    anioRaw != null && String(anioRaw).trim() !== ''
      ? Number(String(anioRaw).trim())
      : new Date().getFullYear();
  if (!Number.isFinite(anio) || anio < 2000 || anio > 2100) {
    res.status(400).json({ error: 'año inválido' });
    return;
  }

  let carroIdFilter: number | undefined;
  if (carroIdRaw != null && String(carroIdRaw).trim() !== '' && String(carroIdRaw) !== 'todas') {
    const n = Number(carroIdRaw);
    if (!Number.isFinite(n) || n <= 0) {
      res.status(400).json({ error: 'carroId inválido' });
      return;
    }
    carroIdFilter = n;
  }

  const { desde, hasta } = inicioFinAnio(anio);

  const whereParte: Prisma.ParteEmergenciaWhereInput = {
    fecha: { gte: desde, lte: hasta },
  };

  if (clave && clave !== 'todos') {
    whereParte.claveEmergencia = clave;
  }

  if (carroIdFilter !== undefined) {
    whereParte.unidades = { some: { carroId: carroIdFilter } };
  }

  try {
    const partes = await prisma.parteEmergencia.findMany({
      where: whereParte,
      include: {
        unidades: { include: { carro: { select: { nomenclatura: true } } } },
      },
      orderBy: { fecha: 'desc' },
    });

    const total = partes.length;
    const completadas = partes.filter((p) => p.estado.toUpperCase() === 'COMPLETADO').length;
    const tiempos = partes
      .map((p) => {
        const salida = p.unidades[0]?.horaSalida;
        if (!salida) return null;
        const fechaSalida = parseHoraEnFecha(p.fecha, salida);
        if (!fechaSalida) return null;
        const diffMin = (fechaSalida.getTime() - p.fecha.getTime()) / 60000;
        return diffMin >= 0 && diffMin < 360 ? diffMin : null;
      })
      .filter((x): x is number => x !== null);
    const tiempoPromedio = tiempos.length
      ? Number((tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2))
      : 0;

    const porMesMap = new Map<string, number>();
    for (const p of partes) {
      const d = new Date(p.fecha);
      const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
      porMesMap.set(key, (porMesMap.get(key) ?? 0) + 1);
    }
    const porMes = Array.from(porMesMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([periodo, cantidad]) => ({ periodo, cantidad }));

    const porTipoMap = new Map<string, number>();
    for (const p of partes) {
      const k = p.claveEmergencia;
      porTipoMap.set(k, (porTipoMap.get(k) ?? 0) + 1);
    }
    const porTipo = Array.from(porTipoMap.entries())
      .map(([claveEmergencia, cantidad]) => ({ claveEmergencia, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const recientes = partes.slice(0, 3).map((p) => ({
      id: p.id,
      correlativo: p.correlativo,
      claveEmergencia: p.claveEmergencia,
      direccion: p.direccion,
      fecha: p.fecha.toISOString(),
      estado: p.estado,
      unidades: p.unidades.map((u) => u.carro?.nomenclatura ?? `Carro ${u.carroId}`),
    }));

    const heatmapSemanas = heatmap4x7(partes);

    const carros = await prisma.carro.findMany({
      orderBy: { nomenclatura: 'asc' },
    });

    const rowsUnidad = await prisma.checklistCarro.findMany({
      where: { tipo: 'UNIDAD' },
      orderBy: { fecha: 'desc' },
      select: {
        carroId: true,
        fecha: true,
        totalItems: true,
        itemsOk: true,
        detalle: true,
        carro: { select: { nomenclatura: true } },
      },
    });
    const seenU = new Set<number>();
    const ultimosCheckUnidad = rowsUnidad.filter((r) => {
      if (seenU.has(r.carroId)) return false;
      seenU.add(r.carroId);
      return true;
    });

    const rowsEra = await prisma.checklistCarro.findMany({
      where: { tipo: 'ERA' },
      orderBy: { fecha: 'desc' },
      select: {
        carroId: true,
        fecha: true,
        totalItems: true,
        itemsOk: true,
        detalle: true,
        carro: { select: { nomenclatura: true } },
      },
    });
    const seenE = new Set<number>();
    const ultimosCheckEra = rowsEra.filter((r) => {
      if (seenE.has(r.carroId)) return false;
      seenE.add(r.carroId);
      return true;
    });

    const rowsTrauma = await prisma.checklistCarro.findMany({
      where: { tipo: 'TRAUMA' },
      orderBy: { fecha: 'desc' },
      select: {
        carroId: true,
        fecha: true,
        totalItems: true,
        itemsOk: true,
        detalle: true,
        carro: { select: { nomenclatura: true } },
      },
    });
    const seenT = new Set<number>();
    const ultimosCheckTrauma = rowsTrauma.filter((r) => {
      if (seenT.has(r.carroId)) return false;
      seenT.add(r.carroId);
      return true;
    });

    const mapUnidad = new Map(ultimosCheckUnidad.map((c) => [c.carroId, c]));
    const mapEra = new Map(ultimosCheckEra.map((c) => [c.carroId, c]));
    const mapTrauma = new Map(ultimosCheckTrauma.map((c) => [c.carroId, c]));

    let alertas: Array<{
      tipo: string;
      severidad: 'critico' | 'advertencia';
      titulo: string;
      detalle: string;
      carroId?: number;
      nomenclatura?: string;
    }> = [];

    let unidadesSemaforo = carros.map((c) => {
      const s = semaforoUnidad(c);
      if (s !== 'operativa') {
        alertas.push({
          tipo: 'unidad_no_operativa',
          severidad: s === 'fuera_servicio' ? 'critico' : 'advertencia',
          titulo: s === 'fuera_servicio' ? 'Unidad fuera de servicio' : 'Unidad en mantención',
          detalle: `${c.nomenclatura}: no está operativa según el registro del carro.`,
          carroId: c.id,
          nomenclatura: c.nomenclatura,
        });
      }

      const chU = mapUnidad.get(c.id);
      if (
        chU &&
        chU.totalItems != null &&
        chU.totalItems > 0 &&
        chU.itemsOk != null &&
        chU.itemsOk < chU.totalItems &&
        !detalleBorrador(chU.detalle)
      ) {
        const faltan = chU.totalItems - chU.itemsOk;
        alertas.push({
          tipo: 'checklist_unidad_fallas',
          severidad: 'advertencia',
          titulo: 'Checklist de unidad con ítems pendientes',
          detalle: `${c.nomenclatura}: faltan ${faltan} ítem(ns) en el último checklist (${chU.fecha.toISOString().slice(0, 10)}).`,
          carroId: c.id,
          nomenclatura: c.nomenclatura,
        });
      }

      const chE = mapEra.get(c.id);
      if (
        chE &&
        chE.totalItems != null &&
        chE.totalItems > 0 &&
        chE.itemsOk != null &&
        chE.itemsOk < chE.totalItems &&
        !detalleBorrador(chE.detalle)
      ) {
        const faltan = chE.totalItems - chE.itemsOk;
        alertas.push({
          tipo: 'checklist_era_fallas',
          severidad: 'advertencia',
          titulo: 'Checklist ERA con ítems pendientes',
          detalle: `${c.nomenclatura}: faltan ${faltan} ítem(ns) en el último ERA (${chE.fecha.toISOString().slice(0, 10)}).`,
          carroId: c.id,
          nomenclatura: c.nomenclatura,
        });
      }

      const chT = mapTrauma.get(c.id);
      if (
        chT &&
        chT.totalItems != null &&
        chT.totalItems > 0 &&
        chT.itemsOk != null &&
        chT.itemsOk < chT.totalItems &&
        !detalleBorrador(chT.detalle)
      ) {
        const faltan = chT.totalItems - chT.itemsOk;
        alertas.push({
          tipo: 'checklist_trauma_fallas',
          severidad: 'advertencia',
          titulo: 'Bolso de trauma con ítems pendientes',
          detalle: `${c.nomenclatura}: faltan ${faltan} ítem(ns) en el último control de trauma (${chT.fecha.toISOString().slice(0, 10)}).`,
          carroId: c.id,
          nomenclatura: c.nomenclatura,
        });
      }

      return {
        id: c.id,
        nomenclatura: c.nomenclatura,
        nombre: c.nombre ?? c.nomenclatura,
        estadoOperativo: c.estadoOperativo,
        semaforo: s,
        checklistUnidad: chU
          ? {
              fecha: chU.fecha.toISOString(),
              totalItems: chU.totalItems,
              itemsOk: chU.itemsOk,
              completo:
                chU.totalItems != null &&
                chU.totalItems > 0 &&
                chU.itemsOk != null &&
                chU.itemsOk >= chU.totalItems,
            }
          : null,
        checklistEra: chE
          ? {
              fecha: chE.fecha.toISOString(),
              totalItems: chE.totalItems,
              itemsOk: chE.itemsOk,
              completo:
                chE.totalItems != null &&
                chE.totalItems > 0 &&
                chE.itemsOk != null &&
                chE.itemsOk >= chE.totalItems,
            }
          : null,
        checklistTrauma: chT
          ? {
              fecha: chT.fecha.toISOString(),
              totalItems: chT.totalItems,
              itemsOk: chT.itemsOk,
              completo:
                chT.totalItems != null &&
                chT.totalItems > 0 &&
                chT.itemsOk != null &&
                chT.itemsOk >= chT.totalItems,
            }
          : null,
      };
    });

    if (carroIdFilter !== undefined) {
      unidadesSemaforo = unidadesSemaforo.filter((u) => u.id === carroIdFilter);
      alertas = alertas.filter((a) => a.carroId == null || a.carroId === carroIdFilter);
    }

    const now = new Date();
    const mesParaStat =
      anio === now.getFullYear() ? now.getMonth() + 1 : 12;
    const periodoMes = `${anio}-${`${mesParaStat}`.padStart(2, '0')}`;
    const emergenciasEsteMes = porMes.find((m) => m.periodo === periodoMes)?.cantidad ?? 0;

    res.json({
      anio,
      filtros: { clave: clave === 'todos' ? null : clave, carroId: carroIdFilter ?? null },
      totalEmergencias: total,
      porcentajeResueltas: total ? Number(((completadas / total) * 100).toFixed(2)) : 0,
      tiempoPromedioRespuestaMin: tiempoPromedio,
      emergenciasEsteMes,
      porMes,
      porTipo,
      recientes,
      heatmapSemanas,
      alertas,
      unidadesSemaforo,
      generadoEn: new Date().toISOString(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar el dashboard' });
  }
});
