# Publicar SIDEP en internet

Esta guía deja SIDEP accesible para cualquier persona con un enlace público (sin depender de `localhost`).

## Arquitectura recomendada

| Componente | Servicio sugerido | Costo |
|------------|-------------------|-------|
| Base de datos PostgreSQL | [Neon](https://neon.tech) | Plan gratis |
| App (Angular + API) | [Render](https://render.com) | Plan gratis* |

\* El plan gratis de Render puede dormir el servicio tras inactividad; la primera visita tarda ~30 s en despertar.

En producción **un solo servidor** entrega:

- La web Angular en `/`
- La API en `/api/...`

---

## Paso 1 — Base de datos (Neon)

1. Crea una cuenta en [neon.tech](https://neon.tech).
2. Crea un proyecto PostgreSQL.
3. Copia la **connection string** (formato `postgresql://...?sslmode=require`).
4. Guárdala: será `DATABASE_URL`.

---

## Paso 2 — Subir el código a GitHub

Si aún no está publicado:

```bash
git add .
git commit -m "Preparar despliegue en producción"
git push origin master
```

El repositorio actual: `https://github.com/DiegoDLS-web/SIDEP`

---

## Paso 3 — Desplegar en Render

1. Entra a [render.com](https://render.com) e inicia sesión con GitHub.
2. **New → Blueprint** (o **Web Service** si prefieres manual).
3. Conecta el repo `SIDEP`.
4. Render detectará `render.yaml` y creará el servicio `sidep`.
5. En **Environment**, configura estas variables (obligatorias):

| Variable | Ejemplo | Notas |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql://...` | Desde Neon |
| `JWT_SECRET` | texto largo aleatorio | Render puede generarlo |
| `FRONTEND_URL` | `https://sidep-xxxx.onrender.com` | URL pública (Render también expone `RENDER_EXTERNAL_URL`) |
| `APP_PUBLIC_URL` | `https://sidep-xxxx.onrender.com` | Misma URL; si la dejas vacía, Render usa `RENDER_EXTERNAL_URL` |
| `NODE_ENV` | `production` | Ya viene en `render.yaml` |

Opcionales pero recomendadas:

| Variable | Uso |
|----------|-----|
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Recuperar contraseña por correo |
| `CLOUDINARY_*` | Fotos y archivos |

6. Tras el primer deploy, abre:

   `https://TU-SERVICIO.onrender.com/api/health`

   Debe responder: `Servidor SIDEP Operativo`.

7. Abre la URL principal:

   `https://TU-SERVICIO.onrender.com`

   Ahí verás el login de SIDEP.

---

## Paso 4 — Migraciones y datos iniciales

El comando de build (`npm run build:production`) ejecuta `prisma migrate deploy` automáticamente.

Si necesitas datos de prueba (seed) una sola vez, en la consola de Render (Shell) o local con la misma `DATABASE_URL`:

```bash
cd backend
npx prisma db seed
```

---

## Variables importantes

- **`FRONTEND_URL` y `APP_PUBLIC_URL`**: deben ser la URL **pública real** (https), no `localhost`.
- **`JWT_SECRET`**: obligatorio en producción; usa un valor largo y único.
- **`DATABASE_URL`**: PostgreSQL con SSL (Neon lo incluye).

---

## Alternativa: Docker

Con Docker instalado:

```bash
# Crea backend/.env con DATABASE_URL, JWT_SECRET, etc.
docker build -t sidep .
docker run -p 3000:3000 --env-file backend/.env sidep
```

La app quedará en `http://localhost:3000` (para un VPS, apunta el dominio al puerto 3000 o usa un proxy inverso).

---

## Dominio propio (opcional)

En Render: **Settings → Custom Domain** y sigue las instrucciones DNS.

Luego actualiza `FRONTEND_URL` y `APP_PUBLIC_URL` a tu dominio (ej. `https://sidep.tucompania.cl`).

---

## Comprobar el build localmente (simulando producción)

```bash
npm run build:production
cd backend
set NODE_ENV=production
npm run start
```

Abre `http://localhost:3000` (frontend + API en el mismo puerto).

---

## Solución de problemas

| Problema | Qué revisar |
|----------|-------------|
| Pantalla en blanco | Logs de Render; que el build de Angular haya terminado |
| Error CORS | `FRONTEND_URL` debe coincidir con la URL del navegador |
| Login no funciona | `JWT_SECRET` y `DATABASE_URL` |
| Correo de recuperación no llega | Variables `SMTP_*` y `APP_PUBLIC_URL` |
| Inventarios no carga / error resumen | Ejecutar `npx prisma migrate deploy` en backend; reiniciar el servicio |
| `P1002` advisory lock en migrate | Detén `npm run dev`; usa `DIRECT_URL` en `.env`; espera 15 s y reintenta |
| `prisma db seed` falla en Windows | Ejecuta `npx ts-node -r dotenv/config scripts/seed-catalogos.ts` |
| 502 al despertar | Normal en plan gratis; espera y recarga |

---

## Resumen rápido

1. Neon → `DATABASE_URL`
2. GitHub → código actualizado
3. Render → conectar repo + variables de entorno
4. Compartir la URL `https://....onrender.com` con tu compañía
