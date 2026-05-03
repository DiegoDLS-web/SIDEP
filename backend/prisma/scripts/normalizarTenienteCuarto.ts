/**
 * Corrige cargos TENIENTE_CUARTO mal asignados masivamente (solo debe quedar quien corresponde en nómina).
 * Ejecutar: npx ts-node prisma/scripts/normalizarTenienteCuarto.ts
 */
import 'dotenv/config';
import { prisma } from '../../lib/prisma.js';

const NOMBRES_OFICIALES_TENIENTE_CUARTO = new Set<string>(['Claudio Aroca Oñate']);

async function main(): Promise<void> {
  const r = await prisma.usuario.updateMany({
    where: {
      cargoOficialidad: 'TENIENTE_CUARTO',
      nombre: { notIn: [...NOMBRES_OFICIALES_TENIENTE_CUARTO] },
    },
    data: { cargoOficialidad: 'VOLUNTARIO' },
  });
  console.log(`Actualizados registros con TENIENTE_CUARTO → VOLUNTARIO: ${r.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
