import prisma from '../../../prisma';
import { AppError } from '../../../utils';
import { randomUUID } from 'crypto';

export const crearCarro = async (datos: any) => {
    const existe = await prisma.carro.findUnique({ where: { nomenclatura: datos.nomenclatura } });
    if (existe) throw new AppError('Ya existe un carro con esta nomenclatura', 400);

    return await prisma.carro.create({
        data: {
            id: randomUUID(),
            patente: datos.patente,
            nomenclatura: datos.nomenclatura,
            nombre: datos.nombre,
            marca: datos.marca,
            kilometraje: datos.kilometraje ? Number(datos.kilometraje) : 0,
            estadoOperativo: 1 // 1 = Activo
        }
    });
};

export const actualizarCarro = async (id: string, datos: any) => {
    const carro = await prisma.carro.findUnique({ where: { id } });
    if (!carro) throw new AppError('Carro no encontrado', 404);

    const dataToUpdate: any = {};
    
    // Solo agregamos la propiedad al objeto si existe en 'datos'
    if (datos.patente !== undefined) dataToUpdate.patente = datos.patente;
    if (datos.nomenclatura !== undefined) dataToUpdate.nomenclatura = datos.nomenclatura;
    if (datos.nombre !== undefined) dataToUpdate.nombre = datos.nombre;
    if (datos.marca !== undefined) dataToUpdate.marca = datos.marca;
    if (datos.kilometraje !== undefined) dataToUpdate.kilometraje = Number(datos.kilometraje);
    if (datos.estadoOperativo !== undefined) dataToUpdate.estadoOperativo = Number(datos.estadoOperativo);

    return await prisma.carro.update({
        where: { id },
        data: dataToUpdate
    });
};

export const obtenerCarros = async () => {
    return await prisma.carro.findMany({
        include: { bolsos: true, materiales: true },
        orderBy: { nomenclatura: 'asc' }
    });
};

export const cambiarEstadoOperativo = async (id: string, estado: number) => {
    const carro = await prisma.carro.findUnique({ where: { id } });
    if (!carro) throw new AppError('Carro no encontrado', 404);

    return await prisma.carro.update({
        where: { id },
        data: { estadoOperativo: estado }
    });
    
};

