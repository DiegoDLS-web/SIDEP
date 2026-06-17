import { Request, Response, NextFunction } from 'express';
import { registrarAccion } from '../services/auditoria.service';

export const auditoriaMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const metodoHttp = req.method;

  // Solo auditar métodos de modificación
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodoHttp)) {
    return next();
  }

  // Interceptar la respuesta para capturar el cuerpo de respuesta si es necesario (ej: ids generados)
  const originalSend = res.send;
  let responseBody: any = null;

  res.send = function (body) {
    try {
      if (body) {
        if (typeof body === 'string') {
          responseBody = JSON.parse(body);
        } else if (typeof body === 'object') {
          responseBody = body;
        }
      }
    } catch (e) {
      // Si no es JSON, no importa
    }
    return originalSend.call(this, body);
  };

  res.on('finish', async () => {
    const status = res.statusCode;
    const resultado = status >= 200 && status < 300 ? 'OK' : 'ERROR';
    const actorRut = (req as any).user?.rut;
    const ruta = req.originalUrl;

    let accion = '';
    let entidad = '';
    let entidadId: string | null = null;
    let detalle = '';

    // Lógica de mapeo de rutas para auditoría
    if (ruta.startsWith('/api/usuarios')) {
      entidad = 'Usuario';
      const pathOnly = ruta.split('?')[0] || '';
      const parts = pathOnly.split('/');
      const lastPart = parts[parts.length - 1] || '';

      if (metodoHttp === 'POST') {
        accion = resultado === 'OK' ? 'CREAR_USUARIO' : 'CREAR_USUARIO_ERROR';
        entidadId = (responseBody?.rut || req.body?.rut || null) as string | null;
        detalle = resultado === 'OK'
          ? `Usuario ${entidadId} (${responseBody?.nombre || req.body?.nombres || ''}) creado.`
          : `Fallo al crear usuario: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
      } else if (metodoHttp === 'DELETE') {
        accion = resultado === 'OK' ? 'ELIMINAR_USUARIO' : 'ELIMINAR_USUARIO_ERROR';
        entidadId = lastPart || null;
        detalle = resultado === 'OK'
          ? `Usuario con ID ${lastPart} desactivado/eliminado.`
          : `Fallo al eliminar usuario con ID ${lastPart}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
      } else if (metodoHttp === 'PATCH' && ruta.endsWith('/reset-password')) {
        accion = resultado === 'OK' ? 'RESTABLECER_PASSWORD' : 'RESTABLECER_PASSWORD_ERROR';
        entidadId = parts[parts.length - 2] || null; // El anterior a 'reset-password'
        detalle = resultado === 'OK'
          ? `Contraseña restablecida al RUT por defecto para el usuario con ID ${entidadId}.`
          : `Fallo al restablecer contraseña para el usuario con ID ${entidadId}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
      } else if (metodoHttp === 'PATCH') {
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
        entidadId = (responseBody?._uuid || responseBody?.id || null) as string | null;
        detalle = resultado === 'OK'
          ? `Licencia médica solicitada por ${actorRut} desde ${req.body?.fechaInicio} hasta ${req.body?.fechaTermino}. Motivo: ${req.body?.motivo}`
          : `Error al solicitar licencia médica: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
      } else if (metodoHttp === 'PATCH' && ruta.endsWith('/estado')) {
        accion = resultado === 'OK' ? 'RESOLVER_LICENCIA' : 'RESOLVER_LICENCIA_ERROR';
        entidadId = parts[parts.length - 2] || null;
        detalle = resultado === 'OK'
          ? `Estado de licencia médica resuelto a ${req.body?.estado?.toUpperCase()} por el oficial ${actorRut}. Obs: ${req.body?.observacionResolucion || 'Ninguna'}`
          : `Error al cambiar estado de licencia con ID ${entidadId}: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
      } else if (metodoHttp === 'PATCH') {
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
        } else if (ruta.endsWith('/tipos-emergencia')) {
          accion = resultado === 'OK' ? 'ACTUALIZAR_CATALOGO_EMERGENCIAS' : 'ACTUALIZAR_CATALOGO_EMERGENCIAS_ERROR';
          detalle = resultado === 'OK'
            ? `Catálogo de tipos de emergencia actualizado por ${actorRut}.`
            : `Error al actualizar catálogo de tipos de emergencia: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
        } else {
          accion = resultado === 'OK' ? 'ACTUALIZAR_CONFIGURACION_SISTEMA' : 'ACTUALIZAR_CONFIGURACION_SISTEMA_ERROR';
          detalle = resultado === 'OK'
            ? `Configuraciones globales actualizadas por ${actorRut}.`
            : `Error al actualizar configuraciones globales: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
        }
      }
      else if (ruta.includes('/mi-perfil')) {
        entidad = 'Usuario';
        entidadId = (actorRut || null) as string | null;

        if (ruta.endsWith('/password')) {
          accion = resultado === 'OK' ? 'CAMBIAR_PASSWORD_PROPIA' : 'CAMBIAR_PASSWORD_PROPIA_ERROR';
          detalle = resultado === 'OK'
            ? `Usuario ${actorRut} cambió su propia contraseña.`
            : `Error al cambiar contraseña propia: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
        } else if (ruta.endsWith('/foto')) {
          accion = resultado === 'OK' ? 'SUBIR_FOTO_PERFIL' : 'SUBIR_FOTO_PERFIL_ERROR';
          detalle = resultado === 'OK'
            ? `Usuario ${actorRut} subió una nueva foto de perfil.`
            : `Error al subir foto de perfil: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
        } else {
          accion = resultado === 'OK' ? 'ACTUALIZAR_MI_PERFIL' : 'ACTUALIZAR_MI_PERFIL_ERROR';
          detalle = resultado === 'OK'
            ? `Usuario ${actorRut} actualizó sus propios datos de perfil. Campos: ${Object.keys(req.body || {}).join(', ')}`
            : `Error al actualizar perfil propio: ${responseBody?.error || responseBody?.message || 'Error desconocido'}`;
        }
      }
      else if (ruta.includes('/licencias/archivo')) {
        entidad = 'LicenciaMedica';
        entidadId = (req.body?.licenciaId || null) as string | null;
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
      } else if (metodoHttp === 'PATCH' && ruta.endsWith('/estado')) {
        accion = resultado === 'OK' ? 'CAMBIAR_ESTADO_CARRO' : 'CAMBIAR_ESTADO_CARRO_ERROR';
        entidadId = parts[parts.length - 2] || null;
        detalle = `Estado operativo del carro ID ${entidadId} modificado por ${actorRut}.`;
      } else if (metodoHttp === 'PATCH') {
        accion = resultado === 'OK' ? 'ACTUALIZAR_CARRO' : 'ACTUALIZAR_CARRO_ERROR';
        entidadId = lastPart || null;
        detalle = `Carro ID ${lastPart} actualizado por ${actorRut}.`;
      }
    }
    else if (ruta.startsWith('/api/logistica/checklist')) {
      entidad = 'Checklist';
      if (ruta.includes('/ejecucion') && metodoHttp === 'POST') {
        accion = resultado === 'OK' ? 'EJECUTAR_CHECKLIST' : 'EJECUTAR_CHECKLIST_ERROR';
        entidadId = responseBody?.id ? String(responseBody.id) : null;
        detalle = `Checklist ejecutado por ${actorRut}.`;
      } else if (ruta.includes('/plantillas') && metodoHttp === 'POST') {
        accion = resultado === 'OK' ? 'CREAR_PLANTILLA_CHECKLIST' : 'CREAR_PLANTILLA_CHECKLIST_ERROR';
        detalle = `Plantilla de checklist creada por ${actorRut}.`;
      } else if (ruta.includes('/plantillas') && metodoHttp === 'PATCH') {
        accion = resultado === 'OK' ? 'ACTUALIZAR_PLANTILLA_CHECKLIST' : 'ACTUALIZAR_PLANTILLA_CHECKLIST_ERROR';
        detalle = `Plantilla de checklist actualizada por ${actorRut}.`;
      }
    }
    else if (ruta.startsWith('/api/logistica/equipamiento')) {
      entidad = 'Equipamiento';
      if (metodoHttp === 'POST') {
        accion = resultado === 'OK' ? 'ASIGNAR_MATERIAL' : 'ASIGNAR_MATERIAL_ERROR';
        detalle = `Material asignado a carro por ${actorRut}.`;
      }
    }

    if (accion) {
      await registrarAccion({
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
