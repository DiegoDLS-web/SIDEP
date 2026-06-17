# Reporte Exhaustivo de Auditoría de Código (SIDEP)

Este reporte evalúa en detalle el estado de cumplimiento de los **101 requerimientos funcionales (RF-01 a RF-101)**. Se detallan los archivos del **Backend** (Express / Prisma) y **Frontend** (Angular) donde se implementa cada funcionalidad, especificando si el flujo está completamente conectado y operativo, inactivo por problemas de enrutamiento, parcialmente implementado o ausente.

---

## 🔑 Mapeo de Estados
*   🟢 **CUMPLIDO / OPERATIVO**: Lógica programada en front y back, rutas de API conectadas y funcionando.
*   🟡 **IMPLEMENTADO PERO INACTIVO**: El código del backend está completamente escrito (servicios/controladores), pero la ruta **no está montada** en `backend/app.ts`, lo que impide su uso.
*   🟠 **PARCIALMENTE IMPLEMENTADO**: Solo implementado en el frontend, o el backend ignora campos clave necesarios para el flujo.
*   🔴 **NO IMPLEMENTADO**: No existe código en el backend ni en el frontend para este requerimiento.

---

## 🔍 Análisis Detallado Requisito por Requisito

### Módulo de Autenticación

#### RF-01: Iniciar sesión mediante RUT y contraseña.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: 
    *   Servicio: [autenticacion.service.ts:L32](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/autenticacion/autenticacion.service.ts#L32) (`loginUsuario`) busca el usuario por RUT, verifica que esté activo y compara hashes.
    *   Controlador/Rutas: [autenticacion.controller.ts:L28](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/autenticacion/autenticacion.controller.ts#L28) y [autenticacion.routes.ts:L9](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/autenticacion/autenticacion.routes.ts#L9) exponen `POST /api/auth/login`.
*   **Frontend**: 
    *   Servicio: [auth.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/frontend/src/app/services/auth.service.ts) llama a `/auth/login` y almacena el JWT.
    *   Componente: `login.component.ts` gestiona el formulario de entrada.

#### RF-02: Validar el formato y dígito verificador del RUT.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: 
    *   Utilidad: [rut.util.ts:L15](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/utils/rut.util.ts#L15) (`validarRut`) implementa el algoritmo Módulo 11 chileno.
    *   Llamado en: `login` y `register` en los controladores de autenticación y RRHH.
*   **Frontend**: Validador personalizado de RUT en formularios reactivos para registro y edición de usuarios.

#### RF-03: Generar tokens JWT para usuarios autenticados.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Genera el token usando `jwt.sign` firmado con la clave secreta `JWT_SECRET` en `autenticacion.service.ts:L57`.

#### RF-04: Permitir cerrar sesión.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Ruta `/api/auth/logout` mapeada en [autenticacion.routes.ts:L14](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/autenticacion/autenticacion.routes.ts#L14).
*   **Frontend**: `AuthService` elimina el token de `localStorage` y redirige a la pantalla de login.

#### RF-05: Permitir obtener la información del usuario autenticado.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Ruta `/api/auth/me` mapeada en [autenticacion.routes.ts:L13](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/autenticacion/autenticacion.routes.ts#L13) que devuelve los datos del payload decodificado del JWT.
*   **Frontend**: Se invoca en cada refresco de página para reconstruir el estado de la sesión activa.

#### RF-06: Almacenar contraseñas utilizando hash seguro.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Utiliza `bcrypt.hash` con 10 salt rounds al momento de crear usuarios en [usuarios.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L224) o registrarse en [autenticacion.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/autenticacion/autenticacion.service.ts#L15).

#### RF-07: Restringir accesos según rol.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Middleware [role.middleware.ts:L4](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/middlewares/role.middleware.ts#L4) (`requireRoles`) que realiza la verificación de roles y estados directamente en base de datos.
*   **Frontend**: `RoleGuard` protege las rutas Angular contra usuarios no autorizados.

#### RF-08: Permitir cambiar contraseña.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Endpoint `PATCH /api/rrhh/mi-perfil/password` llama a `cambiarMiPassword` en [rrhh.controller.ts:L117](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/controllers/rrhh.controller.ts#L117) y procesa la modificación de la contraseña propia mediante hash `bcrypt`.

---

### Módulo RRHH - Gestión de Usuarios

#### RF-09: Registrar usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `POST /api/usuarios` expuesto en [usuarios.routes.ts:L21](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/usuarios.routes.ts#L21) que consume `crearUsuario` en [usuarios.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L158).
*   **Frontend**: Formulario reactivo de registro de usuarios en `usuarios.component.ts`.

#### RF-10: Modificar usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `PATCH /api/usuarios/:rut` expuesto en [usuarios.routes.ts:L22](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/usuarios.routes.ts#L22) que consume `actualizarUsuario` en [usuarios.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L284).

#### RF-11: Desactivar usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `DELETE /api/usuarios/:rut` en [usuarios.routes.ts:L23](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/usuarios.routes.ts#L23) llama a `eliminarUsuario`. Si tiene dependencias de claves ajenas en DB (como partes de emergencias), realiza un soft delete desactivando al voluntario (`activo: 0`) en [usuarios.service.ts:L473](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L473).

#### RF-12: Consultar usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/usuarios` (directorio completo) y `GET /api/usuarios/pagina` (paginado) expuestos en [usuarios.routes.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/usuarios.routes.ts).

#### RF-13: Buscar usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `listarUsuariosPaginado` en [usuarios.service.ts:L87](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L87) incluye una cláusula `OR` que busca por texto (`q`) en RUT, nombres, apellidos, rol, cargo, etc.

#### RF-14: Filtrar usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Permite filtrar por `estado` voluntario, `tipoVoluntario` y `cargo` en [usuarios.service.ts:L106-L128](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L106-L128).

#### RF-15: Restablecer contraseñas.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `PATCH /api/usuarios/:rut/reset-password` expuesto en [usuarios.routes.ts:L24](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/usuarios.routes.ts#L24) llama a `resetPassword` que re-hashea el RUT sin puntos ni guion como contraseña temporal.

#### RF-16: Almacenar fotografías de perfil.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Sube las fotos a la carpeta `sidep/perfiles` de Cloudinary a través de `StorageService` en [usuarios.service.ts:L202](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L202) y [rrhh.service.ts:L108](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/rrhh.service.ts#L108).

#### RF-17: Almacenar firmas digitales.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Sube las firmas a la carpeta `sidep/firmas` de Cloudinary.

#### RF-18 a RF-21: Gestionar cargos, tipos, estados y grupos sanguíneos.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Soportados a través de tablas de catálogo dedicadas en [schema.prisma](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/prisma/schema.prisma) (`CatalogoCargoOficialidad`, `CatalogoTipoVoluntario`, `CatalogoEstadoVoluntario`, `CatalogoGrupoSanguineo`) asociadas al usuario y resueltas al crear/actualizar personal.

#### RF-22: Generar métricas de personal.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/usuarios/metricas` llama a `obtenerMetricasUsuarios` en [usuarios.service.ts:L35](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/usuarios.service.ts#L35) devolviendo agregados de activos, con licencia y suspendidos.
*   **Frontend**: Muestra las tarjetas con estas métricas en la parte superior del módulo de Administración de Usuarios.

---

### Mi Perfil

#### RF-23: Visualizar perfil propio.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/rrhh/mi-perfil` mapeado a `getMiPerfil` en [rrhh.controller.ts:L5](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/controllers/rrhh.controller.ts#L5).

#### RF-24: Actualizar datos personales.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `PATCH /api/rrhh/mi-perfil` mapeado a `patchMiPerfil` en [rrhh.controller.ts:L21](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/controllers/rrhh.controller.ts#L21).

#### RF-25: Cambiar fotografía de perfil.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Carga directa mediante multipart a Cloudinary usando la ruta `/api/rrhh/mi-perfil/foto` en [rrhh.routes.ts:L22](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/rrhh.routes.ts#L22).

#### RF-26: Consultar resumen operativo propio.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/rrhh/mi-resumen-operativo` en [rrhh.routes.ts:L19](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/rrhh.routes.ts#L19) devuelve un consolidado de asistencias anuales/mensuales, licencias médicas y últimas emergencias atendidas.
*   **Frontend**: Carga los datos en la pestaña "Resumen Operativo" del perfil de usuario.

---

### Licencias Médicas

#### RF-27: Solicitar licencias médicas.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `POST /api/licencias` llama a `crearLicencia` en [licencias.service.ts:L92](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/licencias.service.ts#L92).

#### RF-28: Adjuntar documentos de respaldo.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `/api/rrhh/licencias/archivo` en [rrhh.routes.ts:L23](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/routes/rrhh.routes.ts#L23) recibe un PDF adjunto y lo sube de forma cruda (`raw`) a Cloudinary.

#### RF-29: Modificar solicitudes pendientes.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `PATCH /api/licencias/:id` permite modificar motivo y fechas de la licencia únicamente si el estado de esta es `PENDIENTE` en [licencias.service.ts:L144](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/licencias.service.ts#L144).

#### RF-30 a RF-32: Aprobar, rechazar y anular licencias médicas.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Modifica el estado llamando a `cambiarEstado` en [licencias.service.ts:L194](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/licencias.service.ts#L194) con el RUT del resolutor, fecha de resolución y observaciones opcionales.

#### RF-33: Consultar licencias vigentes.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/licencias/activas` mapeado a `listarActivas` en [licencias.service.ts:L221](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/licencias.service.ts#L221).

#### RF-34: Generar resúmenes de licencias.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/licencias/resumen` expone la función `obtenerResumen` para consolidar las licencias diarias en [licencias.service.ts:L248](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/rrhh/services/licencias.service.ts#L248).

---

### Módulo Operaciones - Partes de Emergencia

#### RF-35: Registrar partes de emergencia.
*   **Estado**: 🟠 **PARCIALMENTE IMPLEMENTADO**
*   **Backend**: La ruta activa `/api/operaciones/partes` (POST) en [operaciones.routes.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/operaciones.routes.ts) llama a `crearParteEmergencia` en [operaciones.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/operaciones.service.ts#L20), el cual **no** asocia carros participantes ni roster de asistencia (solo guarda datos generales y civiles). El código con la transacción completa para guardar las relaciones (`crearParteConRelaciones`) está inactivo en [partes.service.ts:L6](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/services/partes.service.ts#L6).

#### RF-36: Consultar partes de emergencia.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Exige autenticación y llama a `obtenerPartes` que retorna la lista ordenada por fecha en [operaciones.service.ts:L6](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/operaciones.service.ts#L6).

#### RF-37: Consultar el detalle de un parte.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: `obtenerPorId` en [partes.service.ts:L75](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/services/partes.service.ts#L75) e incluye relaciones completas (asistencias, carros, obac). Sin embargo, la ruta `GET /:id` no está expuesta en la API.

#### RF-38: Modificar partes de emergencia.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: `actualizarParte` está programado en [partes.service.ts:L88](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/services/partes.service.ts#L88), pero no expuesto en la API.

#### RF-39: Anular partes de emergencia.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: `anularParte` está programado en [partes.service.ts:L100](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/services/partes.service.ts#L100), pero no expuesto en la API.

#### RF-40 a RF-42: Registrar correlativo, clave y estado de parte.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Guardados como campos obligatorios `correlativo`, `claveId`, y `estadoId` en `ParteEmergencia`.

#### RF-43: Registrar dirección y referencia del incidente.
*   **Estado**: 🟠 **PARCIALMENTE IMPLEMENTADO**
*   **Backend**: La base de datos y el servicio inactivo guardan `referenciaLugar`. Sin embargo, el endpoint activo ignora esta variable y solo almacena `direccion`.

#### RF-44: Registrar fecha y hora de la emergencia.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Almacena `fechaEmergencia` (DateTime) obligatoriamente.

#### RF-45: Registrar el trabajo realizado.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Programado en la tabla (`trabajoRealizado`) y en el servicio modular de partes, pero ignorado por el endpoint activo.

#### RF-46: Registrar al oficial a cargo (OBAC).
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Almacena `obacRut` vinculado a la tabla de usuarios.

#### RF-47: Registrar vehículos civiles involucrados.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Procesado y creado mediante relación `vehiculosCiviles` en la API activa de [operaciones.service.ts:L44](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/operaciones.service.ts#L44).

#### RF-48: Registrar carros participantes.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Programado en el servicio inactivo mapeando a `UnidadEnEmergencia` en [partes.service.ts:L47](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/services/partes.service.ts#L47), pero ausente en la API activa.

---

### Asistencia a Emergencias

#### RF-49: Registrar la asistencia de voluntarios a una emergencia.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Programado en el servicio transaccional `crearParteConRelaciones` en [partes.service.ts:L27](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/operaciones/services/partes.service.ts#L27) mapeado a `asistenciaPersonal`, pero inactivo en API.

#### RF-50: Asociar la asistencia a un parte de emergencia.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Relación de base de datos implementada (tabla `asistencia_personal` intermedia con FKey a `parte_emergencia`), inactiva en API.

#### RF-51: Registrar fecha y hora de participación.
*   **Estado**: 🟠 **PARCIALMENTE IMPLEMENTADO**
*   **Backend**: Se almacena fecha y hora de salida/llegada de los carros en `UnidadEnEmergencia` (carros y conductores), pero la asistencia general de voluntarios solo asocia presencia en el parte.

#### RF-52: Permitir consultar la asistencia de una emergencia.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Programado al obtener detalles de un parte (`obtenerPorId` incluye asistencias y usuarios), inactivo en API.

#### RF-53: Permitir consultar el historial de asistencia de un voluntario.
*   **Estado**: 🔴 **NO IMPLEMENTADO**
*   **Backend**: No existe código para buscar asistencias por RUT de otro voluntario.
*   **Frontend**: Presenta una vista para la consulta pero no recibe datos de la API.

#### RF-54: Permitir modificar registros de asistencia.
*   **Estado**: 🔴 **NO IMPLEMENTADO**
*   **Backend**: No hay lógica de actualización de asistencias (sólo inserción inicial).

#### RF-55: Generar estadísticas de asistencia por voluntario.
*   **Estado**: 🟠 **PARCIALMENTE IMPLEMENTADO**
*   **Backend**: Solo funciona para el usuario autenticado (Mi Perfil) a través de `obtenerMiResumenOperativo`. No hay estadísticas globales por voluntario expuestas.

#### RF-56: Generar estadísticas de asistencia por período.
*   **Estado**: 🔴 **NO IMPLEMENTADO**
*   **Backend**: No hay lógica en el backend ya que el módulo de analítica está completamente vacío.

---

### Módulo Logística - Gestión de Carros

#### RF-57: Permitir registrar carros.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Lógica programada en `addCarro` en [carros.controller.ts:L4](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/controllers/carros.controller.ts#L4) y `crearCarro` en `carros.service.ts`, pero la ruta no se expone.

#### RF-58: Permitir modificar carros.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Lógica programada en `editCarro` en [carros.controller.ts:L25](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/controllers/carros.controller.ts#L25) e inactiva.

#### RF-59: Permitir consultar carros.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `GET /api/logistica/carros` mapea a `getCarros` en [logistica.controller.ts:L5](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/logistica.controller.ts#L5) devolviendo carros en estado operativo.

#### RF-60: Permitir desactivar carros.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Programado como `toggleEstadoCarro` en el controlador inactivo.

#### RF-61 a RF-64: Atributos de carros (nomenclatura, patente, kilometraje y estado).
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Atributos definidos en modelo `Carro` de Prisma y leídos en la consulta de carros activos.

---

### Checklists

#### RF-65 / RF-66: Crear y modificar plantillas de checklist.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Funciones programadas en `checklists.controller.ts` (`addPlantilla`/`editPlantilla`), inactivas en API.

#### RF-67: Permitir ejecutar checklists.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `POST /api/logistica/checklist` mapeado a `registrarChecklist` en [logistica.controller.ts:L22](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/logistica.controller.ts#L22).

#### RF-68: Almacenar respuestas dinámicas en formato JSON.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Almacena las respuestas serializadas como string de JSON en la base de datos (campo `respuestasJson` de `ChecklistEjecucion`).

#### RF-69: Asociar checklists a carros.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Vinculado guardando el ID del carro en el campo genérico `entidadId` y seteando `entidadTipo: 'CARRO'`.

#### RF-70 a RF-72: Registrar fecha de revisión, revisor e historial.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Almacena automáticamente `fechaRevision` (DateTime), `revisorRut` e inserta los registros históricos en la tabla `ChecklistEjecucion`.

#### RF-73: Permitir consultar checklists históricos.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Programado en `getHistorial` en el controlador de checklists inactivo, pero no expuesto en la API activa.

---

### Equipamiento

#### RF-74: Registrar equipamiento asociado a carros.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Lógica programada en `addMaterialCarro` en [equipamiento.controller.ts:L34](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/controllers/equipamiento.controller.ts#L34), inactiva en API.

#### RF-75: Registrar material menor.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (Definido en el modelo `CatalogoMaterial` e inactivo en APIs de inserción).

#### RF-76: Registrar bolsos de trauma.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Lógica programada en `addBolsoTrauma` en [equipamiento.controller.ts:L6](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/controllers/equipamiento.controller.ts#L6), inactiva en API.

#### RF-77: Registrar equipos ERA.
*   **Estado**: 🟠 **PARCIALMENTE IMPLEMENTADO**
*   **Backend**: Manejado lógicamente a nivel de checklist dinámico, pero sin poseer un modelo de base de datos específico para cada equipo ERA físico.

#### RF-78: Permitir consultar disponibilidad de equipamiento.
*   **Estado**: 🟡 **IMPLEMENTADO PERO INACTIVO**
*   **Backend**: Lógica para obtener el inventario de un carro programada en `getInventarioCarro` en [equipamiento.controller.ts:L18](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/logistica/controllers/equipamiento.controller.ts#L18), inactiva en API.

---

### Configuración del Sistema

#### RF-79: Administrar información institucional.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `PATCH /api/rrhh/configuraciones` modifica datos globales almacenados en `ConfiguracionSistema`.

#### RF-80: Administrar el logo institucional.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Subida de logo de compañía a Cloudinary mapeada en `/api/rrhh/configuraciones/logo-compania`.

#### RF-81: Administrar tipos de emergencia.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: `/api/rrhh/configuraciones/tipos-emergencia` guarda los tipos de emergencia dinámicos serializados como texto.

#### RF-82: Configurar navegación según rol.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: El endpoint `/api/auth/mi-navegacion` lee `navegacionPorRol` de la base de datos (con fallback estático) para retornar los accesos permitidos.

#### RF-83: Configurar formatos de reportes.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Permite guardar en BD configuraciones de reportes como `logosPdf` u `orientacionPdf`.

---

### Reportes y Analítica

#### RF-84 a RF-89: Generación de estadísticas.
*   **Estado**: 🔴 **NO IMPLEMENTADO (FALTA BACKEND)**
*   **Backend**: **Ausente**. El módulo de analítica no tiene lógica.
*   **Frontend**: Intenta consumir `/api/reportes/emergencias`, `/api/reportes/cuadro-honor` y `/api/reportes/analitica-operacional` resultando en **errores HTTP 404**.

#### RF-90: Exportar reportes en PDF.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Frontend**: Implementado exitosamente del lado del cliente usando la librería `jsPDF` y `jsPDF-AutoTable` en [pdf-export.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/frontend/src/app/services/pdf-export.service.ts#L101).

#### RF-91: Exportar reportes en Excel.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Frontend**: Implementado en el cliente mediante la librería `xlsx` en [partes-export.service.ts](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/frontend/src/app/services/partes-export.service.ts#L2) y varios componentes de página.

---

### Módulo Auditoría

#### RF-92: Registrar acciones realizadas por los usuarios.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Middleware de interceptación de solicitudes mutables (`POST`, `PUT`, `PATCH`, `DELETE`) en [auditoria.middleware.ts:L4](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/auditoria/middlewares/auditoria.middleware.ts#L4) que persiste las acciones.

#### RF-93: Registrar eventos de autenticación.
*   **Estado**: 🔴 **NO IMPLEMENTADO**
*   **Backend**: El middleware de auditoría omite interceptar o procesar peticiones a la ruta `/api/auth/login`. Tampoco se registran auditorías directamente en el controlador de inicio de sesión.

#### RF-94: Registrar modificaciones de datos.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (El middleware captura los cambios de usuarios, licencias y configuraciones).

#### RF-95: Registrar usuario responsable de una acción.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (Almacena `usuarioRut` obtenido del token decodificado).

#### RF-96: Registrar entidad afectada.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (Almacena `entidad` y `entidadId` del registro afectado).

#### RF-97: Registrar dirección IP y agente de usuario.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (Almacena `ipOrigen` y `userAgent` en el middleware).

#### RF-98: Registrar fecha y hora de cada evento.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (Establecido por Prisma en `createdAt`).

#### RF-99: Permitir consultar registros de auditoría.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Endpoint `GET /api/auditoria` expuesto y protegido para administradores en [auditoria.routes.ts:L9](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/auditoria/routes/auditoria.routes.ts#L9).
*   **Frontend**: Carga los datos de auditoría en tablas paginadas en `auditoria.component.ts`.

#### RF-100: Permitir filtrar registros de auditoría.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO**
*   **Backend**: Filtra en `listarAuditoria` por RUT, acción, entidad y rango de fechas en [auditoria.service.ts:L56](file:///c:/Users/luis_/OneDrive/Documentos/SIDEP-1/backend/SRC/modules/auditoria/services/auditoria.service.ts#L56).

#### RF-101: Permitir exportar registros de auditoría.
*   **Estado**: 🟢 **CUMPLIDO / OPERATIVO** (Soportado mediante exportación a Excel del lado del Frontend).
