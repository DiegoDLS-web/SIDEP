import prisma from '../prisma';
import { randomUUID } from 'crypto';
import { AppError } from './errors/AppError';

export type FilaInventarioCarro = {
  id: string;
  carroId: string;
  materialId: number;
  cantidadObjetivo: number;
  ubicacion: string | null;
  material: { nombre: string };
};

export type MaterialChecklistInventario = {
  id?: string;
  inventarioId?: string;
  materialId?: number;
  nombre: string;
  cantidadRequerida: number;
  cantidadActual: number;
};

export type UbicacionChecklistInventario = {
  nombre: string;
  materiales: MaterialChecklistInventario[];
};

export type InventarioLookup = Map<string, { materialId: number; inventarioId: string; cantidadObjetivo: number; nombre: string }>;

function normTexto(value: string): string {
  return value.trim().toLowerCase();
}

function normUbicacion(value: string | null | undefined): string {
  const t = (value ?? '').trim();
  return t.length > 0 ? t : 'Sin ubicación';
}

function claveMaterial(ubicacion: string, materialId?: number | null, nombre?: string): string {
  const ub = normUbicacion(ubicacion);
  if (materialId != null && Number.isFinite(materialId)) {
    return `${ub}::id:${materialId}`;
  }
  return `${ub}::nom:${normTexto(nombre ?? '')}`;
}

/** Índice de inventario por ubicación + material (id o nombre). */
export function buildInventarioLookup(filas: FilaInventarioCarro[]): InventarioLookup {
  const map: InventarioLookup = new Map();
  for (const fila of filas) {
    const ubicacion = normUbicacion(fila.ubicacion);
    const entry = {
      materialId: fila.materialId,
      inventarioId: fila.id,
      cantidadObjetivo: Math.max(0, Number(fila.cantidadObjetivo ?? 0)),
      nombre: fila.material.nombre,
    };
    map.set(claveMaterial(ubicacion, fila.materialId), entry);
    map.set(claveMaterial(ubicacion, null, fila.material.nombre), entry);
  }
  return map;
}

/** Agrupa filas de material_por_carro en ubicaciones para el checklist. */
export function ubicacionesDesdeInventario(filas: FilaInventarioCarro[]): UbicacionChecklistInventario[] {
  const porUbicacion = new Map<string, MaterialChecklistInventario[]>();

  for (const fila of filas) {
    const nombreUbicacion = normUbicacion(fila.ubicacion);
    const lista = porUbicacion.get(nombreUbicacion) ?? [];
    lista.push({
      id: fila.id,
      inventarioId: fila.id,
      materialId: fila.materialId,
      nombre: fila.material.nombre,
      cantidadRequerida: Math.max(0, Number(fila.cantidadObjetivo ?? 0)),
      cantidadActual: 0,
    });
    porUbicacion.set(nombreUbicacion, lista);
  }

  return [...porUbicacion.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([nombre, materiales]) => ({
      nombre,
      materiales: materiales.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }));
}

