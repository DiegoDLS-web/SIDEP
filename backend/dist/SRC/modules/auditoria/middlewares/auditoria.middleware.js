"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditoriaMiddleware = void 0;
const auditoria_service_1 = require("../services/auditoria.service");
const auditoriaMiddleware = (req, res, next) => {
    const metodoHttp = req.method;
    // Solo auditar métodos de modificación
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodoHttp)) {
        return next();
    }
    // Interceptar la respuesta para capturar el cuerpo de respuesta si es necesario (ej: ids generados)
    const originalSend = res.send;
    let responseBody = null;
    res.send = function (body) {
        try {
            if (body) {
                if (typeof body === 'string') {
                    responseBody = JSON.parse(body);
                }
                else if (typeof body === 'object') {
                    responseBody = body;
                }
            }
        }
        catch (e) {
            // Si no es JSON, no importa
        }
        return originalSend.call(this, body);
    };
    res.on('finish', async () => {
        const status = res.statusCode;
        const resultado = status >= 200 && status < 300 ? 'OK' : 'ERROR';
        const actorRut = req.user?.rut;
        const ruta = req.originalUrl;
        let accion = '';
        let entidad = '';
        let entidadId = null;
        let detalle = '';
        // Lógica de mapeo de rutas para auditoría
        if (ruta.startsWith('/api/usuarios')) {
            entidad = 'Usuario';
            const pathOnly = ruta.split('?')[0] || '';
            const parts = pathOnly.split('/');
            const lastPart = parts[parts.length - 1] || '';
            if (metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'CREAR_USUARIO' : 'CREAR_USUARIO_ERROR';
                entidadId = (responseBody?.rut || req.body?.rut || null);
                detalle = resultado === 'OK'
                    ? `Usuario ${entidadId} (${responseBody?.nombre || req.body?.nombres || ''}) creado.`
                    : `Fallo al crear usuario: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'DELETE') {
                accion = resultado === 'OK' ? 'ELIMINAR_USUARIO' : 'ELIMINAR_USUARIO_ERROR';
                entidadId = lastPart || null;
                detalle = resultado === 'OK'
                    ? `Usuario con ID ${lastPart} desactivado/eliminado.`
                    : `Fallo al eliminar usuario con ID ${lastPart}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'PATCH' && ruta.endsWith('/reset-password')) {
                accion = resultado === 'OK' ? 'RESTABLECER_PASSWORD' : 'RESTABLECER_PASSWORD_ERROR';
                entidadId = parts[parts.length - 2] || null; // El anterior a 'reset-password'
                detalle = resultado === 'OK'
                    ? `Contraseña restablecida al RUT por defecto para el usuario con ID ${entidadId}.`
                    : `Fallo al restablecer contraseña para el usuario con ID ${entidadId}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'PATCH') {
                accion = resultado === 'OK' ? 'ACTUALIZAR_USUARIO' : 'ACTUALIZAR_USUARIO_ERROR';
                entidadId = lastPart || null;
                detalle = resultado === 'OK'
                    ? `Usuario con ID ${lastPart} actualizado. Campos modificados: ${Object.keys(req.body || {}).join(', ')}`
                    : `Fallo al actualizar usuario con ID ${lastPart}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
        }
        else if (ruta.startsWith('/api/licencias')) {
            entidad = 'LicenciaMedica';
            const pathOnly = ruta.split('?')[0] || '';
            const parts = pathOnly.split('/');
            const lastPart = parts[parts.length - 1] || '';
            if (metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'SOLICITAR_LICENCIA' : 'SOLICITAR_LICENCIA_ERROR';
                entidadId = (responseBody?._uuid || responseBody?.id || null);
                detalle = resultado === 'OK'
                    ? `Licencia médica solicitada por ${actorRut} desde ${req.body?.fechaInicio} hasta ${req.body?.fechaTermino}. Motivo: ${req.body?.motivo}`
                    : `Error al solicitar licencia médica: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'PATCH' && ruta.endsWith('/estado')) {
                accion = resultado === 'OK' ? 'RESOLVER_LICENCIA' : 'RESOLVER_LICENCIA_ERROR';
                entidadId = parts[parts.length - 2] || null;
                detalle = resultado === 'OK'
                    ? `Estado de licencia médica resuelto a ${req.body?.estado?.toUpperCase()} por el oficial ${actorRut}. Obs: ${req.body?.observacionResolucion || 'Ninguna'}`
                    : `Error al cambiar estado de licencia con ID ${entidadId}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'PATCH') {
                accion = resultado === 'OK' ? 'ACTUALIZAR_LICENCIA' : 'ACTUALIZAR_LICENCIA_ERROR';
                entidadId = lastPart || null;
                detalle = resultado === 'OK'
                    ? `Licencia médica editada por su creador ${actorRut}. Campos: ${Object.keys(req.body || {}).join(', ')}`
                    : `Error al actualizar licencia con ID ${lastPart}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
        }
        else if (ruta.startsWith('/api/rrhh')) {
            if (ruta.includes('/configuraciones')) {
                entidad = 'ConfiguracionSistema';
                entidadId = '1';
                if (ruta.endsWith('/logo-compania')) {
                    accion = resultado === 'OK' ? 'SUBIR_LOGO_COMPANIA' : 'SUBIR_LOGO_COMPANIA_ERROR';
                    detalle = resultado === 'OK'
                        ? `Logo de la compañía subido correctamente por ${actorRut}.`
                        : `Error al subir logo de la compañía: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
                }
                else if (ruta.endsWith('/tipos-emergencia')) {
                    accion = resultado === 'OK' ? 'ACTUALIZAR_CATALOGO_EMERGENCIAS' : 'ACTUALIZAR_CATALOGO_EMERGENCIAS_ERROR';
                    detalle = resultado === 'OK'
                        ? `Catálogo de tipos de emergencia actualizado por ${actorRut}.`
                        : `Error al actualizar catálogo de tipos de emergencia: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
                }
                else {
                    accion = resultado === 'OK' ? 'ACTUALIZAR_CONFIGURACION_SISTEMA' : 'ACTUALIZAR_CONFIGURACION_SISTEMA_ERROR';
                    detalle = resultado === 'OK'
                        ? `Configuraciones globales actualizadas por ${actorRut}.`
                        : `Error al actualizar configuraciones globales: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
                }
            }
            else if (ruta.includes('/mi-perfil')) {
                entidad = 'Usuario';
                entidadId = (actorRut || null);
                if (ruta.endsWith('/password')) {
                    accion = resultado === 'OK' ? 'CAMBIAR_PASSWORD_PROPIA' : 'CAMBIAR_PASSWORD_PROPIA_ERROR';
                    detalle = resultado === 'OK'
                        ? `Usuario ${actorRut} cambió su propia contraseña.`
                        : `Error al cambiar contraseña propia: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
                }
                else if (ruta.endsWith('/foto')) {
                    accion = resultado === 'OK' ? 'SUBIR_FOTO_PERFIL' : 'SUBIR_FOTO_PERFIL_ERROR';
                    detalle = resultado === 'OK'
                        ? `Usuario ${actorRut} subió una nueva foto de perfil.`
                        : `Error al subir foto de perfil: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
                }
                else {
                    accion = resultado === 'OK' ? 'ACTUALIZAR_MI_PERFIL' : 'ACTUALIZAR_MI_PERFIL_ERROR';
                    detalle = resultado === 'OK'
                        ? `Usuario ${actorRut} actualizó sus propios datos de perfil. Campos: ${Object.keys(req.body || {}).join(', ')}`
                        : `Error al actualizar perfil propio: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
                }
            }
            else if (ruta.includes('/licencias/archivo')) {
                entidad = 'LicenciaMedica';
                entidadId = (req.body?.licenciaId || null);
                accion = resultado === 'OK' ? 'SUBIR_ARCHIVO_LICENCIA' : 'SUBIR_ARCHIVO_LICENCIA_ERROR';
                detalle = resultado === 'OK'
                    ? `Usuario ${actorRut} subió un archivo adjunto PDF para la licencia ${entidadId}.`
                    : `Error al subir archivo de licencia: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
            }
        }
        else if (ruta.startsWith('/api/logistica/carros')) {
            entidad = 'Carro';
            const parts = ruta.split('?')[0]?.split('/') || [];
            const lastPart = parts[parts.length - 1] || '';
            if (metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'CREAR_CARRO' : 'CREAR_CARRO_ERROR';
                entidadId = responseBody?.id ? String(responseBody.id) : null;
                detalle = resultado === 'OK'
                    ? `Carro ${responseBody?.nomenclatura || ''} creado por ${actorRut}.`
                    : `Error al crear carro: ${responseBody?.error || 'Error'}`;
            }
            else if (metodoHttp === 'PATCH' && ruta.endsWith('/estado')) {
                accion = resultado === 'OK' ? 'CAMBIAR_ESTADO_CARRO' : 'CAMBIAR_ESTADO_CARRO_ERROR';
                entidadId = parts[parts.length - 2] || null;
                const ant = responseBody?.estadoAnterior ?? '?';
                const nue = responseBody?.estadoNuevo ?? req.body?.estadoOperativo ?? '?';
                const motivo = responseBody?.motivo ?? req.body?.motivo ?? '';
                const fecha = responseBody?.fechaEfectiva ?? req.body?.fechaEfectiva ?? '';
                detalle = `Carro ID ${entidadId}: estado ${ant} → ${nue} por ${actorRut}. Motivo: ${motivo}. Fecha: ${fecha}.`;
            }
            else if (metodoHttp === 'PATCH') {
                accion = resultado === 'OK' ? 'ACTUALIZAR_CARRO' : 'ACTUALIZAR_CARRO_ERROR';
                entidadId = lastPart || null;
                detalle = `Carro ID ${lastPart} actualizado por ${actorRut}.`;
            }
        }
        else if (ruta.startsWith('/api/logistica/checklist')) {
            entidad = 'Checklist';
            const parts = ruta.split('?')[0]?.split('/') || [];
            if (ruta.includes('/ejecucion') && metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'EJECUTAR_CHECKLIST' : 'EJECUTAR_CHECKLIST_ERROR';
                entidadId = responseBody?.id ? String(responseBody.id) : null;
                detalle = `Checklist ejecutado por ${actorRut}.`;
            }
            else if (ruta.includes('/plantillas') && metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'CREAR_PLANTILLA_CHECKLIST' : 'CREAR_PLANTILLA_CHECKLIST_ERROR';
                detalle = `Plantilla de checklist creada por ${actorRut}.`;
            }
            else if (ruta.includes('/plantillas') && metodoHttp === 'PATCH') {
                accion = resultado === 'OK' ? 'ACTUALIZAR_PLANTILLA_CHECKLIST' : 'ACTUALIZAR_PLANTILLA_CHECKLIST_ERROR';
                detalle = `Plantilla de checklist actualizada por ${actorRut}.`;
            }
            else if (ruta.includes('/ejecucion') && ruta.endsWith('/estado') && metodoHttp === 'PATCH') {
                accion = resultado === 'OK' ? 'CAMBIAR_ESTADO_CHECKLIST' : 'CAMBIAR_ESTADO_CHECKLIST_ERROR';
                entidadId = parts[parts.length - 2] || null;
                const anterior = responseBody?.estadoAnterior ?? '?';
                const nuevo = responseBody?.estadoNuevo ?? req.body?.estadoChecklist ?? '?';
                const motivo = responseBody?.motivo ?? req.body?.motivo ?? '';
                const fecha = responseBody?.fechaEfectiva ?? req.body?.fechaEfectiva ?? '';
                detalle = `Checklist ejecución ${entidadId}: ${anterior} → ${nuevo} por ${actorRut}. Motivo: ${motivo}. Fecha: ${fecha}.`;
            }
        }
        else if (ruta.startsWith('/api/logistica/equipamiento')) {
            entidad = 'Equipamiento';
            if (metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'ASIGNAR_MATERIAL' : 'ASIGNAR_MATERIAL_ERROR';
                detalle = `Material asignado a carro por ${actorRut}.`;
            }
        }
        else if (ruta.startsWith('/api/auth')) {
            entidad = 'Sesion';
            if (metodoHttp === 'POST' && ruta.includes('/login')) {
                accion = resultado === 'OK' ? 'LOGIN' : 'LOGIN_ERROR';
                entidadId = (responseBody?.data?.usuario?.rut || req.body?.rut || null);
                detalle = resultado === 'OK'
                    ? `Inicio de sesión exitoso para ${entidadId || 'usuario'}.`
                    : `Intento de inicio de sesión fallido: ${responseBody?.message || 'credenciales inválidas'}`;
            }
            else if (metodoHttp === 'POST' && ruta.includes('/logout')) {
                accion = 'LOGOUT';
                entidadId = (actorRut || null);
                detalle = `Cierre de sesión de ${actorRut || 'usuario'}.`;
            }
            else if (metodoHttp === 'POST' && ruta.includes('/register')) {
                accion = resultado === 'OK' ? 'REGISTRO_USUARIO' : 'REGISTRO_USUARIO_ERROR';
                entidadId = (responseBody?.data?.rut || req.body?.rut || null);
                detalle = resultado === 'OK'
                    ? `Registro de usuario ${entidadId}.`
                    : `Fallo al registrar usuario: ${responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'POST' && ruta.includes('/recuperar-password')) {
                accion = resultado === 'OK' ? 'SOLICITAR_RECUPERAR_PASSWORD' : 'SOLICITAR_RECUPERAR_PASSWORD_ERROR';
                entidadId = (req.body?.email || null);
                detalle = resultado === 'OK'
                    ? `Solicitud de recuperación de contraseña para ${entidadId || 'correo'}.`
                    : `Fallo al solicitar recuperación: ${responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'POST' && ruta.includes('/restablecer-password')) {
                accion = resultado === 'OK' ? 'RESTABLECER_PASSWORD_EMAIL' : 'RESTABLECER_PASSWORD_EMAIL_ERROR';
                detalle = resultado === 'OK'
                    ? 'Contraseña restablecida mediante enlace de correo.'
                    : `Fallo al restablecer contraseña por enlace: ${responseBody?.message || 'Error desconocido'}`;
            }
        }
        else if (ruta.startsWith('/api/operaciones/partes')) {
            entidad = 'ParteEmergencia';
            const pathOnly = ruta.split('?')[0] || '';
            const parts = pathOnly.split('/');
            const lastPart = parts[parts.length - 1] || '';
            if (metodoHttp === 'POST' && !ruta.includes('/asistencias')) {
                accion = resultado === 'OK' ? 'CREAR_PARTE' : 'CREAR_PARTE_ERROR';
                entidadId = (responseBody?.id || responseBody?.data?.id || null);
                detalle = resultado === 'OK'
                    ? `Parte ${entidadId || ''} creado por ${actorRut}.`
                    : `Error al crear parte: ${responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'PATCH') {
                accion = resultado === 'OK' ? 'ACTUALIZAR_PARTE' : 'ACTUALIZAR_PARTE_ERROR';
                entidadId = lastPart || null;
                detalle = resultado === 'OK'
                    ? `Parte ${lastPart} actualizado por ${actorRut}.`
                    : `Error al actualizar parte ${lastPart}: ${responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'DELETE') {
                accion = resultado === 'OK' ? 'ANULAR_PARTE' : 'ANULAR_PARTE_ERROR';
                entidadId = lastPart || null;
                detalle = resultado === 'OK'
                    ? `Parte ${lastPart} anulado por ${actorRut}.`
                    : `Error al anular parte ${lastPart}: ${responseBody?.message || 'Error desconocido'}`;
            }
        }
        else if (ruta.startsWith('/api/operaciones/asistencia')) {
            entidad = 'AsistenciaPersonal';
            const pathOnly = ruta.split('?')[0] || '';
            const parts = pathOnly.split('/');
            const lastPart = parts[parts.length - 1] || '';
            if (metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'REGISTRAR_ASISTENCIA' : 'REGISTRAR_ASISTENCIA_ERROR';
                entidadId = (responseBody?.id || responseBody?.data?.id || req.body?.parteId || null);
                detalle = resultado === 'OK'
                    ? `Asistencia registrada para parte ${req.body?.parteId} (voluntario ${req.body?.usuarioRut}).`
                    : `Error al registrar asistencia: ${responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'DELETE') {
                accion = resultado === 'OK' ? 'ELIMINAR_ASISTENCIA' : 'ELIMINAR_ASISTENCIA_ERROR';
                entidadId = lastPart || null;
                detalle = resultado === 'OK'
                    ? `Asistencia ${lastPart} eliminada por ${actorRut}.`
                    : `Error al eliminar asistencia ${lastPart}: ${responseBody?.message || 'Error desconocido'}`;
            }
        }
        else if (ruta.startsWith('/api/operaciones/partes/') && ruta.includes('/asistencias')) {
            entidad = 'AsistenciaPersonal';
            const pathOnly = ruta.split('?')[0] || '';
            const parts = pathOnly.split('/');
            if (metodoHttp === 'POST') {
                accion = resultado === 'OK' ? 'REGISTRAR_ASISTENCIA' : 'REGISTRAR_ASISTENCIA_ERROR';
                entidadId = parts[parts.length - 2] || null;
                detalle = resultado === 'OK'
                    ? `Asistencia agregada al parte ${entidadId} por ${actorRut}.`
                    : `Error al agregar asistencia: ${responseBody?.message || 'Error desconocido'}`;
            }
            else if (metodoHttp === 'DELETE') {
                accion = resultado === 'OK' ? 'ELIMINAR_ASISTENCIA' : 'ELIMINAR_ASISTENCIA_ERROR';
                entidadId = parts[parts.length - 1] || null;
                detalle = resultado === 'OK'
                    ? `Asistencia ${entidadId} eliminada del parte por ${actorRut}.`
                    : `Error al eliminar asistencia: ${responseBody?.message || 'Error desconocido'}`;
            }
        }
        if (accion) {
            await (0, auditoria_service_1.registrarAccion)({
                usuarioRut: actorRut || null,
                accion,
                entidad,
                entidadId: entidadId ? String(entidadId) : null,
                metodoHttp,
                ruta,
                ipOrigen: req.ip || null,
                userAgent: req.headers['user-agent'] || null,
                detalle,
                resultado,
            });
        }
    });
    next();
};
exports.auditoriaMiddleware = auditoriaMiddleware;
