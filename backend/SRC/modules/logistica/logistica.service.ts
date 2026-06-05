import prisma from '../../prisma';
import { AppError } from '../../utils';

// 1. Función para listar los carros que están operativos
export const obtenerCarrosActivos = async () => {
    return await prisma.carro.findMany({
        where: { estadoOperativo: true },
        select: {
            id: true,
            nomenclatura: true,
            patente: true,
            kilometraje: true,
            capacidadAgua: true
        }
    });
};

// 2. Función para guardar un checklist completo con sus materiales
export const crearChecklist = async (carroId: number, cuarteleroId: number, resultadosMateriales: any[]) => {
    // Validamos que el carro realmente exista en la base de datos
    const carro = await prisma.carro.findUnique({ where: { id: carroId } });
    
    if (!carro) {
        throw new AppError('El carro especificado no existe en el sistema', 404);
    }

    // Usamos Prisma para crear el checklist y sus resultados asociados al mismo tiempo
    const nuevoChecklist = await prisma.checklistCarro.create({
        data: {
            carroId: carroId,
            cuarteleroId: cuarteleroId,
            // Aquí Prisma inserta automáticamente todos los ítems revisados
            resultados: {
                create: resultadosMateriales.map((item: any) => ({
                    materialId: item.materialId,
                    cantidadEncontrada: item.cantidadEncontrada,
                    estadoItem: item.estadoItem,
                    observacion: item.observacion
                }))
            }
        },
        include: {
            carro: { select: { nomenclatura: true } },
            resultados: true
        }
    });

    return nuevoChecklist;
};