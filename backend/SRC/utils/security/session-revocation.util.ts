import prisma from '../../prisma';

/** Incrementa tokenVersion → invalida JWT previos que no coincidan. */
export async function invalidarSesionesUsuario(rut: string): Promise<void> {
  await prisma.usuario.update({
    where: { rut },
    data: { tokenVersion: { increment: 1 } },
  });
}

export function tokenVersionEnJwt(decoded: Record<string, unknown>): number {
  const tv = decoded['tv'];
  return typeof tv === 'number' && Number.isFinite(tv) ? Math.trunc(tv) : 0;
}
