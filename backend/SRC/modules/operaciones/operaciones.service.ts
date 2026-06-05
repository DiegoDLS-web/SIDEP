import prisma from '../../prisma';
import { AppError } from '../../utils';
import { randomUUID } from 'crypto';

// 1. Obtener la lista de partes (ajustado al nuevo schema normalizado)
export const obtenerPartes = async () => {
    return await prisma.parteEmergencia.findMany({
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

// 2. Crear un nuevo Parte de Emergencia
export const crearParteEmergencia = async (datosParte: any) => {
    const { correlativo, direccion, estadoId, claveId, obacRut, vehiculosCiviles } = datosParte;

    // Validación de negocio: Correlativo único
    const existeCorrelativo = await prisma.parteEmergencia.findUnique({
        where: { correlativo: String(correlativo) }
    });

    if (existeCorrelativo) {
        throw new AppError('Ya existe un parte de emergencia con este correlativo', 400);
    }

    // 1. Preparamos el objeto con la data estricta según el MER
    const parteData: any = {
        id: randomUUID(), // Generamos el UUID para el PK String
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
            create: vehiculosCiviles.map((vc: any) => ({
                id: randomUUID(), // ID para cada registro civil
                tipoVehiculo: String(vc.tipoVehiculo || ''),
                patente: String(vc.patente || ''),
                marca: String(vc.marca || ''),
                conductor: String(vc.conductor || ''),
                rutConductor: String(vc.rutConductor || '')
            }))
        };
    }

    // 3. Crear en BD
    const nuevoParte = await prisma.parteEmergencia.create({
        data: parteData,
        include: {
            clave: { select: { nombre: true, codigo: true } },
            estado: { select: { nombre: true } },
            vehiculosCiviles: true
        }
    });

    return nuevoParte;
};