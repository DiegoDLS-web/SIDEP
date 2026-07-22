"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarUsuarioDto = exports.crearUsuarioDto = void 0;
const zod_1 = require("zod");
exports.crearUsuarioDto = zod_1.z.object({
    rut: zod_1.z.string().min(1, 'RUT es requerido'),
    nombres: zod_1.z.string().min(1, 'Nombres es requerido'),
    apellidoPaterno: zod_1.z.string().min(1, 'Apellido paterno es requerido'),
    apellidoMaterno: zod_1.z.string().optional().default(''),
    email: zod_1.z.string().min(1, 'Email es requerido').email('Email inválido'),
    telefono: zod_1.z.string().optional(),
    direccion: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    comuna: zod_1.z.string().optional(),
    actividad: zod_1.z.string().optional(),
    nacionalidad: zod_1.z.string().optional(),
    fechaNacimiento: zod_1.z.string().optional(),
    fechaIngreso: zod_1.z.string().optional(),
    rol: zod_1.z.string().optional(),
    cargoOficialidad: zod_1.z.string().optional(),
    tipoVoluntario: zod_1.z.string().optional(),
    estadoVoluntario: zod_1.z.string().optional(),
    grupoSanguineo: zod_1.z.string().optional(),
    cuerpoBombero: zod_1.z.string().optional(),
    compania: zod_1.z.string().optional(),
    observacionesRegistro: zod_1.z.string().nullable().optional(),
    firmaImagen: zod_1.z.string().nullable().optional(),
    fotoPerfil: zod_1.z.string().nullable().optional(),
    autorizadoConducir: zod_1.z.boolean().optional(),
    claveNomina: zod_1.z.string().nullable().optional(),
});
exports.actualizarUsuarioDto = exports.crearUsuarioDto.partial().extend({
    activo: zod_1.z.boolean().optional(),
});
