/**
 * Inserta los carros base de la 1ª Compañía (idempotente por nomenclatura).
 * Uso: npx ts-node -r dotenv/config scripts/seed-carros.ts
 */
import { randomUUID } from 'crypto';
import prisma from '../SRC/prisma';

const CARROS = [
  {
    nomenclatura: 'B-1',
    nombre: 'Carro Bomba',
    marca: 'Renault',
    patente: 'WC-28-50',
    kilometraje: 46343,
    tipo: 'Bomba',
    capacidadAgua: '5000 litros',
    anioFabricacion: 2004,
  },
  {
    nomenclatura: 'BX-1',
    nombre: 'Carro multipropósito',
    marca: 'Iveco',
    patente: 'JW-RT-93',
    kilometraje: 22874,
    tipo: 'Multipropósito',
    capacidadAgua: '3000 litros',
    anioFabricacion: 2017,
  },
  {
    nomenclatura: 'R-1',
    nombre: 'Carro de rescate',
    marca: 'Man',
    patente: 'RS-VH-37',
    kilometraje: 12325,
    tipo: 'Rescate',
    capacidadAgua: '2000 litros',
    anioFabricacion: 2021,
  },
];

async function main() {
  for (const c of CARROS) {
    const existente = await prisma.carro.findUnique({ where: { nomenclatura: c.nomenclatura } });
    if (existente) {
      await prisma.carro.update({
        where: { nomenclatura: c.nomenclatura },
        data: {
          nombre: c.nombre,
          marca: c.marca,
          patente: c.patente,
          kilometraje: c.kilometraje,
          estadoOperativo: 1,
        },
      });
      console.log(`Actualizado: ${c.nomenclatura}`);
      continue;
    }

    await prisma.carro.create({
      data: {
        id: randomUUID(),
        nomenclatura: c.nomenclatura,
        nombre: c.nombre,
        marca: c.marca,
        patente: c.patente,
        estadoOperativo: 1,
        kilometraje: c.kilometraje,
      },
    });
    console.log(`Creado: ${c.nomenclatura} — ${c.marca} ${c.capacidadAgua}, ${c.anioFabricacion}, patente ${c.patente}`);
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
