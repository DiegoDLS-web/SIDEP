"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloudinary_config_1 = require("./cloudinary.config");
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_config_1.cloudinary,
    params: async (req, file) => {
        // Si en la request se especifica tipo firma, se guarda en sidep/firmas, de lo contrario en perfiles
        const folder = req.body.type === 'firma' ? 'sidep/firmas' : 'sidep/perfiles';
        return {
            folder,
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
        };
    },
});
exports.uploadImage = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y WebP.'));
        }
        cb(null, true);
    },
});
exports.default = exports.uploadImage;
