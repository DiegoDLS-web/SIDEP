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

    const estadoChecklistManual =
        typeof payload['estadoChecklist'] === 'string' ? String(payload['estadoChecklist']).trim().toUpperCase() : '';
    if (estadoChecklistManual && !esBorrador) {
        payload['estadoChecklist'] = estadoChecklistManual;
    }

    const evaluacion = esChecklistUnidad && !esBorrador
        ? evaluarEstadoOperativoDesdeChecklist(payload)
        : null;

    let estadoRegistro = 'COMPLETADO';
    if (esBorrador) {
        estadoRegistro = 'BORRADOR';
    } else if (estadoChecklistManual === 'PENDIENTE') {
        estadoRegistro = 'PENDIENTE';
    } else if (estadoChecklistManual === 'CON_OBSERVACION') {
        estadoRegistro = 'CON_OBSERVACION';
    }

    const ejecucion = await prisma.$transaction(async (tx) => {
        const creada = await tx.checklistEjecucion.create({
            data: {
                id: randomUUID(),
                plantillaId: plantillaResuelta,
                revisorRut: String(revisorRut),
                fechaRevision: new Date(),
                estado: estadoRegistro,
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
        take: 200,
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

/** Historial agrupado por carro (entidadId) en una sola consulta. */
export const obtenerHistorialBatch = async (
    carroIds: string[],
    opciones?: { entidadTipo?: string; excluirBorradores?: boolean; limitPorCarro?: number },
) => {
    const ids = [...new Set(carroIds.map((id) => String(id).trim()).filter(Boolean))];
    if (!ids.length) return {} as Record<string, Awaited<ReturnType<typeof obtenerHistorial>>>;

    const tipoFiltro = opciones?.entidadTipo?.trim().toUpperCase();
    const whereClause: Record<string, unknown> = { entidadId: { in: ids } };
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
        take: Math.min(500, ids.length * (opciones?.limitPorCarro ?? 20)),
    });

    const excluirBorradores = opciones?.excluirBorradores !== false;
    const filtradas = rows.filter((row) => {
        if (excluirBorradores && (row.estado === 'BORRADOR' || esChecklistBorrador(row.respuestasJson))) {
            return false;
        }
        if (tipoFiltro === 'UNIDAD') {
            const t = String(row.entidadTipo ?? '').toUpperCase();
            return t === 'CARRO' || t === 'UNIDAD';
        }
        return true;
    });

    const limit = opciones?.limitPorCarro ?? 20;
    const out: Record<string, typeof filtradas> = {};
    for (const id of ids) out[id] = [];
    for (const row of filtradas) {
        const key = String(row.entidadId);
        if (!out[key]) out[key] = [];
        if (out[key].length < limit) out[key].push(row);
    }
    return out;
};

const ESTADOS_CHECKLIST_PERMITIDOS = new Set(['COMPLETADO', 'PENDIENTE', 'CON_OBSERVACION']);

function parseRespuestasEjecucion(raw: string | null | undefined): Record<string, unknown> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};
    } catch {
        return {};
    }
}

export const actualizarEstadoEjecucion = async (
    id: string,
    estadoChecklist: string,
    opts?: { motivo?: string; fechaEfectiva?: string; actorRut?: string },
) => {
    const estado = String(estadoChecklist ?? '').trim().toUpperCase();
    if (!ESTADOS_CHECKLIST_PERMITIDOS.has(estado)) {
        throw new AppError('Estado de checklist inválido', 400);
    }

    const motivo = String(opts?.motivo ?? '').trim();
    if (motivo.length < 8) {
        throw new AppError('Debe indicar el motivo del cambio (mínimo 8 caracteres).', 400);
    }
    const fechaEfectiva = String(opts?.fechaEfectiva ?? '').trim();
    if (!fechaEfectiva) {
        throw new AppError('Debe indicar la fecha del cambio.', 400);
    }

    const ejecucion = await prisma.checklistEjecucion.findUnique({ where: { id } });
    if (!ejecucion) throw new AppError('Ejecución de checklist no encontrada', 404);

    const detalle = parseRespuestasEjecucion(ejecucion.respuestasJson);
    const estadoAnterior = String(
        (typeof detalle['estadoChecklist'] === 'string' ? detalle['estadoChecklist'] : null) ??
            ejecucion.estado ??
            '',
    ).toUpperCase();
    detalle['estadoChecklist'] = estado;
    if (detalle['borrador'] === true) {
        detalle['borrador'] = false;
    }

    const registroCambio = {
        estadoAnterior,
        estadoNuevo: estado,
        motivo,
        fechaEfectiva,
        actorRut: opts?.actorRut ?? null,
        registradoEn: new Date().toISOString(),
    };
    const historial = Array.isArray(detalle['historialCambiosEstado'])
        ? (detalle['historialCambiosEstado'] as unknown[])
        : [];
    historial.unshift(registroCambio);
    detalle['historialCambiosEstado'] = historial.slice(0, 30);
    detalle['ultimoCambioEstado'] = registroCambio;

    const actualizado = await prisma.checklistEjecucion.update({
        where: { id },
        data: {
            estado,
            respuestasJson: JSON.stringify(detalle),
        },
    });

    return { ejecucion: actualizado, estadoAnterior, estadoNuevo: estado, motivo, fechaEfectiva };
};
