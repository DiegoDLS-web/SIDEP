import prisma from '../prisma';

type CatalogoWhere = {
  OR: Array<{ codigo?: { equals: string; mode: 'insensitive' }; nombre?: { equals: string; mode: 'insensitive' } }>;
  activo?: number;
};

function condicionesCodigoNombre(valor: string): CatalogoWhere['OR'] {
  const v = valor.trim();
  return [
    { codigo: { equals: v, mode: 'insensitive' } },
    { nombre: { equals: v, mode: 'insensitive' } },
  ];
}

const ALIAS_GRUPO_SANGUINEO: Record<string, string[]> = {
  'A+': ['A+', 'A_POSITIVO'],
  'A-': ['A-', 'A_NEGATIVO'],
  'B+': ['B+', 'B_POSITIVO'],
  'B-': ['B-', 'B_NEGATIVO'],
  'AB+': ['AB+', 'AB_POSITIVO'],
  'AB-': ['AB-', 'AB_NEGATIVO'],
  'O+': ['O+', 'O_POSITIVO'],
  'O-': ['O-', 'O_NEGATIVO'],
  DESCONOCIDO: ['DESCONOCIDO', 'NO_CONOCIDO', 'SIN_DATO'],
};

export async function resolverRolId(valor?: string | null, fallbackId = 2): Promise<number> {
  if (!valor?.trim()) return fallbackId;
  const r = await prisma.rolUsuario.findFirst({
    where: { OR: condicionesCodigoNombre(valor), activo: 1 },
  });
  return r?.id ?? fallbackId;
}

export async function resolverCargoId(valor?: string | null): Promise<number | null> {
  if (!valor?.trim()) return null;
  const c = await prisma.catalogoCargoOficialidad.findFirst({
    where: { OR: condicionesCodigoNombre(valor), activo: 1 },
  });
  return c?.id ?? null;
}

export async function resolverTipoVoluntarioId(valor?: string | null): Promise<number | null> {
  if (!valor?.trim()) return null;
  const c = await prisma.catalogoTipoVoluntario.findFirst({
    where: { OR: condicionesCodigoNombre(valor), activo: 1 },
  });
  return c?.id ?? null;
}

export async function resolverEstadoVoluntarioId(valor?: string | null): Promise<number | null> {
  if (!valor?.trim()) return null;
  const c = await prisma.catalogoEstadoVoluntario.findFirst({
    where: { OR: condicionesCodigoNombre(valor), activo: 1 },
  });
  return c?.id ?? null;
}

export async function resolverGrupoSanguineoId(valor?: string | null): Promise<number | null> {
  if (!valor?.trim()) return null;
  const clave = valor.trim().toUpperCase();
  const candidatos = ALIAS_GRUPO_SANGUINEO[clave] ?? [valor.trim()];
  for (const c of candidatos) {
    const gs = await prisma.catalogoGrupoSanguineo.findFirst({
      where: { OR: condicionesCodigoNombre(c), activo: 1 },
    });
    if (gs) return gs.id;
  }
  return null;
}
