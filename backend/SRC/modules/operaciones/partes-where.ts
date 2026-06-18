import type { Prisma } from '@prisma/client';

/** Excluye partes anulados (incluye borrador, pendiente y completado). */
export const whereParteNoAnulado: Prisma.ParteEmergenciaWhereInput = {
  NOT: { estado: { codigo: 'ANULADO' } },
};

export function parteWhereNoAnulado(
  extra?: Prisma.ParteEmergenciaWhereInput,
): Prisma.ParteEmergenciaWhereInput {
  if (!extra || Object.keys(extra).length === 0) return whereParteNoAnulado;
  return { AND: [whereParteNoAnulado, extra] };
}
