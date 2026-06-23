/** Reintenta operaciones Prisma ante fallos transitorios (p. ej. Neon dormido). */
export function esErrorConexionPrisma(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = String((error as { message?: string }).message ?? '').toLowerCase();
  return (
    msg.includes("can't reach database") ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('server has closed the connection') ||
    (error as { name?: string }).name === 'PrismaClientInitializationError'
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 3);
  const delayMs = opts?.delayMs ?? 800;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!esErrorConexionPrisma(error) || i === attempts - 1) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastError;
}

export async function calentarConexionPrisma(prisma: { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> }): Promise<boolean> {
  try {
    await withDbRetry(() => prisma.$queryRaw`SELECT 1`, { attempts: 5, delayMs: 1200 });
    return true;
  } catch {
    return false;
  }
}
