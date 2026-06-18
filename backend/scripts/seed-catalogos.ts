/**
 * Catálogos mínimos para licencias, usuarios, partes y bolsos.
 * Uso: npx ts-node -r dotenv/config scripts/seed-catalogos.ts
 */
import { randomUUID } from 'crypto';
import prisma from '../SRC/prisma';

async function upsertCatalogo(
  tabla: 'catalogoEstadoLicencia' | 'catalogoEstadoVoluntario' | 'catalogoTipoVoluntario' | 'catalogoCargoOficialidad' | 'catalogoGrupoSanguineo' | 'catalogoEstadoParte' | 'catalogoClaveEmergencia' | 'catalogoBolso' | 'catalogoTriage' | 'rolUsuario',
  items: Array<{ codigo: string; nombre: string }>,
) {
  for (const item of items) {
    const model = (prisma as any)[tabla];
    const existente = await model.findFirst({ where: { codigo: item.codigo } });
    if (existente) {
      await model.update({
        where: { id: existente.id },
        data: { nombre: item.nombre, activo: 1 },
      });
    } else {
      try {
        await model.create({
          data: { codigo: item.codigo, nombre: item.nombre, activo: 1 },
        });
      } catch (err: any) {
        const porNombre = await model.findFirst({
          where: { nombre: { equals: item.nombre, mode: 'insensitive' } },
        });
        if (porNombre) {
          await model.update({
            where: { id: porNombre.id },
            data: { codigo: item.codigo, activo: 1 },
          });
        } else if (err?.code === 'P2002') {
          console.warn(`  omitido ${tabla}/${item.codigo} (conflicto de ID en catálogo)`);
        } else {
          throw err;
        }
      }
    }
    console.log(`  ${tabla}: ${item.codigo}`);
  }
}

async function main() {
  console.log('Sembrando catálogos...');

  await upsertCatalogo('catalogoEstadoLicencia', [
    { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    { codigo: 'APROBADA', nombre: 'Aprobada' },
    { codigo: 'RECHAZADA', nombre: 'Rechazada' },
  ]);

  await upsertCatalogo('catalogoEstadoVoluntario', [
    { codigo: 'VIGENTE', nombre: 'Vigente' },
    { codigo: 'INACTIVO', nombre: 'Inactivo' },
    { codigo: 'SUSPENDIDO', nombre: 'Suspendido' },
  ]);

  await upsertCatalogo('catalogoTipoVoluntario', [
    { codigo: 'ASPIRANTE', nombre: 'Aspirante' },
    { codigo: 'VOLUNTARIO', nombre: 'Voluntario' },
    { codigo: 'HONORARIO', nombre: 'Voluntario honorario' },
    { codigo: 'INSIGNE', nombre: 'Voluntario insigne' },
    { codigo: 'CANJE', nombre: 'Canje' },
    { codigo: 'CUARTELERO', nombre: 'Cuartelero' },
    { codigo: 'CONFEDERADO', nombre: 'Confederado' },
  ]);

  await upsertCatalogo('catalogoCargoOficialidad', [
    { codigo: 'VOLUNTARIO', nombre: 'Voluntario (sin cargo de oficialidad)' },
    { codigo: 'DIRECTOR_COMPANIA', nombre: 'Director' },
    { codigo: 'SECRETARIO_COMPANIA', nombre: 'Secretario' },
    { codigo: 'CAPITAN_COMPANIA', nombre: 'Capitán' },
  ]);

  await upsertCatalogo('catalogoGrupoSanguineo', [
    { codigo: 'A+', nombre: 'A+' },
    { codigo: 'A-', nombre: 'A-' },
    { codigo: 'B+', nombre: 'B+' },
    { codigo: 'B-', nombre: 'B-' },
    { codigo: 'AB+', nombre: 'AB+' },
    { codigo: 'AB-', nombre: 'AB-' },
    { codigo: 'O+', nombre: 'O+' },
    { codigo: 'O-', nombre: 'O-' },
    { codigo: 'DESCONOCIDO', nombre: 'Desconocido' },
  ]);

  await upsertCatalogo('catalogoEstadoParte', [
    { codigo: 'BORRADOR', nombre: 'Borrador' },
    { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    { codigo: 'COMPLETADO', nombre: 'Completado' },
    { codigo: 'ANULADO', nombre: 'Anulado' },
  ]);

  await upsertCatalogo('catalogoClaveEmergencia', [
    { codigo: '10-0', nombre: '10-0 Incendio estructural' },
    { codigo: '10-1', nombre: '10-1 Incendio vehículo' },
    { codigo: '10-3', nombre: '10-3 Rescate' },
  ]);

  await upsertCatalogo('catalogoTriage', [
    { codigo: 'VERDE', nombre: 'Verde' },
    { codigo: 'AMARILLO', nombre: 'Amarillo' },
    { codigo: 'ROJO', nombre: 'Rojo' },
    { codigo: 'NEGRO', nombre: 'Negro' },
  ]);

  await upsertCatalogo('catalogoBolso', [
    { codigo: 'TRAUMA_PRINCIPAL', nombre: 'Bolso trauma principal' },
    { codigo: 'TRAUMA_SECUNDARIO', nombre: 'Bolso trauma secundario' },
  ]);

  await upsertCatalogo('rolUsuario', [
    { codigo: 'ADMIN', nombre: 'Administrador' },
    { codigo: 'CAPITAN', nombre: 'Capitán' },
    { codigo: 'TENIENTE', nombre: 'Teniente' },
    { codigo: 'VOLUNTARIOS', nombre: 'Voluntarios' },
  ]);

  // Bolsos por carro (1 bolso principal por unidad)
  const tipoBolso = await prisma.catalogoBolso.findFirst({ where: { codigo: 'TRAUMA_PRINCIPAL' } });
  const carros = await prisma.carro.findMany({ where: { nomenclatura: { in: ['B-1', 'BX-1', 'R-1'] } } });
  if (tipoBolso) {
    for (const carro of carros) {
      const existe = await prisma.bolsoTrauma.findFirst({ where: { carroId: carro.id, activo: 1 } });
      if (!existe) {
        await prisma.bolsoTrauma.create({
          data: {
            id: randomUUID(),
            tipoId: tipoBolso.id,
            carroId: carro.id,
            nombreIdentificador: `Bolso 1 · ${carro.nomenclatura}`,
            activo: 1,
          },
        });
        console.log(`  bolso creado para ${carro.nomenclatura}`);
      }
    }
  }

  console.log('Catálogos listos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
