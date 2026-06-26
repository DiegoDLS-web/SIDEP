import prisma from '../../../prisma';
import { AppError, evaluarEstadoOperativoDesdeChecklist, esChecklistBorrador } from '../../../utils';
import { randomUUID } from 'crypto';

const TIPOS_CHECKLIST_UNIDAD = new Set(['CARRO', 'UNIDAD']);

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

    const payload: Record<string, unknown> =
        resultados != null && typeof resultados === 'object'
            ? { ...(resultados as Record<string, unknown>) }
            : { items: resultados };

    const esChecklistUnidad = TIPOS_CHECKLIST_UNIDAD.has(entidadTipo.toUpperCase());
    const esBorrador = esChecklistBorrador(payload);

    const evaluacion = esChecklistUnidad && !esBorrador
        ? evaluarEstadoOperativoDesdeChecklist(payload)
        : null;

    const ejecucion = await prisma.$transaction(async (tx) => {
        const creada = await tx.checklistEjecucion.create({
            data: {
                id: randomUUID(),
                plantillaId: plantillaResuelta,
                revisorRut: String(revisorRut),
                fechaRevision: new Date(),
                estado: esBorrador ? 'BORRADOR' : 'COMPLETADO',
                respuestasJson: JSON.stringify(payload),
                entidadTipo,
                entidadId: String(carroId),
                firmaOficial: opciones?.firmaOficial ?? null,
                firmaRevisor: opciones?.firmaInspector ?? null,
            },
        });

        if (evaluacion) {
            await tx.carro.update({
                where: { id: carroId },
                data: { estadoOperativo: evaluacion.estadoOperativo },
            });
        }

        return creada;
    });

    return {
        ...ejecucion,
        estadoOperativoActualizado: evaluacion?.estadoOperativo ?? null,
        semaforoUnidad: evaluacion?.semaforo ?? null,
    };
};

export const obtenerHistorial = async (
    carroId?: string,
    opciones?: { entidadTipo?: string; excluirBorradores?: boolean },
) => {
    const whereClause: Record<string, string> = {};
    if (carroId) whereClause.entidadId = carroId;

    const tipoFiltro = opciones?.entidadTipo?.trim().toUpperCase();
    if (tipoFiltro && tipoFiltro !== 'UNIDAD') {
        whereClause.entidadTipo = tipoFiltro;
    }

    const rows = await prisma.checklistEjecucion.findMany({
        where: whereClause,
        include: {
            revisor: { select: { nombres: true, apellidoPaterno: true } },
            plantilla: { select: { nombre: true } },
        },
        orderBy: { fechaRevision: 'desc' },
    });

    const excluirBorradores = opciones?.excluirBorradores !== false;
    return rows.filter((row) => {
        if (excluirBorradores && (row.estado === 'BORRADOR' || esChecklistBorrador(row.respuestasJson))) {
            return false;
        }
        if (tipoFiltro === 'UNIDAD') {
            const t = String(row.entidadTipo ?? '').toUpperCase();
            return t === 'CARRO' || t === 'UNIDAD';
        }
        return true;
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
