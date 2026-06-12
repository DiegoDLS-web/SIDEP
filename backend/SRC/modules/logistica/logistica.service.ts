import prisma from '../../prisma';
import { AppError } from '../../utils';
import { randomUUID } from 'crypto';

export const obtenerCarrosActivos = async () => {
    return await prisma.carro.findMany({
        where: { estadoOperativo: 1 }, 
        select: {
            id: true,
            nomenclatura: true,
            patente: true,
            kilometraje: true
        }
    });
};

export const crearChecklist = async (carroId: string, revisorRut: string, plantillaId: string, resultadosMateriales: any[]) => {
    
    const carro = await prisma.carro.findUnique({ where: { id: carroId } });
    
    if (!carro) {
        throw new AppError('El carro especificado no existe en el sistema', 404);
    }

    const nuevoChecklist = await prisma.checklistEjecucion.create({
        data: {
            id: randomUUID(),
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