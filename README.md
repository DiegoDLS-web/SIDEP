Markdown
# SIDEP - Sistema Digital de Emergencias y Procesos 🚒

SIDEP. El proyecto utiliza PostgreSQL, Express, Angular, Node.js con **Prisma ORM**.

## Guía de Instalación

Sigue estos pasos para dejar el entorno operativo en tu máquina local.

1. Clonar el repositorio

git clone [https://github.com/DiegoDLS-web/SIDEP.git](https://github.com/DiegoDLS-web/SIDEP.git)
cd SIDEP

2. Configuración del Backend
Entra a la carpeta del servidor e instala las dependencias:

cd backend
npm install

Configurar Variables de Entorno:
Crea un archivo .env dentro de la carpeta backend/ y pega la URL de conexión a la base de datos de Neon

DATABASE_URL="url neon"

Sincronizar Base de Datos:
Genera el cliente de Prisma y asegúrate de tener las tablas actualizadas:

npx prisma generate
npx prisma migrate dev

3. Configuración del Frontend

Abre una nueva terminal en la raíz del proyecto e instala las dependencias de Angular:

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