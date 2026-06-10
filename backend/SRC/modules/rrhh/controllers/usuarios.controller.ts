import { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';
import { validarRut } from '../../../utils/rut.util';

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
  try {
    if (!req.body.rut || !validarRut(req.body.rut)) {
      return res.status(400).json({ success: false, error: 'El RUT no es válido.' });
    }
    const nuevo = await usuariosService.crearUsuario(req.body);
    return res.status(201).json(nuevo);
  } catch (error: any) {
    console.error('🔥 ERROR EN CREAR USUARIO:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al crear usuario' });
  }
};

export const patchUsuario = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    if (req.body.rut !== undefined) {
      if (!req.body.rut || !validarRut(req.body.rut)) {
        return res.status(400).json({ success: false, error: 'El RUT no es válido.' });
      }
    }

    const actualizado = await usuariosService.actualizarUsuario(id, req.body);
    return res.status(200).json(actualizado);
  } catch (error: any) {
    console.error('🔥 ERROR EN ACTUALIZAR USUARIO:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al actualizar usuario' });
  }
};

export const deleteUsuario = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    const result = await usuariosService.eliminarUsuario(id);
    return res.status(200).json({
      ok: true,
      softDeleted: result.softDeleted,
      message: result.message,
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN ELIMINAR USUARIO:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al eliminar usuario' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
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
    const cleanRut = usuario.rut.replace(/[^0-9kK]/g, '');
    const nuevoHash = await bcrypt.hash(cleanRut || 'sidep123', 10);

    const prisma = require('../../../prisma').default;
    await prisma.usuario.update({
      where: { rut: usuario.rut },
      data: { passwordHash: nuevoHash },
    });

    return res.status(200).json({
      success: true,
      message: `Contraseña restablecida al RUT (${cleanRut}). El usuario deberá cambiarla al ingresar.`,
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN RESET PASSWORD:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al restablecer contraseña' });
  }
};
