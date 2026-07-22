"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearParteEmergencia = exports.obtenerPartes = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const utils_1 = require("../../utils");
const crypto_1 = require("crypto");
// 1. Obtener la lista de partes (ajustado al nuevo schema normalizado)
const obtenerPartes = async () => {
    return await prisma_1.default.parteEmergencia.findMany({
        include: {
            clave: { select: { nombre: true, codigo: true } },
            estado: { select: { nombre: true } },
            // Corregido: 'nombres' y 'apellidoPaterno' en lugar de 'nombre'
            obac: { select: { nombres: true, apellidoPaterno: true, rut: true } }
        },
        // Corregido: 'fechaEmergencia' en lugar de 'fecha'
        orderBy: { fechaEmergencia: 'desc' }
    });
};
exports.obtenerPartes = obtenerPartes;
// 2. Crear un nuevo Parte de Emergencia
const crearParteEmergencia = async (datosParte) => {
    const { correlativo, direccion, estadoId, claveId, obacRut, vehiculosCiviles } = datosParte;
    // Validación de negocio: Correlativo único
    const existeCorrelativo = await prisma_1.default.parteEmergencia.findUnique({
        where: { correlativo: String(correlativo) }
    });
    if (existeCorrelativo) {
        throw new utils_1.AppError('Ya existe un parte de emergencia con este correlativo', 400);
    }
    // 1. Preparamos el objeto con la data estricta según el MER
    const parteData = {
        id: (0, crypto_1.randomUUID)(), // Generamos el UUID para el PK String
        correlativo: String(correlativo),
        direccion: String(direccion),
        estadoId: Number(estadoId),
        claveId: Number(claveId),
        obacRut: String(obacRut), // Corregido: ahora es rut, no ID numérico
        fechaEmergencia: new Date(), // Campo obligatorio
    };
    // 2. Procesamos vehículos civiles si existen
    if (vehiculosCiviles && vehiculosCiviles.length > 0) {
        parteData.vehiculosCiviles = {
            create: vehiculosCiviles.map((vc) => ({
                id: (0, crypto_1.randomUUID)(), // ID para cada registro civil
                tipoVehiculo: String(vc.tipoVehiculo || ''),
                patente: String(vc.patente || ''),
                marca: String(vc.marca || ''),
                conductor: String(vc.conductor || ''),
                rutConductor: String(vc.rutConductor || '')
            }))
        };
    }
    // 3. Crear en BD
    const nuevoParte = await prisma_1.default.parteEmergencia.create({
        data: parteData,
        include: {
            clave: { select: { nombre: true, codigo: true } },
            estado: { select: { nombre: true } },
            vehiculosCiviles: true
        }
    });
    return nuevoParte;
};
exports.crearParteEmergencia = crearParteEmergencia;