function parsePayload(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

export function aplicarInventarioAlPayload(
  data: unknown,
  inventario: InventarioLookup,
): Record<string, unknown> | null {
  const obj = parsePayload(data);
  if (!obj || !Array.isArray(obj['ubicaciones']) || inventario.size === 0) {
    return obj;
  }

  const ubicaciones = (obj['ubicaciones'] as Array<Record<string, unknown>>).map((ubicacion) => {
    const nombreUb = String(ubicacion['nombre'] ?? '');
    const materiales = Array.isArray(ubicacion['materiales'])
      ? (ubicacion['materiales'] as Array<Record<string, unknown>>).map((mat) => {
          const materialId = mat['materialId'] != null ? Number(mat['materialId']) : undefined;
          const nombre = String(mat['nombre'] ?? '');
          const clave =
            materialId != null && Number.isFinite(materialId)
              ? claveMaterial(nombreUb, materialId)
              : claveMaterial(nombreUb, null, nombre);
          const ref = inventario.get(clave);
          if (!ref) {
            return { ...mat };
          }
          return {
            ...mat,
            inventarioId: ref.inventarioId,
            materialId: ref.materialId,
            nombre: ref.nombre || nombre,
            cantidadRequerida: ref.cantidadObjetivo,
          };
        })
      : [];
    return { ...ubicacion, materiales };
  });

  return { ...obj, ubicaciones, inventarioAplicado: true };
}

export async function cargarFilasInventarioCarro(carroId: string): Promise<FilaInventarioCarro[]> {
  return prisma.materialPorCarro.findMany({
    where: { carroId, activo: 1 },
    include: { material: { select: { nombre: true } } },
    orderBy: [{ ubicacion: 'asc' }, { material: { nombre: 'asc' } }],
  });
}

export async function cargarLookupInventarioCarro(carroId: string): Promise<InventarioLookup> {
  const filas = await cargarFilasInventarioCarro(carroId);
  return buildInventarioLookup(filas);
}

export async function cargarLookupInventarioPorCarros(carroIds: string[]): Promise<Map<string, InventarioLookup>> {
  const mapa = new Map<string, InventarioLookup>();
  if (carroIds.length === 0) return mapa;

  const filas = await prisma.materialPorCarro.findMany({
    where: { carroId: { in: carroIds }, activo: 1 },
    include: { material: { select: { nombre: true } } },
  });

  const porCarro = new Map<string, FilaInventarioCarro[]>();
  for (const fila of filas) {
    const lista = porCarro.get(fila.carroId) ?? [];
    lista.push(fila);
    porCarro.set(fila.carroId, lista);
  }

  for (const carroId of carroIds) {
    mapa.set(carroId, buildInventarioLookup(porCarro.get(carroId) ?? []));
  }
  return mapa;
}

function slugMaterialCodigo(nombre: string): string {
  const base = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return base || `MAT_${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function resolverMaterialCatalogo(nombre: string): Promise<number> {
  const nombreTrim = nombre.trim();
  if (!nombreTrim) {
    throw new AppError('El material debe tener nombre.', 400);
  }

  const existente = await prisma.catalogoMaterial.findFirst({
    where: {
      OR: [
        { nombre: { equals: nombreTrim, mode: 'insensitive' } },
        { codigo: slugMaterialCodigo(nombreTrim) },
      ],
    },
  });
  if (existente) return existente.id;

  const codigoBase = slugMaterialCodigo(nombreTrim);
  let codigo = codigoBase;
  let sufijo = 1;
  while (await prisma.catalogoMaterial.findUnique({ where: { codigo } })) {
    codigo = `${codigoBase.slice(0, 44)}_${sufijo}`;
    sufijo += 1;
  }

  const creado = await prisma.catalogoMaterial.create({
    data: {
      codigo,
      nombre: nombreTrim,
      categoria: 'Checklist unidad',
      activo: 1,
    },
  });
  return creado.id;
}

export type UbicacionSyncInput = {
  nombre?: string;
  materiales?: Array<{
    nombre?: string;
    cantidadRequerida?: number;
    materialId?: number;
  }>;
};

/** Crea o actualiza filas en material_por_carro desde ubicaciones del checklist. */
export async function sincronizarInventarioDesdeUbicaciones(
  carroId: string,
  ubicaciones: UbicacionSyncInput[],
): Promise<{ creados: number; actualizados: number; desactivados: number }> {
  const carro = await prisma.carro.findUnique({ where: { id: carroId } });
  if (!carro) throw new AppError('Carro no encontrado', 404);

  let creados = 0;
  let actualizados = 0;
  let desactivados = 0;
  const clavesActivas = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const ubicacion of ubicaciones ?? []) {
      const nombreUbicacion = String(ubicacion.nombre ?? '').trim() || 'Sin ubicación';
      for (const mat of ubicacion.materiales ?? []) {
        const nombre = String(mat.nombre ?? '').trim();
        if (!nombre) continue;

        const cantidadObjetivo = Math.max(0, Math.round(Number(mat.cantidadRequerida ?? 0)));
        const materialId =
          mat.materialId != null && Number.isFinite(Number(mat.materialId))
            ? Number(mat.materialId)
            : await resolverMaterialCatalogo(nombre);

        clavesActivas.add(`${materialId}::${nombreUbicacion}`);

        const existente = await tx.materialPorCarro.findFirst({
          where: { carroId, materialId, ubicacion: nombreUbicacion },
        });

        if (existente) {
          await tx.materialPorCarro.update({
            where: { id: existente.id },
            data: { cantidadObjetivo, activo: 1 },
          });
          actualizados += 1;
        } else {
          await tx.materialPorCarro.create({
            data: {
              id: randomUUID(),
              carroId,
              materialId,
              cantidadObjetivo,
              ubicacion: nombreUbicacion,
              activo: 1,
            },
          });
          creados += 1;
        }
      }
    }

    const filasActivas = await tx.materialPorCarro.findMany({ where: { carroId, activo: 1 } });
    for (const fila of filasActivas) {
      const ub = String(fila.ubicacion ?? '').trim() || 'Sin ubicación';
      const clave = `${fila.materialId}::${ub}`;
      if (!clavesActivas.has(clave)) {
        await tx.materialPorCarro.update({
          where: { id: fila.id },
          data: { activo: 0 },
        });
        desactivados += 1;
      }
    }
  });

  return { creados, actualizados, desactivados };
}
