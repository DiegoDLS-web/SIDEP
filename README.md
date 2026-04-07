🚒 SIDEP - Sistema Digital de Emergencias y Procesos

Este es el repositorio oficial de SIDEP.
El proyecto utiliza el stack PERN + Angular:

PostgreSQL
Express
Angular
Node.js
Prisma ORM
📦 Guía de Instalación

Sigue estos pasos para dejar el entorno operativo en tu máquina local.

1️⃣ Clonar el repositorio
git clone https://github.com/DiegoDLS-web/SIDEP.git
cd SIDEP
2️⃣ Configuración del Backend

Entra a la carpeta del servidor e instala las dependencias:

cd backend
npm install
🔐 Configurar Variables de Entorno

Crea un archivo .env dentro de la carpeta backend/ y pega tu URL de conexión a la base de datos de Neon:

DATABASE_URL="postgresql://usuario:password@host/neondb?sslmode=require"
🗄 Sincronizar Base de Datos

Genera el cliente de Prisma y sincroniza las tablas:

npx prisma generate
npx prisma migrate dev
3️⃣ Configuración del Frontend

Abre una nueva terminal en la raíz del proyecto e instala las dependencias de Angular:

cd frontend
npm install
4️⃣ 🚀 Ejecución del Proyecto

Para trabajar, debes tener ambos servidores corriendo en paralelo:

Backend

Dentro de backend/:

npm run dev

Servidor disponible en:

http://localhost:3000
Frontend

Dentro de frontend/:

ng serve

Servidor disponible en:

http://localhost:4200
🛠 Estructura del Proyecto
SIDEP/
│
├── backend/        # API REST con Node.js, Express y Prisma
│
├── frontend/       # Aplicación Angular (v17+) Standalone Components

⚙️ Tecnologías Utilizadas
Node.js
Express
Angular 17+
PostgreSQL
Prisma ORM
Neon Database
👨‍💻 Desarrollo

El archivo proxy.conf.json está configurado para evitar errores CORS, redirigiendo:

/api → http://localhost:3000
📌 Requisitos Previos

Asegúrate de tener instalado:

Node.js 18+
Angular CLI
PostgreSQL (o Neon DB)
Git

Instalar Angular CLI:

npm install -g @angular/cli