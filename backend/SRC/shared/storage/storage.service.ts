import { cloudinary } from './cloudinary.config';
import { UploadApiResponse } from 'cloudinary';

export class StorageService {
  /**
   * Sube un buffer de archivo a Cloudinary en una carpeta específica.
   * @param fileBuffer - Buffer del archivo (de multer o fs)
   * @param folder - Carpeta destino en Cloudinary (ej: 'sidep/perfiles')
   * @param resourceType - Tipo de recurso ('image' | 'raw' | 'auto')
   */
  static uploadBuffer(
    fileBuffer: Buffer,
    folder: string,
    resourceType: 'image' | 'raw' | 'auto' = 'auto'
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            return reject(error || new Error('Error al subir archivo a Cloudinary'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Elimina un archivo de Cloudinary por su publicId.
   * @param publicId - ID público en Cloudinary
   * @param resourceType - Tipo de recurso ('image' | 'raw' | 'auto')
   */
  static async deleteFile(
    publicId: string,
    resourceType: 'image' | 'raw' | 'auto' = 'auto'
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === 'ok';
    } catch (error) {
      console.error(`🔥 Error al eliminar archivo de Cloudinary (${publicId}):`, error);
      return false;
    }
  }

  /**
   * Obtiene la URL segura de un archivo a partir de su publicId.
   */
  static getSecureUrl(publicId: string): string {
    return cloudinary.url(publicId, { secure: true });
  }
}
export default StorageService;
