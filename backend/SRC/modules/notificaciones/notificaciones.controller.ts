import { Request, Response } from 'express';
import { ejecutarTareasCron } from './notificaciones-scheduler.service';

export const ejecutarCronNotificaciones = async (req: Request, res: Response) => {
  const secret = String(req.headers['x-cron-secret'] ?? '').trim();
  const esperado = String(process.env.CRON_SECRET ?? '').trim();
  if (!esperado || secret !== esperado) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  const tareaRaw = String(req.body?.tarea ?? req.query?.tarea ?? 'auto').trim().toLowerCase();
  const tareasValidas = ['auto', 'resumen-diario', 'checklist', 'inventario', 'todas'] as const;
  const tarea = tareasValidas.includes(tareaRaw as (typeof tareasValidas)[number])
    ? (tareaRaw as (typeof tareasValidas)[number])
    : 'auto';

  try {
    const result = await ejecutarTareasCron(tarea, true);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[SIDEP cron notificaciones]', err);
    return res.status(500).json({ ok: false, error: 'Error al ejecutar tareas programadas' });
  }
};
