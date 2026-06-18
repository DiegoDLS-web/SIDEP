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

export const obtenerSelectorBolsos = async () => {
  const carros = await prisma.carro.findMany({
    where: { estadoOperativo: 1 },
    include: {
      bolsos: {
        where: { activo: 1 },
        include: { catalogoBolso: true },
        orderBy: { nombreIdentificador: 'asc' },
      },
    },
    orderBy: { nomenclatura: 'asc' },
  });

  return carros.map((carro) => ({
    unidad: carro.nomenclatura,
    nombre: carro.nombre,
    cantidadBolsos: carro.bolsos.length,
    bolsos: carro.bolsos.map((b, idx) => ({
      id: b.id,
      numero: idx + 1,
      nombre: b.nombreIdentificador || `Bolso ${idx + 1}`,
      tipo: b.catalogoBolso?.nombre || 'Trauma',
      completitud: 0,
      itemsFaltantes: 0,
      status: 'pending',
      estadoChecklist: 'PENDIENTE',
    })),
    ultimaRevision: null,
  }));
};

export const obtenerHistorialBolsos = async (_filtros?: {
  unidades?: string;
  desde?: string;
  hasta?: string;
}) => {
  return [];
};