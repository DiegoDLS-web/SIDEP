# 3) Confiabilidad “en emergencia” (caídas, concurrencia, offline, backups)

Este apartado permite que el tribunal entienda que **un sistema de apoyo a bomberos** debe analizarse también bajo **estrés operativo**, no solo en demostraciones en laboratorio.

Separá siempre: **qué hace hoy SIDEP** vs **qué se recomienda** para un despliegue crítico.

---

## 3.1 Escenarios de fallo típicos

| Escenario | Efecto sobre el usuario | Qué suele esperarse en un diseño robusto |
|-----------|---------------------------|------------------------------------------|
| Sin conectividad en el cuartel/móvil | No carga la web o no guarda | **Modo offline acotado**: cola local de borradores, sincronización cuando vuelva red; o política explícita de “no operativo sin red” |
| Caída del servidor a las 03:00 | 5xx, timeouts | **Alta disponibilidad** (réplicas, healthcheck), **mensaje claro**, no bucles de reintento sin límite |
| Tres usuarios editan el mismo recurso | Sobrescrituras o conflictos | **Control de concurrencia** (versiones, ETag, última escritura con aviso, bloqueo optimista) |
| Token expirado a mitad de operación | Guard te expulsa o datos no guardan | **Refresh de sesión** medido o mensaje único + opción de guardar borrador |

SIDEP, en su capa web actual, depende de **HTTP y Web API**; cualquier promesa de funcionamiento sin red debe **documentarse como no implementada** hasta que exista diseño PWA/offline real.

**Párrafo honesto para memoria:**

> “El prototipo SIDEP asume conectividad con el backend. No se implementó un **almacenamiento local transaccional** completo para todas las entidades; las interrupciones de red imposibilitan el registro hasta restaurar la comunicación, salvo trabajo manual externo al sistema.”

---

## 3.2 Colas, reintentos e idempotencia (conceptos para la memoria)

- **Reintento con backoff:** ante fallos temporales (502, timeout), el cliente reintenta hasta N veces sin saturar el servidor.
- **Idempotencia:** operaciones críticas que no deben duplicarse si el usuario envía dos veces el mismo formulario (ej. **idempotency key** en cabecera para “crear parte”).

**Para tesis:** podés declarar estado actual vs objetivo:

> “Las operaciones REST del backend deben revisarse caso a caso para garantizar que **dos POST iguales** no generen registros duplicados cuando la red corta después del procesamiento pero antes de la respuesta al cliente.”

---

## 3.3 Mensajes claros al usuario (UX bajo estrés)

Criterios mínimos:

1. Distinción entre **error de red**, **credenciales** y **error de servidor**.
2. Evitar toasts repetidos (“tormenta” de errores) si algo falló en cascada — patrón: un mensaje fuerte + opción **reintentar**.
3. No redirigir al login sin explicación si fue **solo timeout** intermitente.

Esto puede mapearse a **trabajo futuro** con capturas del comportamiento actual y mockups de mejoras.

---

## 3.4 Backup y restauración (documentación operativa — no solo código)

Un tribunal suele preguntar: **“¿Dónde viven los datos?”**

Elementos típicos a documentar (a completar por quien deploya):

| Tema | Pregunta | Respuesta ejemplo (plantilla) |
|------|-----------|-------------------------------|
| Base de datos | ¿PostgreSQL/MySQL SQLite? ¿Dónde? | RDS / servidor físico — **completar** |
| Copias | ¿Backup diario? ¿Geo-redundancia? | Política institucional — **completar** |
| Recuperación (RPO/RTO) | ¿Cuánta pérdida de datos aceptable? ¿En cuántas horas vuelvo? | Definición institucional |
| Ensayo | ¿Se probó restore al menos una vez al año? | Evidencia o plan |

**Advertencia ética:** en memoria undergraduate no necesitás mentir: puede seguir abierto como “plan de infraestructura futura enlazado al Cuerpo”.

---

## 3.5 Relación con el código actual SIDEP

- La **persistencia robusta** y la **estrategia de despliegue** están acopladas a **PostgreSQL / Prisma** y Node en el servidor (según configuración del repositorio). La **fiabilidad** final depende de **infra**, no solo del código de aplicación.
- El frontend **no garantiza disponibilidad** si el servidor o la red fallan.

---

## 3.6 Checklist de “lista para operación institucional” (anexo ejecutivo)

Para pegar como lista en anexos:

- [ ] HTTPS y certificados gestionados
- [ ] Backups automatizados y prueba de restauración documentada  
- [ ] Monitoreo de disponibilidad (uptime / alertas)  
- [ ] Política de roles y revisión trimestral de cuentas  
- [ ] Plan de comunicación ante caída (canal paralelo conocido por la guardia)

---

*Documento pensado para integrarse en capítulo de discusión, riesgos operativos y trabajo futuro.*
