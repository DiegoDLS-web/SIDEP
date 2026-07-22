"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDto = exports.cambiarPasswordDto = exports.loginDto = void 0;
const zod_1 = require("zod");
exports.loginDto = zod_1.z.object({
    rut: zod_1.z.string().min(1, 'RUT es requerido'),
    password: zod_1.z.string().min(1, 'Contraseña es requerida'),
});
exports.cambiarPasswordDto = zod_1.z.object({
    passwordActual: zod_1.z.string().min(1, 'Contraseña actual es requerida'),
    passwordNueva: zod_1.z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
});
exports.registerDto = zod_1.z.object({
    rut: zod_1.z.string().min(1, 'RUT es requerido'),
    password: zod_1.z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    nombres: zod_1.z.string().min(1, 'Nombres es requerido'),
    apellidoPaterno: zod_1.z.string().min(1, 'Apellido paterno es requerido'),
    apellidoMaterno: zod_1.z.string().optional(),
    email: zod_1.z.string().email('Email inválido').optional().or(zod_1.z.literal('')),
});
