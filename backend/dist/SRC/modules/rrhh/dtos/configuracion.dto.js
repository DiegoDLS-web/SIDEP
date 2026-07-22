"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarConfigDto = void 0;
const zod_1 = require("zod");
exports.actualizarConfigDto = zod_1.z.object({
    compania: zod_1.z.object({
        nombreCompania: zod_1.z.string().optional(),
        nombreBomba: zod_1.z.string().optional(),
        direccion: zod_1.z.string().optional(),
        telefono: zod_1.z.string().optional(),
        emailInstitucional: zod_1.z.string().email('Email institucional inválido').optional().or(zod_1.z.literal('')),
        fechaFundacion: zod_1.z.string().optional(),
    }).optional(),
    notificaciones: zod_1.z.object({
        alertasEmergencia: zod_1.z.boolean().optional(),
        alertasInventario: zod_1.z.boolean().optional(),
        recordatoriosChecklist: zod_1.z.boolean().optional(),
        resumenDiarioEmail: zod_1.z.boolean().optional(),
    }).optional(),
    reportes: zod_1.z.object({
        formatoPredeterminado: zod_1.z.enum(['PDF', 'EXCEL']).optional(),
        logosPdf: zod_1.z.enum(['NINGUNO', 'SIDEP', 'COMPANIA', 'AMBOS']).optional(),
        orientacionPdf: zod_1.z.enum(['VERTICAL', 'HORIZONTAL']).optional(),
    }).optional(),
    navegacionPorRol: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
});
