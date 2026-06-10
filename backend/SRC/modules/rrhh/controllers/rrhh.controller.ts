import { Request, Response } from 'express';
import * as rrhhService from '../services/rrhh.service';
import prisma from '../../../prisma';
import { StorageService } from '../../../shared/storage';

// 1. Obtener mi perfil
export const getMiPerfil = async (req: Request, res: Response) => {
  try {
    const userRut = (req as any).user.rut;
    if (!userRut) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const perfil = await rrhhService.obtenerMiPerfil(userRut);
    return res.status(200).json(perfil);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET MI PERFIL:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener el perfil' });
  }
};

// 2. Actualizar mi perfil (datos generales)
export const patchMiPerfil = async (req: Request, res: Response) => {
  try {
    const userRut = (req as any).user.rut;
    if (!userRut) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const perfilActualizado = await rrhhService.actualizarMiPerfil(userRut, req.body);
    return res.status(200).json(perfilActualizado);
  } catch (error: any) {
    console.error('🔥 ERROR EN PATCH MI PERFIL:', error);
    return res.status(400).json({ success: false, error: error.message || 'Error al actualizar el perfil' });
  }
};

// 3. Obtener resumen operativo (asistencias y licencias)
export const getMiResumenOperativo = async (req: Request, res: Response) => {
  try {
    const userRut = (req as any).user.rut;
    if (!userRut) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const resumen = await rrhhService.obtenerMiResumenOperativo(userRut);
    return res.status(200).json(resumen);
  } catch (error: any) {
    console.error('🔥 ERROR EN GET MI RESUMEN OPERATIVO:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener el resumen operativo' });
  }
};

// 4. Endpoint para subir foto de perfil mediante multipart/form-data (Multer + Cloudinary)
export const subirFotoPerfil = async (req: Request, res: Response) => {
  try {
    const userRut = (req as any).user.rut;
    if (!userRut) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo de imagen' });
    }

    // El middleware multer-storage-cloudinary coloca los datos de Cloudinary en req.file
    const fileData = req.file as any;
    const nuevaUrl = fileData.path; // secure_url de Cloudinary
    const nuevoPublicId = fileData.filename; // public_id de Cloudinary

    // Obtener usuario actual para borrar la foto antigua si existiera
    const usuario = await prisma.usuario.findUnique({
      where: { rut: userRut },
    });

    if (usuario && usuario.fotoPerfilPublicId) {
      // Eliminación asíncrona del recurso obsoleto en Cloudinary
      await StorageService.deleteFile(usuario.fotoPerfilPublicId);
    }

    // Actualización de Prisma
    const usuarioActualizado = await prisma.usuario.update({
      where: { rut: userRut },
      data: {
        fotoPerfilUrl: nuevaUrl,
        fotoPerfilPublicId: nuevoPublicId,
      },
      include: {
        rol: true,
        cargo: true,
        tipoVoluntario: true,
        estadoVoluntario: true,
        grupoSanguineo: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Foto de perfil subida y actualizada con éxito',
      data: rrhhService.mapUsuarioToDto(usuarioActualizado),
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN SUBIR FOTO PERFIL:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al subir la foto de perfil' });
  }
};

// 5. Endpoint para subir archivo PDF de licencia médica mediante multipart/form-data
export const subirArchivoLicencia = async (req: Request, res: Response) => {
  try {
    const userRut = (req as any).user.rut;
    const { licenciaId } = req.body; // El ID de la licencia médica a actualizar

    if (!userRut) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    if (!licenciaId) {
      return res.status(400).json({ success: false, message: 'Se requiere el ID de la licencia' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se subió ningún archivo PDF' });
    }

    const fileData = req.file as any;
    const nuevaUrl = fileData.path; // secure_url del PDF en Cloudinary
    const nuevoPublicId = fileData.filename; // public_id en Cloudinary

    // Obtener licencia médica existente
    const licencia = await prisma.licenciaMedica.findUnique({
      where: { id: licenciaId },
    });

    if (!licencia) {
      return res.status(404).json({ success: false, message: 'Licencia médica no encontrada' });
    }

    // Si ya tenía un archivo en Cloudinary, eliminar el recurso antiguo
    if (licencia.archivoPublicId) {
      await StorageService.deleteFile(licencia.archivoPublicId, 'raw'); // 'raw' porque es un PDF
    }

    // Actualización de Prisma
    const licenciaActualizada = await prisma.licenciaMedica.update({
      where: { id: licenciaId },
      data: {
        archivoUrl: nuevaUrl,
        archivoPublicId: nuevoPublicId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Documento PDF de licencia subido correctamente',
      data: licenciaActualizada,
    });
  } catch (error: any) {
    console.error('🔥 ERROR EN SUBIR ARCHIVO LICENCIA:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al subir archivo de licencia' });
  }
};

// 6. Cambiar mi propia contraseña
export const cambiarMiPassword = async (req: Request, res: Response) => {
  try {
    const userRut = (req as any).user.rut;
    if (!userRut) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ success: false, error: 'Se requieren la contraseña actual y la nueva.' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const bcrypt = require('bcrypt');
    const usuario = await prisma.usuario.findUnique({ where: { rut: userRut } });
    if (!usuario) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const coincide = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!coincide) {
      return res.status(400).json({ success: false, error: 'La contraseña actual es incorrecta.' });
    }

    const nuevoHash = await bcrypt.hash(passwordNueva, 10);
    await prisma.usuario.update({
      where: { rut: userRut },
      data: { passwordHash: nuevoHash },
    });

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    console.error('🔥 ERROR EN CAMBIAR MI PASSWORD:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al cambiar contraseña' });
  }
};
