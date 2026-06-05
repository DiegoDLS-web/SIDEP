import prisma from '../../prisma';
import { AppError } from '../../utils';

// 1. Función para listar los carros que están operativos
export const obtenerCarrosActivos = async () => {
    return await prisma.carro.findMany({
        // Corrección: estadoOperativo es Int (1 para true), no boolean
        where: { estadoOperativo: 1 }, 
        select: {
            id: true,
            nomenclatura: true,
            patente: true,
            kilometraje: true
            // Corrección: Eliminado 'capacidadAgua' porque no existe en el MER
        }
    });
};

// 2. Función para guardar un checklist completo
// Corrección: carroId y revisorRut ahora son String (UUID/RUT)
export const crearChecklist = async (carroId: string, revisorRut: string, plantillaId: string, resultadosMateriales: any[]) => {
    
    // Validamos que el carro exista (convertido a String por si acaso)
    const carro = await prisma.carro.findUnique({ where: { id: carroId } });
    
    if (!carro) {
        throw new AppError('El carro especificado no existe en el sistema', 404);
    }

    // Corrección: Usamos 'checklistEjecucion' en lugar de 'checklistCarro'
    // Corrección: Guardamos los resultados como JSON (respuestasJson)
    const nuevoChecklist = await prisma.checklistEjecucion.create({
        data: {
            id: crypto.randomUUID(), // Generamos ID único manualmente (o puedes dejar que Prisma lo maneje si configuraste default(uuid()))
            carroId: carroId,
            plantillaId: plantillaId, 
            revisorRut: revisorRut,
            fechaRevision: new Date(),
            estado: 'COMPLETADO',
            respuestasJson: JSON.stringify(resultadosMateriales), // Serializamos el array a JSON
            entidadTipo: 'CARRO', // Requerido por el MER
            entidadId: carroId
        }
    });

    return nuevoChecklist;
};