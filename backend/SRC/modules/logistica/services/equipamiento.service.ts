import prisma from '../../../prisma';
import { randomUUID } from 'crypto';

export const registrarBolsoTrauma = async (datos: any) => {
    return await prisma.bolsoTrauma.create({
        data: {
            id: randomUUID(),
            tipoId: Number(datos.tipoId),
            carroId: String(datos.carroId),
            nombreIdentificador: String(datos.nombreIdentificador),
            activo: 1
        }
    });
};
export const asignarMaterialCarro = async (datos: any) => {
    return await prisma.materialPorCarro.create({
        data: {
            id: randomUUID(),
            carroId: String(datos.carroId),
            materialId: Number(datos.materialId),
            cantidadObjetivo: Number(datos.cantidadObjetivo),
            ubicacion: datos.ubicacion ? String(datos.ubicacion) : null,
            activo: 1
        }
    });
};

export const obtenerInventarioCarro = async (carroId: string) => {
    return await prisma.materialPorCarro.findMany({
        where: { carroId, activo: 1 },
        include: { 
            material: { select: { codigo: true, nombre: true, categoria: true } } 
        }
    });
};