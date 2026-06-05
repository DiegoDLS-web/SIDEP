import prisma from '../../prisma';
import { AppError } from '../../utils';

// 1. Obtener la lista de partes (para que Ignacio llene la tabla principal en Angular)
export const obtenerPartes = async () => {
    return await prisma.parteEmergencia.findMany({
        include: {
            clave: { select: { nombre: true, codigo: true } },
            estado: { select: { nombre: true } },
            obac: { select: { nombre: true, rut: true } } // OBAC = Oficial al Mando
        },
        orderBy: { fecha: 'desc' } // Los más recientes primero
    });
};

// 2. Crear un nuevo Parte de Emergencia (y sus vehículos civiles si los hay)
export const crearParteEmergencia = async (datosParte: any) => {
    const { correlativo, direccion, estadoId, claveId, obacId, vehiculosCiviles } = datosParte;

    // Validación de negocio: Evitar duplicar el código del parte
    const existeCorrelativo = await prisma.parteEmergencia.findUnique({
        where: { correlativo: String(correlativo) }
    });

    if (existeCorrelativo) {
        throw new AppError('Ya existe un parte de emergencia con este correlativo', 400);
    }

    // 1. Preparamos el objeto con la data obligatoria del parte
    const parteData: any = {
        correlativo: String(correlativo),
        direccion: String(direccion),
        estadoId: Number(estadoId),
        claveId: Number(claveId),
        obacId: Number(obacId),
    };

    // 2. Solo si Ignacio envía vehículos, le "inyectamos" la propiedad al objeto
    if (vehiculosCiviles && vehiculosCiviles.length > 0) {
        parteData.vehiculosCiviles = {
            create: vehiculosCiviles.map((vc: any) => ({
                tipoVehiculo: String(vc.tipoVehiculo || ''),
                patente: String(vc.patente || ''),
                marca: String(vc.marca || ''),
                conductor: String(vc.conductor || ''),
                rutConductor: String(vc.rutConductor || '')
            }))
        };
    }

    // 3. Le pasamos el objeto limpio a Prisma
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