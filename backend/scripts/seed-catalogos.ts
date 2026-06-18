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
    { codigo: 'TESORERO_COMPANIA', nombre: 'Tesorero' },
    { codigo: 'PRO_SECRETARIO_COMPANIA', nombre: 'Pro Secretario' },
    { codigo: 'CAPITAN_COMPANIA', nombre: 'Capitán' },
    { codigo: 'TENIENTE_PRIMERO', nombre: 'Teniente primero' },
    { codigo: 'TENIENTE_SEGUNDO', nombre: 'Teniente segundo' },
    { codigo: 'TENIENTE_TERCERO', nombre: 'Teniente tercero' },
    { codigo: 'TENIENTE_CUARTO', nombre: 'Teniente cuarto' },
    { codigo: 'AYUDANTE_COMPANIA', nombre: 'Ayudante compañía' },
    { codigo: 'PRO_AYUDANTE', nombre: 'Pro Ayudante' },
    { codigo: 'SUPERINTENDENTE', nombre: 'Superintendente' },
    { codigo: 'VICE_SUPERINTENDENTE', nombre: 'Vicesuperintendente' },
    { codigo: 'SECRETARIO_GENERAL', nombre: 'Secretario general' },
    { codigo: 'TESORERO_GENERAL', nombre: 'Tesorero general' },
    { codigo: 'PRIMER_COMANDANTE', nombre: 'Primer comandante' },
    { codigo: 'SEGUNDO_COMANDANTE', nombre: 'Segundo comandante' },
    { codigo: 'INSPECTOR_COMANDANCIA_1', nombre: 'Inspector de bienestar y salud' },
    { codigo: 'INSPECTOR_COMANDANCIA_2', nombre: 'Inspector de capacitaciones' },
    { codigo: 'INSPECTOR_MATERIAL_MAYOR', nombre: 'Inspector de material mayor' },
    { codigo: 'AYUDANTE_COMANDANTE', nombre: 'Ayudante de comandante' },
    { codigo: 'INSPECTOR_COMUNICACIONES', nombre: 'Inspector de comunicaciones' },
    { codigo: 'SEGUNDO_AYUDANTE', nombre: 'Segundo ayudante' },
    { codigo: 'OFICIAL_MAQUINAS', nombre: 'Oficial de máquinas' },
    { codigo: 'INTENDENTE_CUARTEL', nombre: 'Intendente de cuartel' },
    { codigo: 'INTENDENTE', nombre: 'Intendente' },
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
    { codigo: '10-0-1', nombre: '10-0-1 Incendio en vivienda' },
    { codigo: '10-0-2', nombre: '10-0-2 Incendio estructural con público' },
    { codigo: '10-1-1', nombre: '10-1-1 Incendio de vehículo' },
    { codigo: '10-1-2', nombre: '10-1-2 Incendio de vehículo pesado' },
    { codigo: '10-2-1', nombre: '10-2-1 Pastizales y matorrales' },
    { codigo: '10-2-2', nombre: '10-2-2 Incendio forestal' },
    { codigo: '10-3-1', nombre: '10-3-1 Rescate de persona' },
    { codigo: '10-4-1', nombre: '10-4-1 Rescate vehicular' },
    { codigo: '10-4-2', nombre: '10-4-2 Rescate vehicular pesado' },
    { codigo: '10-5', nombre: '10-5 Materiales peligrosos' },
    { codigo: '10-6', nombre: '10-6 Emanación de gases' },
    { codigo: '10-7', nombre: '10-7 Accidente eléctrico' },
    { codigo: '10-8', nombre: '10-8 No clasificado' },
    { codigo: '10-9', nombre: '10-9 Otros servicios' },
    { codigo: '10-10', nombre: '10-10 Escombros' },
    { codigo: '10-11', nombre: '10-11 Apoyo aeródromo' },
    { codigo: '10-12', nombre: '10-12 Apoyo otros cuerpos' },
    { codigo: '10-13', nombre: '10-13 Atentados terroristas' },
    { codigo: '10-14', nombre: '10-14 Accidentes aéreos' },
    { codigo: '10-15', nombre: '10-15 Simulacro' },
    { codigo: '10-16', nombre: '10-16 Derrumbe' },
    { codigo: '10-17', nombre: '10-17 Inundación o anegamiento' },
    { codigo: '10-18', nombre: '10-18 Emergencia marítima' },
    { codigo: '10-0', nombre: '10-0 Incendio estructural (legado)' },
    { codigo: '10-1', nombre: '10-1 Incendio vehículo (legado)' },
    { codigo: '10-3', nombre: '10-3 Rescate (legado)' },
    { codigo: 'ACUARTELAMIENTO', nombre: 'Acuartelamiento' },
    { codigo: 'REUNION_COMPANIA', nombre: 'Reunión de compañía' },
    { codigo: 'ASAMBLEA_GENERAL', nombre: 'Asamblea general' },
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
