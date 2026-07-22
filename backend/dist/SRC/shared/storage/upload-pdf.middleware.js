"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPdf = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloudinary_config_1 = require("./cloudinary.config");
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_config_1.cloudinary,
    params: async (req, file) => {
        return {
            folder: 'sidep/licencias',
            allowed_formats: ['pdf'],
        };
    },
});
exports.uploadPdf = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Límite de 10MB para documentos
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Tipo de archivo no permitido. Solo se permiten archivos PDF.'));
        }
        cb(null, true);
    },
});
exports.default = exports.uploadPdf;
