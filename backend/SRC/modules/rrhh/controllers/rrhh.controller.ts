import { Request, Response } from 'express';
import * as rrhhService from '../services/rrhh.service';
import { validarPasswordNueva } from '../../../utils/security/password-policy.util';

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

    const fileData = req.file as any;
    const nuevaUrl = fileData.path; // secure_url de Cloudinary
    const nuevoPublicId = fileData.filename; // public_id de Cloudinary

    const dataDto = await rrhhService.actualizarFotoPerfil(userRut, nuevaUrl, nuevoPublicId);

    return res.status(200).json({
      success: true,
      message: 'Foto de perfil subida y actualizada con éxito',
      data: dataDto,
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

    const licenciaActualizada = await rrhhService.actualizarArchivoLicencia(licenciaId, nuevaUrl, nuevoPublicId);

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
    const errPolitica = validarPasswordNueva(passwordNueva, userRut);
    if (errPolitica) {
      return res.status(400).json({ success: false, error: errPolitica });
    }

    await rrhhService.cambiarPassword(userRut, passwordActual, passwordNueva);

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error: any) {
    console.error('🔥 ERROR EN CAMBIAR MI PASSWORD:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al cambiar contraseña' });
  }
};
