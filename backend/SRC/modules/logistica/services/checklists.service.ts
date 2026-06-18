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

async function resolverPlantillaId(
    carroId: string,
    entidadTipo: string,
    plantillaId?: string,
): Promise<string> {
    if (plantillaId?.trim()) {
        const existe = await prisma.checklistPlantilla.findUnique({ where: { id: plantillaId.trim() } });
        if (existe) return existe.id;
    }

    const carro = await prisma.carro.findUnique({ where: { id: carroId }, select: { nomenclatura: true } });
    const nomenclatura = carro?.nomenclatura ?? 'GEN';
    const codigo = entidadTipo === 'ERA' ? `ERA-${nomenclatura}` : `CHK-${nomenclatura}`;

    const existente = await prisma.checklistPlantilla.findFirst({ where: { codigo } });
    if (existente) return existente.id;

    const creada = await prisma.checklistPlantilla.create({
        data: {
            id: randomUUID(),
            codigo,
            nombre: `Plantilla ${codigo}`,
            entidadTipo,
            estructuraJson: JSON.stringify([]),
            version: 1,
            activo: 1,
        },
    });
    return creada.id;
}

export const registrarEjecucion = async (
    carroId: string,
    revisorRut: string,
    plantillaId: string | undefined,
    resultados: unknown,
    opciones?: { entidadTipo?: string; firmaOficial?: string | null; firmaInspector?: string | null },
) => {
    const carro = await prisma.carro.findUnique({ where: { id: carroId } });
    if (!carro) throw new AppError('El carro especificado no existe en el sistema', 404);

    const entidadTipo = String(opciones?.entidadTipo || 'CARRO').trim() || 'CARRO';
    const plantillaResuelta = await resolverPlantillaId(carroId, entidadTipo, plantillaId);

    const payload =
        resultados != null && typeof resultados === 'object'
            ? { ...(resultados as Record<string, unknown>) }
            : { items: resultados };

    return await prisma.checklistEjecucion.create({
        data: {
            id: randomUUID(),
            plantillaId: plantillaResuelta,
            revisorRut: String(revisorRut),
            fechaRevision: new Date(),
            estado: 'COMPLETADO',
            respuestasJson: JSON.stringify(payload),
            entidadTipo,
            entidadId: String(carroId),
            firmaOficial: opciones?.firmaOficial ?? null,
            firmaRevisor: opciones?.firmaInspector ?? null,
        },
    });
};

export const obtenerHistorial = async (carroId?: string, entidadTipo?: string) => {
    const whereClause: Record<string, string> = {};
    if (carroId) whereClause.entidadId = carroId;
    if (entidadTipo?.trim()) whereClause.entidadTipo = entidadTipo.trim();

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
