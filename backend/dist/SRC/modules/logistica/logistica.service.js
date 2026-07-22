"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearChecklist = exports.obtenerCarrosActivos = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const utils_1 = require("../../utils");
const crypto_1 = require("crypto");
const obtenerCarrosActivos = async () => {
    return await prisma_1.default.carro.findMany({
        where: { estadoOperativo: 1 },
        select: {
            id: true,
            nomenclatura: true,
            patente: true,
            kilometraje: true
        }
    });
};
exports.obtenerCarrosActivos = obtenerCarrosActivos;
const crearChecklist = async (carroId, revisorRut, plantillaId, resultadosMateriales) => {
    const carro = await prisma_1.default.carro.findUnique({ where: { id: carroId } });
    if (!carro) {
        throw new utils_1.AppError('El carro especificado no existe en el sistema', 404);
    }
    const nuevoChecklist = await prisma_1.default.checklistEjecucion.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            plantillaId: plantillaId,
            revisorRut: revisorRut,
            fechaRevision: new Date(),
            estado: 'COMPLETADO',
            respuestasJson: JSON.stringify(resultadosMateriales),
            entidadTipo: 'CARRO',
            entidadId: carroId // Reemplaza al antiguo 'carroId' directo
        }
    });
    return nuevoChecklist;
};
exports.crearChecklist = crearChecklist;
