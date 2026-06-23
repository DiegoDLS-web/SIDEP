import 'dotenv/config';
import app from './app';
import prisma from './SRC/prisma';
import { calentarConexionPrisma } from './SRC/utils/db-retry.util';

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