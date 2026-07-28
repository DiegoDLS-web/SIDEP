# SIDEP — Operaciones (Fase 4)

Guía para staging, observabilidad, respaldos y despliegue seguro.

## Entorno staging (recomendado)

Objetivo: probar cambios con datos de prueba **sin tocar producción**.

### Opción A — Segundo servicio en Render

1. Duplica el servicio web en Render como `sidep-staging`.
2. Crea una **base Neon separada** (`sidep_staging`) — no reutilices `DATABASE_URL` de producción.
3. Variables mínimas en staging:
   - `NODE_ENV=production`
   - `DATABASE_URL` → BD staging
   - `JWT_SECRET` → **distinto** al de producción
   - `FRONTEND_URL` / `APP_PUBLIC_URL` → URL del staging (ej. `https://sidep-staging.onrender.com`)
   - SMTP/Cloudinary: cuenta de prueba o las mismas con prefijo `[STAGING]` en correos
4. Rama Git sugerida: `develop` → auto-deploy a staging; `main` → producción.

### Opción B — Local con BD staging

```bash
# backend/.env.staging — copia de .env con DATABASE_URL de Neon staging
npm run build
npx prisma migrate deploy
npm run start
```

Frontend apuntando al API staging: proxy o `environment.staging.ts` si se añade configuración.

---

## Observabilidad

### Logs estructurados (implementado)

El backend emite JSON en stdout (`service: sidep-api`). En Render:

1. **Logs** → filtra por `"level":"error"`.
2. Opcional: conecta un **log drain** (Datadog, Better Stack, Axiom) al servicio.

Variables:

| Variable | Uso |
|----------|-----|
| `LOG_DEBUG=1` | Incluye logs debug (solo diagnóstico) |

### Sentry (opcional, recomendado en producción)

1. Crea proyecto en [sentry.io](https://sentry.io).
2. Backend: instala `@sentry/node` y en `app.ts` (antes de rutas):

```typescript
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
}
```

3. Frontend: `@sentry/angular` con `SENTRY_DSN` en environment de build.
4. Añade `SENTRY_DSN` en Render (sync: false).

Hasta integrar el SDK, los logs JSON ya permiten alertas básicas en Render.

### Health check

`GET /api/health` — usado por Render. Revisa periódicamente DB, JWT y SMTP.

---

## Sesiones y revocación (implementado)

- JWT incluye `tv` (tokenVersion).
- Al **dar de baja**, **restablecer contraseña** (admin) o **soft-delete**, se incrementa `tokenVersion` → sesiones anteriores quedan inválidas (`codigo: SESION_REVOCADA`).
- Migración: `20260727210000_usuario_token_version`.

**Pendiente a futuro:** cookies `httpOnly` + refresh tokens (requiere cambio en frontend y CORS).

---

## Respaldos (Neon PostgreSQL)

1. En Neon Console → proyecto → **Backups** / PITR (según plan).
2. **Prueba de restore** al menos una vez al trimestre:
   - Crea rama `restore-test-YYYYMMDD` desde backup.
   - Apunta staging a esa rama y verifica login + un parte de prueba.
3. Documenta responsable y frecuencia en la directiva.

---

## CI (Fase 3)

GitHub Actions (`.github/workflows/ci.yml`):

- Backend: `tsc` + tests Node
- Frontend: `build` + `test:ci` (Karma headless)

---

## Roadmap pendiente (priorizado)

| Prioridad | Ítem | Esfuerzo |
|-----------|------|----------|
| Alta | Validación Zod uniforme en rutas críticas | 1–2 sem |
| Alta | Simplificar partes en móvil | 1 sem |
| Media | PWA + borrador offline partes/checklists | 2–3 sem |
| Media | Importación masiva inventario (UI) | 1 sem |
| Media | Export PDF/Excel server-side | 2 sem |
| Baja | MFA administradores | 1 sem |
| Baja | WCAG auditoría completa | continuo |
| Baja | Eliminar módulos huérfanos (`inventarios-bodega`, placeholders) | 1 día |

---

## Contacto operativo

Ante incidente en producción:

1. Revisar logs Render + `/api/health`
2. Si hay migración fallida: `npx prisma migrate deploy` en shell de Render
3. Rollback de deploy anterior desde el panel Render si aplica
