import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from './cloudinary.config';
import { Request } from 'express';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    // Si en la request se especifica tipo firma, se guarda en sidep/firmas, de lo contrario en perfiles
    const folder = req.body.type === 'firma' ? 'sidep/firmas' : 'sidep/perfiles';
    return {
      folder,
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    };
  },
});

export const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y WebP.'));
    }
    cb(null, true);
  },
});

export default uploadImage;
