import prisma from '../../../prisma';
import { randomUUID } from 'crypto';
import { AppError } from '../../../utils';
import { registrarEjecucion } from './checklists.service';

function parseRespuestasJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

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
  const ejecuciones = await prisma.checklistEjecucion.findMany({
    where: { entidadTipo: 'TRAUMA' },
    include: {
      revisor: { select: { nombres: true, apellidoPaterno: true, rut: true } },
    },
    orderBy: { fechaRevision: 'desc' },
    take: 500,
  });

  const carros = await prisma.carro.findMany({
    select: { id: true, nomenclatura: true, nombre: true },
  });
  const carroPorId = new Map(carros.map((c) => [c.id, c]));

  return ejecuciones.map((e) => {
    const detalle = parseRespuestasJson(e.respuestasJson);
    const carro = carroPorId.get(e.entidadId);
    const obacNombre = e.revisor
      ? `${e.revisor.nombres} ${e.revisor.apellidoPaterno}`.trim()
      : null;
    return {
      id: e.id,
      unidad: carro?.nomenclatura ?? e.entidadId,
      fecha: e.fechaRevision.toISOString(),
      inspector: typeof detalle['inspector'] === 'string' ? detalle['inspector'] : null,
      grupoGuardia: detalle['grupoGuardia'] ?? null,
      cuarteleroId: e.revisorRut,
      cuartelero: obacNombre ? { id: e.revisorRut, nombre: obacNombre } : null,
      observaciones: typeof detalle['observaciones'] === 'string' ? detalle['observaciones'] : null,
      totalItems: Number(detalle['totalItems']) || 0,
      itemsOk: Number(detalle['itemsOk']) || 0,
      detalle,
      borrador: detalle['borrador'] === true,
    };
  });
};

export const obtenerUnidadBolsoTrauma = async (nomenclatura: string) => {
  const unidad = nomenclatura.trim().toUpperCase();
  const carro = await prisma.carro.findFirst({
    where: { nomenclatura: unidad },
    include: {
      bolsos: { where: { activo: 1 }, orderBy: { nombreIdentificador: 'asc' } },
    },
  });
  if (!carro) {
    throw new AppError(`No se encontró la unidad ${unidad}.`, 404);
  }

  const ultima = await prisma.checklistEjecucion.findFirst({
    where: { entidadId: carro.id, entidadTipo: 'TRAUMA' },
    orderBy: { fechaRevision: 'desc' },
    include: {
      revisor: { select: { nombres: true, apellidoPaterno: true, rut: true } },
    },
  });

  let checklist: Record<string, unknown> | null = null;
  if (ultima) {
    const detalle = parseRespuestasJson(ultima.respuestasJson);
    const obacNombre = ultima.revisor
      ? `${ultima.revisor.nombres} ${ultima.revisor.apellidoPaterno}`.trim()
      : null;
    checklist = {
      id: ultima.id,
      cuarteleroId: ultima.revisorRut,
      fecha: ultima.fechaRevision.toISOString(),
      inspector: typeof detalle['inspector'] === 'string' ? detalle['inspector'] : null,
      grupoGuardia: detalle['grupoGuardia'] ?? null,
      observaciones: typeof detalle['observaciones'] === 'string' ? detalle['observaciones'] : null,
      firmaOficial: ultima.firmaOficial,
      firmaInspector: ultima.firmaRevisor,
      totalItems: Number(detalle['totalItems']) || 0,
      itemsOk: Number(detalle['itemsOk']) || 0,
      detalle,
    };
    if (obacNombre) {
      checklist['cuartelero'] = { id: ultima.revisorRut, nombre: obacNombre, rol: '' };
    }
  }

  return {
    carro: {
      id: carro.id,
      nomenclatura: carro.nomenclatura,
      nombre: carro.nombre,
    },
    checklist,
  };
};

export const guardarRevisionBolsoTrauma = async (
  nomenclatura: string,
  payload: Record<string, unknown>,
) => {
  const unidad = nomenclatura.trim().toUpperCase();
  const carro = await prisma.carro.findFirst({ where: { nomenclatura: unidad } });
  if (!carro) {
    throw new AppError(`No se encontró la unidad ${unidad}.`, 404);
  }

  const cuarteleroId = String(payload['cuarteleroId'] ?? '').trim();
  if (!cuarteleroId) {
    throw new AppError('Selecciona un voluntario responsable (OBAC).', 400);
  }

  const detalle = (payload['detalle'] as Record<string, unknown>) ?? {};
  const resultados = {
    ...detalle,
    inspector: payload['inspector'] ?? null,
    grupoGuardia: payload['grupoGuardia'] ?? null,
    observaciones: payload['observaciones'] ?? null,
    totalItems: payload['totalItems'] ?? null,
    itemsOk: payload['itemsOk'] ?? null,
  };

  const ejecucion = await registrarEjecucion(
    carro.id,
    cuarteleroId,
    undefined,
    resultados,
    {
      entidadTipo: 'TRAUMA',
      firmaOficial: (payload['firmaOficial'] as string | null) ?? null,
      firmaInspector: (payload['firmaInspector'] as string | null) ?? null,
    },
  );

  return {
    id: ejecucion.id,
    fecha: ejecucion.fechaRevision.toISOString(),
    unidad: carro.nomenclatura,
    carroId: carro.id,
    cuarteleroId,
    inspector: payload['inspector'] ?? null,
    grupoGuardia: payload['grupoGuardia'] ?? null,
    observaciones: payload['observaciones'] ?? null,
    totalItems: payload['totalItems'] ?? null,
    itemsOk: payload['itemsOk'] ?? null,
    detalle: resultados,
    firmaOficial: ejecucion.firmaOficial,
    firmaInspector: ejecucion.firmaRevisor,
  };
};