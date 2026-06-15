import prisma from '../../../prisma';
import { AppError } from '../../../utils';
import { randomUUID } from 'crypto';

export const crearPlantilla = async (datos: any) => {
    return await prisma.checklistPlantilla.create({
        data: {
            id: randomUUID(),
            codigo: String(datos.codigo),
            nombre: String(datos.nombre),
            descripcion: datos.descripcion ? String(datos.descripcion) : null,
            entidadTipo: String(datos.entidadTipo || 'CARRO'),
            estructuraJson: JSON.stringify(datos.estructuraJson),
            version: 1,
            activo: 1
        }
    });
};

export const registrarEjecucion = async (carroId: string, revisorRut: string, plantillaId: string, resultados: any[]) => {
    const carro = await prisma.carro.findUnique({ where: { id: carroId } });
    if (!carro) throw new AppError('El carro especificado no existe en el sistema', 404);

    return await prisma.checklistEjecucion.create({
        data: {
            id: randomUUID(),
            plantillaId: String(plantillaId),
            revisorRut: String(revisorRut),
            fechaRevision: new Date(),
            estado: 'COMPLETADO',
            respuestasJson: JSON.stringify(resultados),
            entidadTipo: 'CARRO',
            entidadId: String(carroId)
        }
    });
};

export const obtenerHistorial = async (carroId?: string) => {
    const whereClause = carroId ? { entidadId: carroId, entidadTipo: 'CARRO' } : {};
    
    return await prisma.checklistEjecucion.findMany({
        where: whereClause,
        include: {
            revisor: { select: { nombres: true, apellidoPaterno: true } },
            plantilla: { select: { nombre: true } }
        },
        orderBy: { fechaRevision: 'desc' }
    });
};
export const actualizarPlantilla = async (id: string, datos: any) => {
    const plantilla = await prisma.checklistPlantilla.findUnique({ where: { id } });
    if (!plantilla) throw new AppError('Plantilla no encontrada', 404);

    const dataToUpdate: any = {};

    // Evitamos enviar explícitamente undefined
    if (datos.nombre !== undefined) dataToUpdate.nombre = String(datos.nombre);
    if (datos.descripcion !== undefined) dataToUpdate.descripcion = String(datos.descripcion);
    if (datos.estructuraJson !== undefined) dataToUpdate.estructuraJson = JSON.stringify(datos.estructuraJson);
    if (datos.activo !== undefined) dataToUpdate.activo = Number(datos.activo);

    return await prisma.checklistPlantilla.update({
        where: { id },
        data: dataToUpdate
    });
};

export const obtenerDetalleEjecucion = async (id: string) => {
    const ejecucion = await prisma.checklistEjecucion.findUnique({
        where: { id },
        include: { 
            revisor: { select: { nombres: true, apellidoPaterno: true, rut: true } },
            plantilla: { select: { nombre: true, codigo: true } }
        }
    });
    if (!ejecucion) throw new AppError('Ejecución de checklist no encontrada', 404);
    return ejecucion;
};