import { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';
import { registrarAccion } from '../../auditoria/services/auditoria.service';

export const getUsuarios = async (req: Request, res: Response) => {
  try {
    const list = await usuariosService.listarUsuarios();
    return res.status(200).json(list);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET USUARIOS:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener usuarios' });
  }
};

export const getMetricas = async (req: Request, res: Response) => {
  try {
    const metricas = await usuariosService.obtenerMetricasUsuarios();
    return res.status(200).json(metricas);
  } catch (error: any) {
    console.error('🔥 ERROR EN METRICAS USUARIOS:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener métricas' });
  }
};

export const getUsuariosPaginado = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 9;
    const q = req.query.q as string | undefined;
    const estado = req.query.estado as string | undefined;
    const tipoVoluntario = req.query.tipoVoluntario as string | undefined;
    const cargo = req.query.cargo as string | undefined;

    const data = await usuariosService.listarUsuariosPaginado(page, pageSize, q, estado, tipoVoluntario, cargo);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET USUARIOS PAGINADO:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener paginación' });
  }
};

export const getUsuarioById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const usuario = await usuariosService.buscarUsuarioPorId(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Convert map to DTO
    const { mapUsuarioToDto } = require('../services/rrhh.service');
    return res.status(200).json(mapUsuarioToDto(usuario));
  } catch (error: any) {
    console.error('🔥 ERROR EN GET USUARIO BY ID:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener usuario' });
  }
};

export const postUsuario = async (req: Request, res: Response) => {
  const actorRut = (req as any).user?.rut;
  try {
    const nuevo = await usuariosService.crearUsuario(req.body);
    
    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'CREAR_USUARIO',
      entidad: 'Usuario',
      entidadId: nuevo.rut || null,
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Usuario ${nuevo.rut} (${nuevo.nombre}) creado.`,
      resultado: 'OK'
    });

    return res.status(201).json(nuevo);
  } catch (error: any) {
    console.error('🔥 ERROR EN CREAR USUARIO:', error);
    
    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'CREAR_USUARIO_ERROR',
      entidad: 'Usuario',
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Fallo al crear usuario: ${error.message || 'Error desconocido'}`,
      resultado: 'ERROR'
    });

    return res.status(400).json({ success: false, error: error.message || 'Error al crear usuario' });
  }
};

export const patchUsuario = async (req: Request, res: Response) => {
  const actorRut = (req as any).user?.rut;
  const id = parseInt(req.params.id as string, 10);
  try {
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const actualizado = await usuariosService.actualizarUsuario(id, req.body);
    
    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'ACTUALIZAR_USUARIO',
      entidad: 'Usuario',
      entidadId: actualizado.rut || null,
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Usuario ${actualizado.rut} actualizado. Campos modificados: ${Object.keys(req.body).join(', ')}`,
      resultado: 'OK'
    });

    return res.status(200).json(actualizado);
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR USUARIO:', error);

    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'ACTUALIZAR_USUARIO_ERROR',
      entidad: 'Usuario',
      entidadId: isNaN(id) ? null : String(id),
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Fallo al actualizar usuario: ${error.message || 'Error desconocido'}`,
      resultado: 'ERROR'
    });

    return res.status(400).json({ success: false, error: error.message || 'Error al actualizar usuario' });
  }
};

export const deleteUsuario = async (req: Request, res: Response) => {
  const actorRut = (req as any).user?.rut;
  const id = parseInt(req.params.id as string, 10);
  try {
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const result = await usuariosService.eliminarUsuario(id);
    
    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'ELIMINAR_USUARIO',
      entidad: 'Usuario',
      entidadId: String(id),
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Usuario con ID ${id} eliminado/desactivado. SoftDelete: ${result.softDeleted}. Mensaje: ${result.message || 'Ninguno'}`,
      resultado: 'OK'
    });

    return res.status(200).json({
      ok: true,
      softDeleted: result.softDeleted,
      message: result.message,
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN ELIMINAR USUARIO:', error);

    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'ELIMINAR_USUARIO_ERROR',
      entidad: 'Usuario',
      entidadId: isNaN(id) ? null : String(id),
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Fallo al eliminar usuario con ID ${id}: ${error.message || 'Error desconocido'}`,
      resultado: 'ERROR'
    });

    return res.status(400).json({ success: false, error: error.message || 'Error al eliminar usuario' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const actorRut = (req as any).user?.rut;
  const id = parseInt(req.params.id as string, 10);
  try {
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const usuario = await usuariosService.buscarUsuarioPorId(id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const bcrypt = require('bcrypt');
    // Contraseña por defecto: RUT sin puntos ni guiones
    const cleanRut = usuario.rut.replace(/[^0-9kK]/g, '');
    const nuevoHash = await bcrypt.hash(cleanRut || 'sidep123', 10);

    const prisma = require('../../../prisma').default;
    await prisma.usuario.update({
      where: { rut: usuario.rut },
      data: { passwordHash: nuevoHash },
    });

    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'RESTABLECER_PASSWORD',
      entidad: 'Usuario',
      entidadId: usuario.rut || null,
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Contraseña restablecida al RUT por defecto para el usuario ${usuario.rut}.`,
      resultado: 'OK'
    });

    return res.status(200).json({
      success: true,
      message: `Contraseña restablecida al RUT (${cleanRut}). El usuario deberá cambiarla al ingresar.`,
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN RESET PASSWORD:', error);

    await registrarAccion({
      usuarioRut: actorRut || null,
      accion: 'RESTABLECER_PASSWORD_ERROR',
      entidad: 'Usuario',
      entidadId: isNaN(id) ? null : String(id),
      metodoHttp: req.method || null,
      ruta: req.originalUrl || null,
      ipOrigen: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
      detalle: `Fallo al restablecer contraseña: ${error.message || 'Error desconocido'}`,
      resultado: 'ERROR'
    });

    return res.status(400).json({ success: false, error: error.message || 'Error al restablecer contraseña' });
  }
};
