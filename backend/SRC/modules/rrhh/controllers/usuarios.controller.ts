import { Request, Response } from 'express';
import * as usuariosService from '../services/usuarios.service';
import { mapUsuarioToDto } from '../services/rrhh.service';
import { hashPassword } from '../../../utils/security/hash';
import prisma from '../../../prisma';
import { validarRut } from '../../../utils/rut.util';
import { asyncHandler } from '../../../middlewares/async-handler';
import { NotFoundError, ValidationError } from '../../../utils/errors/AppError';

export const getUsuarios = asyncHandler(async (req: Request, res: Response) => {
  const list = await usuariosService.listarUsuarios();
  res.status(200).json(list);
});

export const getUsuariosSelector = asyncHandler(async (_req: Request, res: Response) => {
  const list = await usuariosService.listarUsuariosSelector();
  res.status(200).json(list);
});

export const getMetricas = asyncHandler(async (req: Request, res: Response) => {
  const metricas = await usuariosService.obtenerMetricasUsuarios();
  res.status(200).json(metricas);
});

export const getUsuariosPaginado = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const pageSize = parseInt(req.query.pageSize as string, 10) || 9;
  const q = req.query.q as string | undefined;
  const estado = req.query.estado as string | undefined;
  const tipoVoluntario = req.query.tipoVoluntario as string | undefined;
  const cargo = req.query.cargo as string | undefined;

  const data = await usuariosService.listarUsuariosPaginado(page, pageSize, q, estado, tipoVoluntario, cargo);
  res.status(200).json(data);
});

export const getUsuarioById = asyncHandler(async (req: Request, res: Response) => {
  const rut = req.params.rut as string;
  if (!rut) {
    throw new ValidationError(['RUT requerido']);
  }

  const usuario = await usuariosService.buscarUsuarioPorRut(rut);
  if (!usuario) {
    throw new NotFoundError('Usuario', rut);
  }

  res.status(200).json(mapUsuarioToDto(usuario));
});

function validarAsignacionRolAdmin(req: Request, rol?: string | null): void {
  const rolSolicitado = String(rol ?? '').trim().toUpperCase();
  if (rolSolicitado !== 'ADMIN') return;
  const actorRol = String((req as any).dbUser?.rol?.codigo ?? '').trim().toUpperCase();
  if (actorRol !== 'ADMIN') {
    throw new ValidationError(['Solo un administrador puede asignar el rol ADMIN.']);
  }
}

export const postUsuario = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body.rut || !validarRut(req.body.rut)) {
    throw new ValidationError(['El RUT no es válido.']);
  }
  validarAsignacionRolAdmin(req, req.body.rol);
  const nuevo = await usuariosService.crearUsuario(req.body);
  res.status(201).json(nuevo);
});

export const patchUsuario = asyncHandler(async (req: Request, res: Response) => {
  const rut = req.params.rut as string;
  if (!rut) {
    throw new ValidationError(['RUT requerido']);
  }

  if (req.body.rut !== undefined) {
    if (!req.body.rut || !validarRut(req.body.rut)) {
      throw new ValidationError(['El RUT no es válido.']);
    }
  }

  if (req.body.rol !== undefined) {
    validarAsignacionRolAdmin(req, req.body.rol);
  }

  const actualizado = await usuariosService.actualizarUsuario(rut, req.body);
  res.status(200).json(actualizado);
});

export const deleteUsuario = asyncHandler(async (req: Request, res: Response) => {
  const rut = req.params.rut as string;
  if (!rut) {
    throw new ValidationError(['RUT requerido']);
  }

  const result = await usuariosService.eliminarUsuario(rut);
  res.status(200).json({
    ok: true,
    softDeleted: result.softDeleted,
    message: result.message,
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const rut = req.params.rut as string;
  if (!rut) {
    throw new ValidationError(['RUT requerido']);
  }

  const usuario = await usuariosService.buscarUsuarioPorRut(rut);
  if (!usuario) {
    throw new NotFoundError('Usuario', rut);
  }

  const cleanRut = usuario.rut.replace(/[^0-9kK]/g, '');
  const nuevoHash = await hashPassword(cleanRut || 'sidep123');

  await prisma.usuario.update({
    where: { rut: usuario.rut },
    data: { passwordHash: nuevoHash },
  });

  res.status(200).json({
    success: true,
    message: `Contraseña restablecida al RUT (${cleanRut}). El usuario deberá cambiarla al ingresar.`,
  });
});
