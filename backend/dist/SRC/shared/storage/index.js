"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = exports.uploadAdjuntoLicencia = exports.uploadPdf = exports.uploadImage = exports.StorageService = void 0;
var storage_service_1 = require("./storage.service");
Object.defineProperty(exports, "StorageService", { enumerable: true, get: function () { return __importDefault(storage_service_1).default; } });
var upload_image_middleware_1 = require("./upload-image.middleware");
Object.defineProperty(exports, "uploadImage", { enumerable: true, get: function () { return __importDefault(upload_image_middleware_1).default; } });
var upload_pdf_middleware_1 = require("./upload-pdf.middleware");
Object.defineProperty(exports, "uploadPdf", { enumerable: true, get: function () { return __importDefault(upload_pdf_middleware_1).default; } });
var upload_adjunto_licencia_middleware_1 = require("./upload-adjunto-licencia.middleware");
Object.defineProperty(exports, "uploadAdjuntoLicencia", { enumerable: true, get: function () { return __importDefault(upload_adjunto_licencia_middleware_1).default; } });
var cloudinary_config_1 = require("./cloudinary.config");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_config_1.cloudinary; } });
