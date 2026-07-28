/**
 * Asigna tallas a EPP/uniformes y distribuye asignaciones a voluntarios según inventario UNIFORMES.
 * Uso: npx ts-node scripts/seed-uniformes-matriz.ts [--solo-tallas] [--solo-asignaciones] [--reset-asignaciones]
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import prisma from '../SRC/prisma';
import {
  TALLAS_BOTA,
  TALLAS_ROPA,
  extraerTallaDeNombre,
  inferirSistemaTalla,
  inferirTipoEpp,
  type SistemaTalla,
} from '../SRC/utils/epp-tallas.util';

const args = new Set(process.argv.slice(2));
const soloTallas = args.has('--solo-tallas');
const soloAsignaciones = args.has('--solo-asignaciones');
const resetAsignaciones = args.has('--reset-asignaciones');

/** Tipos EPP que un voluntario puede tener (uno por tipo). */
const TIPOS_EPP_VOLUNTARIO = [
  'GORRA',
  'CHAQUETA_UNIFORME',
  'PANTALON',
  'UNIFORME_N1',
  'CHAQUETA',
  'JARDINERA',
  'BOTA_ESTRUCTURAL',
  'BOTA_FORESTAL',
  'CHAQUETA_RESCATE',
  'CHAQUETA_FORESTAL',
] as const;

function tallasPara(sistema: SistemaTalla): string[] {
  if (sistema === 'BOTA') return [...TALLAS_BOTA];
  if (sistema === 'ROPA') return [...TALLAS_ROPA];
  return [];
}

async function asignarTallas(): Promise<number> {
  const rows = await prisma.inventarioItem.findMany({
    where: {
      activo: 1,
      OR: [{ esEppAsignable: 1 }, { categoria: 'Uniformes' }],
    },
    orderBy: [{ tipoEpp: 'asc' }, { id: 'asc' }],
  });

  const contadorPorTipo = new Map<string, number>();
  let actualizados = 0;

  for (const row of rows) {
    const tipoEpp = row.tipoEpp ?? inferirTipoEpp(row.nombre, row.categoria);
    const sistema = (row.sistemaTalla as SistemaTalla) ?? inferirSistemaTalla(tipoEpp);
    let talla = row.talla?.trim() || extraerTallaDeNombre(row.nombre, sistema);

    if (!talla && sistema && tipoEpp) {
      const pool = tallasPara(sistema);
      const idx = contadorPorTipo.get(tipoEpp) ?? 0;
      talla = pool[idx % pool.length] ?? pool[0] ?? null;
      contadorPorTipo.set(tipoEpp, idx + 1);
    }

    const patch: Record<string, unknown> = {};
    if (tipoEpp && tipoEpp !== row.tipoEpp) patch.tipoEpp = tipoEpp;
    if (sistema && sistema !== row.sistemaTalla) patch.sistemaTalla = sistema;
    if (talla && talla !== row.talla) patch.talla = talla;
    if (row.esEppAsignable !== 1 && (tipoEpp || row.categoria === 'Uniformes')) patch.esEppAsignable = 1;

    if (Object.keys(patch).length) {
      await prisma.inventarioItem.update({ where: { id: row.id }, data: patch });
      actualizados += 1;
    }
  }

  return actualizados;
}

async function limpiarAsignacionesDemo(): Promise<number> {
  const r = await prisma.asignacionInventarioEpp.deleteMany({
    where: {
      OR: [
        { observaciones: { contains: 'demo', mode: 'insensitive' } },
        { observaciones: { contains: 'seed', mode: 'insensitive' } },
        { observaciones: { contains: 'planilla', mode: 'insensitive' } },
      ],
    },
  });
  return r.count;
}

async function crearAsignacionesPorVoluntario(): Promise<number> {
  const voluntarios = await prisma.usuario.findMany({
    where: { activo: 1, estadoVoluntario: { codigo: 'VIGENTE' } },
    select: { rut: true, nombres: true, apellidoPaterno: true },
    orderBy: [{ apellidoPaterno: 'asc' }, { nombres: 'asc' }],
    take: 40,
  });
  if (!voluntarios.length) {
    console.log('Sin voluntarios vigentes.');
    return 0;
  }

  const items = await prisma.inventarioItem.findMany({
    where: {
      activo: 1,
      esEppAsignable: 1,
      talla: { not: null },
      bodega: { codigo: 'UNIFORMES' },
      tipoEpp: { not: null },
    },
    include: { asignaciones: true },
    orderBy: [{ tipoEpp: 'asc' }, { talla: 'asc' }, { id: 'asc' }],
  });

  let creadas = 0;
  const reservas = new Map<number, number>();

  for (let vi = 0; vi < voluntarios.length; vi++) {
    const vol = voluntarios[vi]!;
    const tallaPreferida = TALLAS_ROPA[vi % TALLAS_ROPA.length]!;

    for (const tipo of TIPOS_EPP_VOLUNTARIO) {
      const yaTiene = await prisma.asignacionInventarioEpp.findFirst({
        where: {
          usuarioRut: vol.rut,
          inventarioItem: { tipoEpp: tipo, activo: 1 },
        },
      });
      if (yaTiene) continue;

      const candidatos = items.filter((it) => {
        if (it.tipoEpp !== tipo) return false;
        const dbAsig = it.asignaciones.reduce((a, x) => a + x.cantidad, 0);
        const extra = reservas.get(it.id) ?? 0;
        return it.cantidad - dbAsig - extra >= 1;
      });
      if (!candidatos.length) continue;

      const preferido = candidatos.find((c) => c.talla === tallaPreferida) ?? candidatos[vi % candidatos.length];
      if (!preferido) continue;

      await prisma.asignacionInventarioEpp.create({
        data: {
          id: randomUUID(),
          inventarioItemId: preferido.id,
          usuarioRut: vol.rut,
          cantidad: 1,
          observaciones: 'Asignación planilla inventario · seed',
        },
      });
      reservas.set(preferido.id, (reservas.get(preferido.id) ?? 0) + 1);
      creadas += 1;
    }
  }

  return creadas;
}

async function main() {
  if (resetAsignaciones) {
    const n = await limpiarAsignacionesDemo();
    console.log(`🗑️  Asignaciones demo/planilla eliminadas: ${n}`);
  }
  if (!soloAsignaciones) {
    const n = await asignarTallas();
    console.log(`✅ Tallas/tipos EPP actualizados en ${n} ítems.`);
  }
  if (!soloTallas) {
    const n = await crearAsignacionesPorVoluntario();
    console.log(`✅ Asignaciones EPP creadas: ${n}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
