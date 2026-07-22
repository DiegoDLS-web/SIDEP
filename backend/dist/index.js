"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./SRC/prisma"));
const db_retry_util_1 = require("./SRC/utils/db-retry.util");
const notificaciones_scheduler_service_1 = require("./SRC/modules/notificaciones/notificaciones-scheduler.service");
function urlPublicaApp() {
    const explicita = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
    if (explicita)
        return explicita;
    const render = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
    if (render)
        return render;
    return `http://localhost:${PORT}`;
}
function validarConfigProduccion() {
    if (process.env.NODE_ENV !== 'production')
        return;
    const appUrl = urlPublicaApp();
    if (/localhost|127\.0\.0\.1/i.test(appUrl)) {
        console.warn('[SIDEP] APP_PUBLIC_URL debe ser la URL pública del frontend en producción (recuperación de contraseña). Actual:', appUrl);
    }
    if (!process.env.SMTP_HOST?.trim() || !process.env.SMTP_USER?.trim()) {
        console.warn('[SIDEP] SMTP no configurado: la recuperación de contraseña no enviará correos.');
    }
}
validarConfigProduccion();
const PORT = process.env.PORT || 3000;
app_1.default.listen(PORT, () => {
    const base = urlPublicaApp();
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 SIDEP en producción: ${base}`);
    }
    else {
        console.log(`🚀 Servidor SIDEP local corriendo en http://localhost:${PORT}`);
    }
    console.log(`🩺 Healthcheck: ${base}/api/health`);
    void (0, db_retry_util_1.calentarConexionPrisma)(prisma_1.default).then((ok) => {
        if (ok) {
            console.log('✅ Conexión a base de datos lista');
            (0, notificaciones_scheduler_service_1.iniciarSchedulerNotificaciones)();
        }
        else {
            console.warn('⚠️ La base de datos no respondió al iniciar; se reintentará en cada petición.');
        }
    });
});
