import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from './cloudinary.config';
import { Request } from 'express';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: 'sidep/licencias',
      allowed_formats: ['pdf'],
    };
  },
});

export const uploadPdf = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Límite de 10MB para documentos
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos PDF.'));
    }
    cb(null, true);
  },
});

export default uploadPdf;
