"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    const hashDefault = await bcryptjs_1.default.hash('123456', 10);
    const rolesBase = ['CAPITAN', 'TENIENTE', 'VOLUNTARIOS', 'ADMIN'];
    for (const nombre of rolesBase) {
        await prisma_1.prisma.rolUsuario.upsert({
            where: { nombre },
            update: { activo: true },
            create: { nombre, activo: true },
        });
    }
    await prisma_1.prisma.rolUsuario.updateMany({
        where: { nombre: { notIn: rolesBase } },
        data: { activo: false },
    });
    const carrosBase = [
        {
            nomenclatura: 'B-1',
            patente: 'BBSJ-01',
            estadoOperativo: true,
            nombre: 'Carro Bomba',
            tipo: 'Bomba',
            marca: 'Mercedes-Benz',
            anioFabricacion: 2018,
            capacidadAgua: '5000 L',
            kilometraje: 82450,
            ultimoMantenimiento: new Date('2026-02-15T12:00:00.000Z'),
            proximoMantenimiento: new Date('2026-05-15T12:00:00.000Z'),
            conductorAsignado: 'Pedro Sánchez',
            motor: 'OM 906 LA - 6 cilindros',
            transmision: 'Automática 6 velocidades',
            combustible: 'Diésel',
            presionBomba: '10 bar',
            capacidadTanqueCombustible: '200 L',
        },
        {
            nomenclatura: 'BX-1',
            patente: 'BXSJ-01',
            estadoOperativo: true,
            nombre: 'Carro Multipropósito',
            tipo: 'Multipropósito',
            marca: 'Iveco',
            anioFabricacion: 2020,
            capacidadAgua: '4000 L',
            kilometraje: 45200,
            ultimoMantenimiento: new Date('2026-02-20T12:00:00.000Z'),
            proximoMantenimiento: new Date('2026-05-20T12:00:00.000Z'),
            conductorAsignado: 'Luis Fernández',
            motor: 'Cursor 9 - 6 cilindros',
            transmision: 'Manual 12 velocidades',
            combustible: 'Diésel',
            presionBomba: '8 bar',
            capacidadTanqueCombustible: '180 L',
        },
        {
            nomenclatura: 'R-1',
            patente: 'RESJ-01',
            estadoOperativo: false,
            nombre: 'Carro de Rescate',
            tipo: 'Rescate',
            marca: 'Scania',
            anioFabricacion: 2019,
            capacidadAgua: '2000 L',
            kilometraje: 67890,
            ultimoMantenimiento: new Date('2026-03-25T12:00:00.000Z'),
            proximoMantenimiento: new Date('2026-04-25T12:00:00.000Z'),
            conductorAsignado: 'Juan Rojas',
            motor: 'DC13 - 6 cilindros',
            transmision: 'Automática Opticruise',
            combustible: 'Diésel',
            presionBomba: '12 bar',
            capacidadTanqueCombustible: '220 L',
        },
    ];
    for (const carro of carrosBase) {
        await prisma_1.prisma.carro.upsert({
            where: { nomenclatura: carro.nomenclatura },
            update: carro,
            create: carro,
        });
    }
    const usuariosBase = [
        { rut: '11.111.111-1', nombre: 'Capitán Carlos Pérez', rol: 'CAPITAN' },
        { rut: '22.222.222-2', nombre: 'Teniente María González', rol: 'TENIENTE' },
        { rut: '33.333.333-3', nombre: 'Juan Rojas', rol: 'VOLUNTARIOS' },
        { rut: '99.999.999-9', nombre: 'Administrador SIDEP', rol: 'ADMIN' },
    ];
    for (let i = 0; i < usuariosBase.length; i += 1) {
        const u = usuariosBase[i];
        await prisma_1.prisma.usuario.upsert({
            where: { rut: u.rut },
            update: {
                nombre: u.nombre,
                rol: u.rol,
                email: `base${i + 1}@bomberos.cl`,
                telefono: `+56 9 7000 ${String(1000 + i)}`,
                activo: true,
                password: hashDefault,
            },
            create: {
                rut: u.rut,
                nombre: u.nombre,
                rol: u.rol,
                email: `base${i + 1}@bomberos.cl`,
                telefono: `+56 9 7000 ${String(1000 + i)}`,
                activo: true,
                password: hashDefault,
            },
        });
    }
    for (let i = 1; i <= 26; i += 1) {
        const rut = `77.${String(100000 + i).slice(0, 3)}.${String(200 + i).padStart(3, '0')}-${(i % 9) + 1}`;
        await prisma_1.prisma.usuario.upsert({
            where: { rut },
            update: {
                nombre: `Voluntario Demo ${i}`,
                rol: i % 10 === 0 ? 'TENIENTE' : 'VOLUNTARIOS',
                email: `voluntario${i}@bomberos.cl`,
                telefono: `+56 9 6000 ${String(1000 + i)}`,
                activo: true,
                password: hashDefault,
            },
            create: {
                rut,
                nombre: `Voluntario Demo ${i}`,
                rol: i % 10 === 0 ? 'TENIENTE' : 'VOLUNTARIOS',
                email: `voluntario${i}@bomberos.cl`,
                telefono: `+56 9 6000 ${String(1000 + i)}`,
                activo: true,
                password: hashDefault,
            },
        });
    }
    const carrosAll = await prisma_1.prisma.carro.findMany({
        where: { nomenclatura: { in: ['B-1', 'BX-1', 'R-1'] } },
        orderBy: { nomenclatura: 'asc' },
    });
    const usuariosAll = await prisma_1.prisma.usuario.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
    if (carrosAll.length === 0 || usuariosAll.length === 0)
        return;
    for (const carro of carrosAll) {
        for (let i = 0; i < 10; i += 1) {
            const marca = `DEMO-MANT-${carro.nomenclatura}-${String(i + 1).padStart(2, '0')}`;
            const fechaMant = new Date(Date.UTC(2025, i % 12, 5 + i));
            const ya = await prisma_1.prisma.carroRegistroHistorial.findFirst({
                where: {
                    carroId: carro.id,
                    descripcionUltimoMantenimiento: { contains: marca },
                },
            });
            if (ya)
                continue;
            await prisma_1.prisma.carroRegistroHistorial.create({
                data: {
                    carroId: carro.id,
                    ultimoMantenimiento: fechaMant,
                    proximoMantenimiento: new Date(fechaMant.getTime() + 90 * 24 * 60 * 60 * 1000),
                    proximaRevisionTecnica: new Date(fechaMant.getTime() + 120 * 24 * 60 * 60 * 1000),
                    ultimaRevisionBombaAgua: new Date(fechaMant.getTime() + 30 * 24 * 60 * 60 * 1000),
                    descripcionUltimoMantenimiento: `${marca} · mantención preventiva`,
                    ultimoInspector: `Inspector Mant ${i + 1}`,
                    fechaUltimaInspeccion: fechaMant,
                    ultimoConductor: `Conductor ${i + 1}`,
                },
            });
        }
    }
    const claves = ['10-0-1', '10-1-1', '10-2-1', '10-3-1', '10-4-1', '10-4-2'];
    for (let i = 0; i < 90; i += 1) {
        const anioParte = i < 30 ? 2026 : i < 60 ? 2025 : 2024;
        const correlativo = `${anioParte}-${String((i % 30) + 1).padStart(3, '0')}`;
        const existe = await prisma_1.prisma.parteEmergencia.findUnique({ where: { correlativo } });
        if (existe)
            continue;
        const carro = carrosAll[i % carrosAll.length];
        const obac = usuariosAll[i % usuariosAll.length];
        await prisma_1.prisma.parteEmergencia.create({
            data: {
                correlativo,
                claveEmergencia: claves[i % claves.length],
                direccion: `Dirección Demo ${i + 1}, Santa Juana`,
                fecha: new Date(Date.UTC(anioParte, (i * 3) % 12, (i % 27) + 1, 8 + (i % 10), (i * 7) % 60, 0)),
                estado: i % 4 === 0 ? 'PENDIENTE' : 'COMPLETADO',
                obacId: obac.id,
                unidades: {
                    create: [
                        {
                            carroId: carro.id,
                            horaSalida: `${String(8 + (i % 4)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`,
                            horaLlegada: `${String(9 + (i % 4)).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}`,
                            kmSalida: 10000 + i * 80,
                            kmLlegada: 10040 + i * 80,
                        },
                    ],
                },
            },
        });
    }
    for (let i = 0; i < 10; i += 1) {
        const carro = carrosAll[i % carrosAll.length];
        const cuartelero = usuariosAll[i % usuariosAll.length];
        const marca = `DEMO-UNIDAD-${String(i + 1).padStart(2, '0')}`;
        const ya = await prisma_1.prisma.checklistCarro.findFirst({
            where: { carroId: carro.id, tipo: 'UNIDAD', observaciones: { contains: marca } },
        });
        if (ya)
            continue;
        await prisma_1.prisma.checklistCarro.create({
            data: {
                carroId: carro.id,
                cuarteleroId: cuartelero.id,
                tipo: 'UNIDAD',
                inspector: `Inspector Unidad ${i + 1}`,
                grupoGuardia: `Guardia ${(i % 3) + 1}`,
                firmaOficial: cuartelero.nombre,
                observaciones: `${marca} · checklist unidad`,
                totalItems: 40,
                itemsOk: 36 + (i % 5),
                detalle: {
                    ubicaciones: [
                        {
                            nombre: 'Cabina',
                            materiales: [{ nombre: 'Equipo demo', cantidadRequerida: 4, cantidadActual: 4, estado: true }],
                        },
                    ],
                },
            },
        });
    }
    for (let i = 0; i < 90; i += 1) {
        const carro = carrosAll[i % carrosAll.length];
        const cuartelero = usuariosAll[i % usuariosAll.length];
        const marca = `DEMO-TRAUMA-${String(i + 1).padStart(3, '0')}`;
        const ya = await prisma_1.prisma.checklistCarro.findFirst({
            where: { carroId: carro.id, tipo: 'TRAUMA', observaciones: { contains: marca } },
        });
        if (ya)
            continue;
        await prisma_1.prisma.checklistCarro.create({
            data: {
                carroId: carro.id,
                cuarteleroId: cuartelero.id,
                tipo: 'TRAUMA',
                inspector: `Inspector Trauma ${i + 1}`,
                grupoGuardia: `Guardia ${(i % 4) + 1}`,
                firmaOficial: cuartelero.nombre,
                observaciones: `${marca} · bolso trauma ${i < 30 ? '2026' : i < 60 ? '2025' : '2024'}`,
                totalItems: 18,
                itemsOk: 14 + (i % 5),
                detalle: {
                    bolsos: [
                        {
                            numero: (i % 3) + 1,
                            ubicaciones: [
                                {
                                    nombre: 'Compartimiento frontal',
                                    materiales: [
                                        { nombre: 'Gasas', cantidadMinima: 8, cantidadOptima: 12, cantidadActual: 6 + (i % 7) },
                                        { nombre: 'Vendas', cantidadMinima: 4, cantidadOptima: 8, cantidadActual: 4 + (i % 5) },
                                    ],
                                },
                            ],
                        },
                    ],
                    borrador: i % 9 === 0,
                },
            },
        });
    }
    await prisma_1.prisma.$executeRaw `
    INSERT INTO "ConfiguracionSistema" (clave, valor, "updatedAt")
    VALUES (
      'SISTEMA_GENERAL',
      ${JSON.stringify({
        compania: { nombreCompania: '1ª Compañía Santa Juana', nombreBomba: 'Ignacio Enrique López Varela' },
    })}::jsonb,
      now()
    )
    ON CONFLICT (clave) DO NOTHING
  `;
    console.log('Seed listo: 3 carros base, 30 usuarios, partes 2024/2025/2026, trauma 2024/2025/2026, 10 checklist unidad y 10 mantenimientos por carro.');
}
main()
    .catch((e) => {
    console.error(e);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map