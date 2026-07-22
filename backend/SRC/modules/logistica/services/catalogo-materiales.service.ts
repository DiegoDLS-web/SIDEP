import prisma from '../../../prisma';

function slugCodigo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'MATERIAL';
}

export type MaterialDto = {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string | null;
  unidad: string | null;
  activo: boolean;
  stockBodega: number;
  stockMinimo: number;
};

type MaterialConStock = Awaited<ReturnType<typeof fetchMateriales>>[number];

async function fetchMateriales(incluirInactivos?: boolean) {
  return prisma.catalogoMaterial.findMany({
    where: incluirInactivos ? {} : { activo: 1 },
    include: { stockBodega: true },
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  });
}

function mapMaterial(row: MaterialConStock): MaterialDto {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    unidad: row.unidad,
    activo: row.activo === 1,
    stockBodega: row.stockBodega?.cantidad ?? 0,
    stockMinimo: row.stockBodega?.stockMinimo ?? 0,
  };
}

export async function listarMateriales(opts?: { incluirInactivos?: boolean }): Promise<MaterialDto[]> {
  const rows = await fetchMateriales(opts?.incluirInactivos);
  return rows.map(mapMaterial);
}

export async function crearMaterial(datos: {
  codigo?: string;
  nombre: string;
  categoria?: string | null;
  unidad?: string | null;
  stockMinimo?: number;
}): Promise<MaterialDto> {
  const nombre = String(datos.nombre ?? '').trim();
  if (!nombre) throw new Error('El nombre es obligatorio');

  let codigo = String(datos.codigo ?? '').trim();
  if (!codigo) codigo = slugCodigo(nombre);

  const existente = await prisma.catalogoMaterial.findUnique({ where: { codigo } });
  if (existente) throw new Error('Ya existe un material con ese código');

  const row = await prisma.catalogoMaterial.create({
    data: {
      codigo,
      nombre,
      categoria: datos.categoria ? String(datos.categoria).trim() : null,
      unidad: datos.unidad ? String(datos.unidad).trim() : 'un',
      activo: 1,
      stockBodega: {
        create: {
          cantidad: 0,
          stockMinimo: Math.max(0, Number(datos.stockMinimo) || 0),
        },
      },
    },
    include: { stockBodega: true },
  });
  return mapMaterial(row);
}

export async function actualizarMaterial(
  id: number,
  datos: {
    codigo?: string;
    nombre?: string;
    categoria?: string | null;
    unidad?: string | null;
    stockMinimo?: number;
  },
): Promise<MaterialDto> {
  const actual = await prisma.catalogoMaterial.findUnique({
    where: { id },
    include: { stockBodega: true },
  });
  if (!actual) throw new Error('Material no encontrado');

  if (datos.codigo && datos.codigo.trim() !== actual.codigo) {
    const dup = await prisma.catalogoMaterial.findUnique({ where: { codigo: datos.codigo.trim() } });
    if (dup) throw new Error('Ya existe un material con ese código');
  }

  const stockMinimo =
    datos.stockMinimo !== undefined ? Math.max(0, Number(datos.stockMinimo) || 0) : undefined;

  const data: Parameters<typeof prisma.catalogoMaterial.update>[0]['data'] = {};
  if (datos.codigo?.trim()) data.codigo = datos.codigo.trim();
  if (datos.nombre?.trim()) data.nombre = datos.nombre.trim();
  if (datos.categoria !== undefined) {
    data.categoria = datos.categoria ? String(datos.categoria).trim() : null;
  }
  if (datos.unidad !== undefined) {
    data.unidad = datos.unidad ? String(datos.unidad).trim() : null;
  }
  if (stockMinimo !== undefined) {
    data.stockBodega = {
      upsert: {
        create: { cantidad: actual.stockBodega?.cantidad ?? 0, stockMinimo },
        update: { stockMinimo },
      },
    };
  }

  const row = await prisma.catalogoMaterial.update({
    where: { id },
    data,
    include: { stockBodega: true },
  });
  return mapMaterial(row);
}

export async function cambiarActivoMaterial(id: number, activo: boolean): Promise<MaterialDto> {
  const row = await prisma.catalogoMaterial.update({
    where: { id },
    data: { activo: activo ? 1 : 0 },
    include: { stockBodega: true },
  });
  return mapMaterial(row);
}
