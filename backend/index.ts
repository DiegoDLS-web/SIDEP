import 'dotenv/config';
import app from './app';
import prisma from './SRC/prisma';
import { calentarConexionPrisma } from './SRC/utils/db-retry.util';

function validarConfigProduccion(): void {
    if (process.env.NODE_ENV !== 'production') return;

    const appUrl = (process.env.APP_PUBLIC_URL || '').trim();
    if (!appUrl || /localhost|127\.0\.0\.1/i.test(appUrl)) {
        console.warn(
            '[SIDEP] APP_PUBLIC_URL debe ser la URL pública del frontend en producción (recuperación de contraseña). Actual:',
            appUrl || '(vacío; fallback http://localhost:4200)',
        );
    }
    if (!process.env.SMTP_HOST?.trim() || !process.env.SMTP_USER?.trim()) {
        console.warn('[SIDEP] SMTP no configurado: la recuperación de contraseña no enviará correos.');
    }
}

validarConfigProduccion();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor SIDEP local corriendo en http://localhost:${PORT}`);
    console.log(`🩺 Prueba la API abriendo en tu navegador: http://localhost:${PORT}/api/health`);
    void calentarConexionPrisma(prisma).then((ok) => {
        if (ok) {
            console.log('✅ Conexión a base de datos lista');
        } else {
            console.warn('⚠️ La base de datos no respondió al iniciar; se reintentará en cada petición.');
        }
    });
});