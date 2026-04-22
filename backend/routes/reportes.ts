import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const reportesRouter = Router();

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

reportesRouter.get('/emergencias', async (req, res) => {
  const desde = req.query.desde ? new Date(String(req.query.desde)) : undefined;
  const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : undefined;
  if (desde && Number.isNaN(desde.getTime())) {
    res.status(400).json({ error: 'desde inválido' });
    return;
  }
  if (hasta && Number.isNaN(hasta.getTime())) {
    res.status(400).json({ error: 'hasta inválido' });
    return;
  }
  try {
    const partes = await prisma.parteEmergencia.findMany({
      where: {
        ...(desde || hasta
          ? {
              fecha: {
                ...(desde ? { gte: desde } : {}),
                ...(hasta ? { lte: hasta } : {}),
              },
            }
          : {}),
      },
      include: {
        unidades: true,
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
    const tiempoPromedio = tiempos.length ? Number((tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2)) : 0;

    const porMesMap = new Map<string, number>();
    for (const p of partes) {
      const d = new Date(p.fecha);
      const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
      porMesMap.set(key, (porMesMap.get(key) ?? 0) + 1);
    }
    const porMes = Array.from(porMesMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([periodo, cantidad]) => ({ periodo, cantidad }));

    res.json({
      totalEmergencias: total,
      porcentajeResueltas: total ? Number(((completadas / total) * 100).toFixed(2)) : 0,
      tiempoPromedioRespuestaMin: tiempoPromedio,
      porMes,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo generar reporte de emergencias' });
  }
});
