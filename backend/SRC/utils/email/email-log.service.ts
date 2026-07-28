import prisma from '../../prisma';

export async function registrarEmailLog(opts: {
  tipo: string;
  destinatario: string;
  subject: string;
  ok: boolean;
  detalle?: string | undefined;
}): Promise<void> {
  try {
    await prisma.emailNotificacionLog.create({
      data: {
        tipo: opts.tipo.slice(0, 80),
        destinatario: opts.destinatario.slice(0, 150),
        subject: opts.subject.slice(0, 255),
        ok: opts.ok ? 1 : 0,
        detalle: opts.detalle?.slice(0, 2000) ?? null,
      },
    });
  } catch (err) {
    console.error('[SIDEP email-log] No se pudo registrar envío:', err);
  }
}

export async function listarEmailLogs(limit = 50) {
  return prisma.emailNotificacionLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, Math.max(1, limit)),
  });
}
