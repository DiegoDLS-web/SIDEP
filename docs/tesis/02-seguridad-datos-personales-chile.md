# 2) Seguridad y datos personales (marco Chile + alineación técnica SIDEP)

Objetivo del apartado: enlazar **decisiones de ingeniería** con **responsabilidades** típicas en instituciones que tratan **datos personales** (nombre, RUT-like, correo, eventualmente salud vía licencias médicas).

**Importante:** este texto es **académico-orientativo**. Para cumplimiento institucional formal necesitás **validación legal interna** (bomberos, municipalidad, salud, según aplique).

---

## 2.1 Marco legal típico en Chile (referencia general)

- **Ley N.º 19.628 sobre protección de la vida privada:** regula el **tratamiento de datos de carácter personal** por parte de organismos y particulares en Chile. Principios que suelen citarse en memorias: **licitud**, **finalidad**, **proporcionalidad**, **calidad de los datos**, **seguridad**, y **deberes ante el titular** (acceso, rectificación, bloqueo, supresión donde corresponda).

Documentación oficial y actualizaciones deben consultarse siempre en fuentes del **Consejo para la Transparencia** y la normativa vigente aplicable a organismos específicos.

Para **datos sensibles** (p. ej. salud, en filiaciones de licencias), el estándar institucional debe ser **estricto**: colecta solo lo necesario, accesos por rol, conservación acotada.

**En la memoria de ingeniería** conviene escribir algo como:

> “El diseño de SIDEP se alinea a principios de **minimización** y **necesidad**: solo se almacenan atributos necesarios para la gestión operativa y administrativa definida por la compañía.”

---

## 2.2 Autenticación, roles y rutas administrativas (estado del proyecto)

### Frontend (Angular)

- **Guards de ruta:** sesión requerida (`authGuard`), rutas de invitados (`guestGuard`), **admin** (`adminGuard`) y **gestión de usuarios** (`gestionUsuariosGuard`).
- **Interceptor HTTP:** adjunta `Authorization: Bearer <token>` cuando existe token.

### Backend (Express + Prisma — referencia código)

- Middleware de **roles** (`requireRoles`, comparación de rol en mayúsculas / trim en flujos pertinentes).
- Eliminación de usuarios, por ejemplo, restringida explícitamente a **ADMIN** en la ruta correspondiente.

### Implicancia para la memoria

Separar claramente:

1. **Seguridad del cliente (UI)** — mejora UX y evita errores; **no** constituye seguridad por sí sola.
2. **Seguridad del servidor** — la **autorización efectiva** debe verificarse **en cada operación sensible en API** (lo que el código del backend intenta hacer con roles y validación).

---

## 2.3 Registro de auditoría (lo que ya existe en SIDEP)

El esquema incluye entidad tipo **`ActividadUsuario`** (nombre puede variar según migraciones) y función **`registrarActividad`** con campos como acción, módulo, referencia, detalle opcional, fecha.

**Ejemplo observable en código:** al **eliminar usuario**, se registra una actividad tipo `USUARIO_ELIMINADO` con referencia al id afectado.

**Limitación honesta para tesis:**

> “La auditoría está **parcialmente instrumentada**: algunas acciones críticas registran huella; **no** se afirma cobertura exhaustiva de todas las lecturas/modificaciones sobre datos personales hasta completar un inventario de rutas y política de retención.”

---

## 2.4 Minimización y “quién puede ver qué” (plantilla)

Usá una tabla adaptada a tus módulos reales:

| Tipo de dato | Ejemplos | Finalidad en SIDEP | Quién accede (roles) | Conservación sugerida |
|--------------|----------|---------------------|------------------------|-------------------------|
| Identificación | Nombre, correo, RUT | Directorio, parte, reportes según diseño | ADMIN, oficialidad según política | Según política institucional |
| Operativa | Partes, checklist, unidades | Coordinación y trazabilidad | Definir por rol operativo | Histórico configurable |
| Salud (si aplica licencias) | Motivo, fechas, estado | Solo gestión autorizada | Roles explícitos | Máxima restricción + base legal explícita |

**Texto sugerido:**

> “Los flujos sensibles (p. ej. licencias) deben documentarse con **procedimiento institucional**: quién aprueba, cómo se audita el acceso y plazos de archivo o anonimización cuando el dato ya no es necesario.”

---

## 2.5 Lista de mejoras priorizadas (para sección “trabajo futuro”)

| Prioridad | Medida |
|-----------|--------|
| P0 | Inventario de endpoints que exponen datos personales + matriz rol–operación |
| P0 | HTTPS obligatorio en producción; cookies o tokens con política definida |
| P1 | Extender `registrarActividad` a ediciones críticas de partes, configuración, licencias |
| P1 | Exportación de logs de auditoría para fiscalización interna (solo personal autorizado) |
| P2 | Clasificar datos en “ordinarios / sensibles” y ajustar vistas y exportaciones |

---

*Texto reutilizable en capítulos de seguridad, marco legal breve y diseño de política de datos.*
