/**
 * Completa tipoEpp, sistemaTalla y talla inferida en ítems EPP existentes.
 * Uso: npx ts-node --transpile-only scripts/backfill-inventario-epp.ts
 */
import 'dotenv/config';
import { backfillTiposEpp } from '../SRC/modules/logistica/services/inventario-items.service';
import prisma from '../SRC/prisma';

async function main() {
  const n = await backfillTiposEpp();
  console.log(`✅ Actualizados ${n} ítems EPP (tipo / sistema de talla / talla).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
