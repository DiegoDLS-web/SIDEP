"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ejecutarCronNotificaciones = void 0;
const notificaciones_scheduler_service_1 = require("./notificaciones-scheduler.service");
const ejecutarCronNotificaciones = async (req, res) => {
    const secret = String(req.headers['x-cron-secret'] ?? '').trim();
    const esperado = String(process.env.CRON_SECRET ?? '').trim();
    if (!esperado || secret !== esperado) {
        return res.status(401).json({ ok: false, error: 'No autorizado' });
    }
    const tareaRaw = String(req.body?.tarea ?? req.query?.tarea ?? 'auto').trim().toLowerCase();
    const tareasValidas = ['auto', 'resumen-diario', 'checklist', 'inventario', 'todas'];
    const tarea = tareasValidas.includes(tareaRaw)
        ? tareaRaw
        : 'auto';
    try {
        const result = await (0, notificaciones_scheduler_service_1.ejecutarTareasCron)(tarea, true);
        return res.status(200).json({ ok: true, ...result });
    }
    catch (err) {
        console.error('[SIDEP cron notificaciones]', err);
        return res.status(500).json({ ok: false, error: 'Error al ejecutar tareas programadas' });
    }
};
exports.ejecutarCronNotificaciones = ejecutarCronNotificaciones;
