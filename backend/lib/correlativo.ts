import { prisma } from './prisma.js';

/** Genera el siguiente correlativo anual `AAAA-NNN` (ej. `2026-001`). */
export async function siguienteCorrelativo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const existentes = await prisma.parteEmergencia.findMany({
    where: { correlativo: { startsWith: prefix } },
    select: { correlativo: true },
  });
  let max = 0;
  for (const row of existentes) {
    const parts = row.correlativo.split('-');
    if (parts.length === 2 && parts[0] === String(year)) {
      const n = parseInt(parts[1] ?? '0', 10);
      if (!Number.isNaN(n) && n > max) {
        max = n;
      }
    }
  }
  return `${year}-${String(max + 1).padStart(3, '0')}`;
}
