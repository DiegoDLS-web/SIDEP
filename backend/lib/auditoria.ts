import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

type RegistrarActividadInput = {
  usuarioId?: number | undefined;
  accion: string;
  modulo: string;
  referencia?: string | undefined;
  detalle?: Prisma.InputJsonValue | undefined;
};

export async function registrarActividad(input: RegistrarActividadInput): Promise<void> {
  try {
    await prisma.actividadUsuario.create({
      data: {
        accion: input.accion,
        modulo: input.modulo,
        ...(input.usuarioId !== undefined ? { usuarioId: input.usuarioId } : {}),
        ...(input.referencia !== undefined ? { referencia: input.referencia } : {}),
        ...(input.detalle !== undefined ? { detalle: input.detalle } : {}),
      },
    });
  } catch {
    // No bloquear flujo por un fallo de auditoría.
  }
}
