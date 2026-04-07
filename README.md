Markdown
# SIDEP - Sistema Digital de Emergencias y Procesos 🚒

Este es el repositorio oficial de SIDEP. El proyecto utiliza un stack PostgreSQL, Express, Angular, Node.js con **Prisma ORM**.

## Guía de Instalación

Sigue estos pasos para dejar el entorno operativo en tu máquina local.

### 1. Clonar el repositorio
```bash
git clone [https://github.com/TU_USUARIO/SIDEP.git](https://github.com/TU_USUARIO/SIDEP.git)
cd SIDEP
2. Configuración del Backend
Entra a la carpeta del servidor e instala las dependencias:

Bash
cd backend
npm install
Configurar Variables de Entorno:
Crea un archivo .env dentro de la carpeta backend/ y pega la URL de conexión a la base de datos de Neon.

Fragmento de código
DATABASE_URL="postgresql://usuario:password@host/neondb?sslmode=require"
Sincronizar Base de Datos:
Genera el cliente de Prisma y asegúrate de tener las tablas actualizadas:

Bash
npx prisma generate
npx prisma migrate dev
3. Configuración del Frontend
Abre una nueva terminal en la raíz del proyecto e instala las dependencias de Angular:

Bash
cd frontend
npm install
4. Ejecución del Proyecto
Para trabajar, debes tener ambos servidores corriendo en paralelo:

Backend: Dentro de backend/, ejecuta npm run dev. (Corre en http://localhost:3000)

Frontend: Dentro de frontend/, ejecuta ng serve. (Corre en http://localhost:4200)

🛠 Estructura del Proyecto
/backend: API REST con Node.js, Express y Prisma.

/frontend: Aplicación Angular (v17+) con Standalone Components.

proxy.conf.json: Configurado para evitar errores de CORS redirigiendo /api al puerto 3000.