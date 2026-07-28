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

Copia el archivo de ejemplo y complétalo:

```bash
cd backend
copy .env.example .env
```

Variables mínimas para desarrollo:

```env
DATABASE_URL="postgresql://usuario:password@host/neondb?sslmode=require"
JWT_SECRET="un-secreto-largo-aleatorio"
FRONTEND_URL=http://localhost:4200
APP_PUBLIC_URL=http://localhost:4200
```

Para **recuperar contraseña por correo** (obligatorio en servidor):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=contraseña-de-aplicacion
SMTP_FROM="SIDEP <tu-correo@gmail.com>"
```

Ver `backend/.env.example` para la lista completa (Cloudinary, producción, etc.).

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

En **producción**, el build de Angular usa rutas relativas `/api/`; configura nginx (o similar) para proxy al backend y define en el `.env` del servidor:

| Variable | Uso |
|----------|-----|
| `NODE_ENV=production` | Activa validaciones de arranque |
| `FRONTEND_URL` | Origen permitido en CORS (URL del frontend) |
| `APP_PUBLIC_URL` | URL pública del frontend en enlaces de recuperación de contraseña |
| `SMTP_*` | Envío de correos de recuperación de contraseña |

Si `APP_PUBLIC_URL` queda en `localhost` en producción, los enlaces del correo no funcionarán para los usuarios.

📌 Requisitos Previos

Asegúrate de tener instalado:

Node.js 18+

Angular CLI

PostgreSQL (o Neon DB)

Git

Instalar Angular CLI:

npm install -g @angular/cli

---

## 🌐 Publicar en internet (producción)

Para que **cualquier persona** acceda sin `localhost`, sigue la guía detallada:

**[DEPLOY.md](./DEPLOY.md)**

Resumen:

1. Base de datos en **Neon** (PostgreSQL gratis).
2. Código en **GitHub**.
3. Despliegue en **Render** (plan gratis) usando el archivo `render.yaml` del repo.
4. Configurar `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` y `APP_PUBLIC_URL` con la URL pública.

La app quedará en una URL del tipo `https://sidep-xxxx.onrender.com`.

Operaciones (staging, logs, backups, CI): **[docs/OPERACIONES.md](./docs/OPERACIONES.md)**
