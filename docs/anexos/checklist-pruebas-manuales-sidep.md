# Anexo — Checklist de pruebas manuales reproducibles (SIDEP frontend)

**Objetivo:** validar rápidamente el flujo más usado en demostraciones o antes de una defensa, sin automatización.

**Entorno:** `ng serve` con `proxy.conf` hacia el backend esperado **o** solo frontend (algunas acciones pueden fallar sin API).

**Convenciones:** marcar ✅ / ❌ y anotar versión/fecha si lo guardás como evidencia para tesis.

---

## Preparación (una vez por sesión)

1. Backend y frontend levantados (o solo frontend si probás modo demo/offline conocido).
2. Navegador en ventana privada o sin caché si necesitás credenciales limpias.

---

## A — Demo sin credenciales (flujo habitual)

| Paso | Acción esperada | Resultado |
|------|------------------|-----------|
| 1 | Abrir `/login`. | Pantalla de inicio de sesión visible. |
| 2 | Pulsar **“Entrar modo prueba (sin credenciales)”** (sin llenar email/clave si el flujo lo permite). | Redirección a `/` sin error bloqueante. |
| 3 | Comprobar que el **título de la pestaña** refleje la página (ej. “Estadísticas · SIDEP”). | Título actualizado (Fase títulos por ruta). |
| 4 | En el menú lateral, entrar **Partes** (`/partes`). | Lista o estado vacío coherente; badge **“Gestión operativa”** en cabecera. |
| 5 | Volver al **dashboard** desde el menú o `/`. | Filtros y bloques cargan sin consola JS crítica. |
| 6 | Cerrar sesión. | Vuelta a `/login` o comportamiento esperado sin quedar “fantasma”. |

---

## B — Credenciales reales (si aplica)

| Paso | Acción esperada | Resultado |
|------|------------------|-----------|
| 1 | Iniciar sesión con usuario válido. | Entrada a `/` sin bucle infinito. |
| 2 | Si el usuario debe cambiar clave inicial, debe ir a **`/cambiar-password-inicial`** hasta completarla. | Tras cambiar, permite navegar sin redirección constante al cambio de clave (coherencia con guard). |

---

## C — Roles (muestra mínima)

| Paso | Rol de prueba | Qué observar |
|------|----------------|---------------|
| 1 | **ADMIN** | Debe existir entrada o acceso **Configuraciones** (`/configuraciones`). |
| 2 | **No ADMIN** | **Configuraciones** no debe mostrarse o la ruta debe redirigir a inicio (`adminGuard`). |
| 3 | **Gestión usuarios** | Solo usuarios autorizados abren **`/usuarios`** (`gestionUsuariosGuard`). |

*(Ajustá según los usuarios que tengas en tu BD de desarrollo.)*

---

## Registro de incidencias (para anexo de tesis)

| ID | Fecha | Paso | Qué falló | Navegador |
|----|-------|------|-----------|-----------|
|    |       |      |           |           |

---

**Comando de tests automáticos (referencia):** desde `frontend/`, `npx ng test --no-watch --browsers=ChromeHeadless`.
