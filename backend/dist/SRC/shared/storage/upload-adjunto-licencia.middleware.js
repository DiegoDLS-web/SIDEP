"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAdjuntoLicencia = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloudinary_config_1 = require("./cloudinary.config");
/**
 * Middleware de subida para adjuntos de licencias médicas.
 * Acepta PDF e imágenes (PNG/JPG/WEBP/GIF) — hasta 8 MB.
 */
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_config_1.cloudinary,
    params: async (_req, file) => {
        const isImage = file.mimetype.startsWith('image/');
        return {
            folder: 'sidep/licencias',
            resource_type: isImage ? 'image' : 'raw',
            allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif'],
        };
    },
});
exports.uploadAdjuntoLicencia = (0, multer_1.default)({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
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
exports.default = exports.uploadAdjuntoLicencia;
