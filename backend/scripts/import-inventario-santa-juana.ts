/**
 * Importa la planilla Excel de inventario CB Santa Juana → inventario_item.
 * Uso: npx ts-node scripts/import-inventario-santa-juana.ts [ruta.xlsx]
 */
import 'dotenv/config';
import ExcelJS from 'exceljs';
import prisma from '../SRC/prisma';
import {
  extraerTallaDeNombre,
  inferirSistemaTalla,
  inferirTipoEpp,
} from '../SRC/utils/epp-tallas.util';

const UNIFORMES_RE = /UNIFORM|CHAQUET|PANTALON|BOTA|COTONA|JARDINERA|CHAQUETON|GORRA/i;

function inferCategoria(nombre: string, tipo: string): string {
  const n = nombre.toUpperCase();
  if (UNIFORMES_RE.test(n)) return 'Uniformes';
  if (n.includes('MANGUERA')) return 'Mangueras';
  if (n.includes('EXTINTOR')) return 'Extintores';
  if (tipo === 'EPP' && UNIFORMES_RE.test(n)) return 'Uniformes';
  return 'Equipamiento';
}

function inferBodegaCodigo(nombre: string, tipo: string, categoria: string): string {
  if (categoria === 'Uniformes') return 'UNIFORMES';
  if (tipo === 'RESCATE') return 'RESCATE';
  if (tipo.includes('INCENDIO') || categoria === 'Mangueras' || categoria === 'Extintores') return 'AGUA';
  if (tipo === 'FORESTAL') return 'RESCATE';
  return 'RESCATE';
}

function esEppAsignable(nombre: string, categoria: string, tipo: string): number {
  if (categoria === 'Uniformes') return 1;
  if (tipo !== 'EPP') return 0;
  return UNIFORMES_RE.test(nombre) ? 1 : 0;
}

function stockMinimo(cantidad: number): number {
  const q = Math.max(0, Math.trunc(cantidad));
  if (q <= 1) return 1;
  if (q <= 5) return 2;
  return Math.max(2, Math.ceil(q * 0.4));
}

function stockCritico(min: number): number {
  return Math.max(1, Math.floor(min * 0.5));
}

function limpiarTexto(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

async function main() {
  const filePath =
    process.argv[2] ||
    String.raw`c:\Users\kiwip\Downloads\PLANILLA INVENTARIO CB SANTA JUANA - PRIMERA COMPAÑIA.xlsx`;

  const bodegas = await prisma.catalogoBodega.findMany();
  const bodegaPorCodigo = new Map(bodegas.map((b) => [b.codigo, b.id]));

  const existentes = await prisma.inventarioItem.count();
  if (existentes > 0) {
    console.log(`Ya hay ${existentes} ítems. Abortando para no duplicar.`);
    console.log('Si deseas reimportar, vacía inventario_item primero.');
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('PRIMERA') ?? wb.worksheets[0];
  if (!ws) throw new Error('Hoja no encontrada');

  let seq = 1;
  let insertados = 0;
  const contadorTallaPorTipo = new Map<string, number>();

  function siguienteTalla(tipoEpp: string | null, sistema: ReturnType<typeof inferirSistemaTalla>): string | null {
    if (!tipoEpp || !sistema) return null;
    const pool = sistema === 'BOTA' ? Array.from({ length: 12 }, (_, i) => String(35 + i)) : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const idx = contadorTallaPorTipo.get(tipoEpp) ?? 0;
    contadorTallaPorTipo.set(tipoEpp, idx + 1);
    return pool[idx % pool.length] ?? null;
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const nombre = limpiarTexto(row.getCell(1).value);
    if (!nombre) continue;

    const cantidadRaw = Number(row.getCell(2).value ?? 0);
    const cantidad = Math.max(0, Math.trunc(cantidadRaw));
    const marca = limpiarTexto(row.getCell(3).value) || null;
    const modelo = limpiarTexto(row.getCell(4).value) || null;
    const estadoFisico = limpiarTexto(row.getCell(5).value) || null;
    const valorRaw = Number(row.getCell(6).value ?? 0);
    const valor = Number.isFinite(valorRaw) && valorRaw > 0 ? valorRaw : null;
    const observaciones = limpiarTexto(row.getCell(7).value) || null;
    const tipo = limpiarTexto(row.getCell(8).value) || 'OTRO';

    const categoria = inferCategoria(nombre, tipo);
    const bodegaCodigo = inferBodegaCodigo(nombre, tipo, categoria);
    const bodegaId = bodegaPorCodigo.get(bodegaCodigo);
    if (!bodegaId) throw new Error(`Bodega no encontrada: ${bodegaCodigo}`);

    const min = stockMinimo(cantidad);
    const crit = stockCritico(min);
    const codigo = `INV-${String(seq).padStart(4, '0')}`;
    seq += 1;

    const epp = esEppAsignable(nombre, categoria, tipo);
    const tipoEpp = epp ? inferirTipoEpp(nombre, categoria) : null;
    const sistemaTalla = inferirSistemaTalla(tipoEpp);
    const talla = extraerTallaDeNombre(nombre, sistemaTalla) ?? (epp ? siguienteTalla(tipoEpp, sistemaTalla) : null);

    await prisma.inventarioItem.create({
      data: {
        codigo,
        nombre: nombre.slice(0, 200),
        categoria,
        tipoInventario: tipo.slice(0, 80),
        tipoEpp,
        talla,
        sistemaTalla,
        bodegaId,
        marca: marca?.slice(0, 100) ?? null,
        modelo: modelo?.slice(0, 100) ?? null,
        estadoFisico: estadoFisico?.slice(0, 50) ?? null,
        valor,
        observaciones,
        unidad: 'unidades',
        cantidad,
        stockMinimo: min,
        stockCritico: crit,
        esEppAsignable: epp,
        activo: 1,
      },
    });
    insertados += 1;
    if (insertados % 100 === 0) console.log(`… ${insertados} ítems`);
  }

  console.log(`✅ Importados ${insertados} ítems desde ${filePath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
