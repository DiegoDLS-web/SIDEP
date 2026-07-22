import 'dotenv/config';
import app from './app';
import prisma from './SRC/prisma';
import { calentarConexionPrisma } from './SRC/utils/db-retry.util';
import { iniciarSchedulerNotificaciones } from './SRC/modules/notificaciones/notificaciones-scheduler.service';

function urlPublicaApp(): string {
    const explicita = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
    if (explicita) return explicita;
    const render = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
    if (render) return render;
    return `http://localhost:${PORT}`;
}

function validarConfigProduccion(): void {
    if (process.env.NODE_ENV !== 'production') return;

    const appUrl = urlPublicaApp();
    if (/localhost|127\.0\.0\.1/i.test(appUrl)) {
        console.warn(
            '[SIDEP] APP_PUBLIC_URL debe ser la URL pública del frontend en producción (recuperación de contraseña). Actual:',
            appUrl,
        );
    }
    if (!process.env.SMTP_HOST?.trim() || !process.env.SMTP_USER?.trim()) {
        console.warn('[SIDEP] SMTP no configurado: la recuperación de contraseña no enviará correos.');
    }
}

validarConfigProduccion();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    const base = urlPublicaApp();
    if (process.env.NODE_ENV === 'production') {
        console.log(`🚀 SIDEP en producción: ${base}`);
    } else {
        console.log(`🚀 Servidor SIDEP local corriendo en http://localhost:${PORT}`);
    }
    console.log(`🩺 Healthcheck: ${base}/api/health`);
    void calentarConexionPrisma(prisma).then((ok) => {
        if (ok) {
            console.log('✅ Conexión a base de datos lista');
            iniciarSchedulerNotificaciones();
        } else {
            console.warn('⚠️ La base de datos no respondió al iniciar; se reintentará en cada petición.');
        }
    });
});