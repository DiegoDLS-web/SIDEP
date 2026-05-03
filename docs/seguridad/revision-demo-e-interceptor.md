# Revisión rápida — Demo, guards e interceptor (frontend SIDEP)

Documento de apoyo para tesis / despliegue: **no sustituye** auditoría profesional ni asesoría legal.

---

## 1. Modo demo (`AuthService.loginDemo`)

**Comportamiento actual (referencia código):**

- Intenta `POST /api/auth/login-demo` con JWT de respuesta si el backend está disponible.
- Si la petición **falla** (sin red, servidor apagado, etc.), crea una **sesión local** con usuario **“Modo Demo Local”**, rol **ADMIN**, token **`demo-local-token`**, correo **`demo@local`**.

### Riesgos / comentarios

| Severidad | Tema |
|-----------|------|
| **Alta (en producción)** | Cualquier build que llegue público podría dejar abierta la posibilidad de “entrar como demo” si el cliente la expone igual que en desarrollo. **Mitigar:** ocultar o desactivar el botón de demo solo en builds de producción (`environment`), o exigir flag en servidor. |
| **Media** | El fallback local concede rol **ADMIN** en el cliente. El **backend debe seguir rechazando** operaciones sensibles si no hay JWT válido; el front no es seguridad por sí solo. |
| **Baja** | Identidad demo puede confundir capturas de pantalla o métricas; documentar que es “solo para pruebas”. |

### Mejoras priorizadas (demo)

1. **P0 — Producción:** variable de entorno `allowDemoLogin: false` y no compilar el botón demo en prod.
2. **P1 — Backend:** endpoint `login-demo` solo en entorno de desarrollo o con IP restringida.
3. **P2 — UX:** aviso explícito “Datos de demostración / no operativos” tras login demo.

---

## 2. Guards de ruta

| Guard | Rol / condición | Comentario |
|-------|------------------|------------|
| `authGuard` | Sesión + `/api/auth/me` coherente; password provisional | Redirige a login o a cambio de contraseña según reglas. |
| `guestGuard` | Evita login si ya hay sesión | Reduce duplicidad de sesión. |
| `adminGuard` | Solo `usuarioActual.rol === 'ADMIN'` (tras `toUpperCase`) | Frontend; **confirmar mismo criterio en API** para cualquier escritura sensible. |
| `gestionUsuariosGuard` | Solo ADMIN (usa `trim` + mayúsculas) | Como arriba: **no confiar solo en UI**. |

**Hecho en código:** `adminGuard` ahora también usa **`trim()`** antes de comparar con `ADMIN`, alineado a `gestionUsuariosGuard`. Sigue siendo indispensable reforzar roles en API.

---

## 3. Interceptor HTTP (`authInterceptor`)

**Comportamiento:** si existe token en `AuthService`, añade `Authorization: Bearer <token>`.

| Riesgo | Mitigación típica |
|--------|-------------------|
| Token en cada request | Normal; vigilar HTTPS en prod y fugas en logs del navegador. |
| Token inválido / expirado | Hoy `cargarSesion` ante 401 puede limpiar sesión (`catchError`). Validar también mensajes UX al usuario. |

**Mejora P2:** interceptor opcional para **renovación silenciosa** o toast único ante 401 repetidos (evitar “tormenta” de toasts).

---

## 4. Lista corta para “lista de mejoras priorizadas” en memoria / defensa

1. **Demo desactivable en prod** y/o solo backend dev.  
2. **Autorización duplicada en API** para admin y gestión de usuarios.  
3. **HTTPS obligatorio** en despliegue real.  
4. **Política de datos personales** (licencias, RUT, etc.) documentada aparte, con asesoría legal Chile.  
5. **Registro de auditoría** en servidor para acciones críticas (fuera de alcance del solo frontend).

---

*Última actualización alineada con el código del repositorio SIDEP (tests unitarios en guards, mapper e interceptor).*

---

## Capítulos tipo memoria (problema, seguridad datos Chile, fiabilidad en emergencia)

Texto más amplio para el documento académico: carpeta **`docs/tesis/`** (índice en [`docs/tesis/README.md`](../tesis/README.md)).
