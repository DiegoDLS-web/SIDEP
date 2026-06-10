import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from './cloudinary.config';
import { Request } from 'express';

/**
 * Middleware de subida para adjuntos de licencias médicas.
 * Acepta PDF e imágenes (PNG/JPG/WEBP/GIF) — hasta 8 MB.
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'sidep/licencias',
      resource_type: isImage ? 'image' : 'raw',
      allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'],
    };
  },
});

export const uploadAdjuntoLicencia = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const permitidos = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!permitidos.includes(file.mimetype.toLowerCase())) {
      return cb(new Error('Formato no válido. Usa PDF o imagen (PNG/JPG/WEBP/GIF).'));
    }
    cb(null, true);
  },
});

export default uploadAdjuntoLicencia;
