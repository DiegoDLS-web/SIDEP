import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

function pick<T>(arr: T[], i: number): T {
  return arr[Math.abs(i) % arr.length]!;
}

function isoHora(base: Date, hh: number, mm: number): Date {
  const d = new Date(base);
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

async function main() {
  const hashDefault = await bcrypt.hash('123456', 10);
  const rolesBase = ['CAPITAN', 'TENIENTE', 'VOLUNTARIOS', 'ADMIN'];

  for (const nombre of rolesBase) {
    await prisma.rolUsuario.upsert({
      where: { nombre },
      update: { activo: true },
      create: { nombre, activo: true },
    });
  }
  await prisma.rolUsuario.updateMany({
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
  ] as const;

  for (const carro of carrosBase) {
    await prisma.carro.upsert({
      where: { nomenclatura: carro.nomenclatura },
      update: carro,
      create: carro,
    });
  }

  const usuariosBase = [{ rut: '99.999.999-9', nombre: 'Administrador SIDEP', rol: 'ADMIN' }];
  for (let i = 0; i < usuariosBase.length; i += 1) {
    const u = usuariosBase[i]!;
    await prisma.usuario.upsert({
      where: { rut: u.rut },
      update: {
        nombre: u.nombre,
        rol: u.rol,
        email: null,
        telefono: `+56 9 7000 ${String(1000 + i)}`,
        activo: true,
        password: hashDefault,
      },
      create: {
        rut: u.rut,
        nombre: u.nombre,
        rol: u.rol,
        email: null,
        telefono: `+56 9 7000 ${String(1000 + i)}`,
        activo: true,
        password: hashDefault,
      },
    });
  }

  const nominaCompania: Array<{ nombre: string; rol: string }> = [
    { nombre: 'Nicolás Ponce Ramírez', rol: 'CAPITAN' },
    { nombre: 'Luciano Rodriguez Burdiles', rol: 'VOLUNTARIOS' },
    { nombre: 'Martin Salazar Villalobos', rol: 'VOLUNTARIOS' },
    { nombre: 'Tomás Leyton Miranda', rol: 'VOLUNTARIOS' },
    { nombre: 'Victor Venegas Zambrano', rol: 'TENIENTE' },
    { nombre: 'Leonardo Ríos Guzmán', rol: 'TENIENTE' },
    { nombre: 'Carlos Neira Valenzuela', rol: 'TENIENTE' },
    { nombre: 'Claudio Aroca Oñate', rol: 'TENIENTE' },
    { nombre: 'Renato Medina Araneda', rol: 'VOLUNTARIOS' },
    { nombre: 'Ignacio Pinares Escobar', rol: 'VOLUNTARIOS' },
    { nombre: 'Luis Valenzuela Jara', rol: 'VOLUNTARIOS' },
    { nombre: 'Nicolás Gutierrez Cid', rol: 'VOLUNTARIOS' },
    { nombre: 'Francisco López Flores', rol: 'VOLUNTARIOS' },
    { nombre: 'Eduardo Pezo Espinoza', rol: 'VOLUNTARIOS' },
    { nombre: 'Hector González Duran', rol: 'VOLUNTARIOS' },
    { nombre: 'Freddy Pezo Mardones', rol: 'VOLUNTARIOS' },
    { nombre: 'Luis Núñez De La Fuente', rol: 'VOLUNTARIOS' },
    { nombre: 'Omar Ramos Valenzuela', rol: 'VOLUNTARIOS' },
    { nombre: 'Jhonathan Núñez Pacheco', rol: 'VOLUNTARIOS' },
    { nombre: 'Francisco Bravo Duran', rol: 'VOLUNTARIOS' },
    { nombre: 'Claudio Venegas Martinez', rol: 'VOLUNTARIOS' },
    { nombre: 'Carlos Urrutia Fernandez', rol: 'VOLUNTARIOS' },
    { nombre: 'Nelson Gutierrez Colipi', rol: 'VOLUNTARIOS' },
    { nombre: 'Felipe López Flores', rol: 'VOLUNTARIOS' },
    { nombre: 'Juan José Salazar Erices', rol: 'VOLUNTARIOS' },
    { nombre: 'Ihan Cleveland Figueroa', rol: 'VOLUNTARIOS' },
    { nombre: 'Luis Molina Castro', rol: 'VOLUNTARIOS' },
    { nombre: 'Bernardo Valenzuela Palma', rol: 'VOLUNTARIOS' },
    { nombre: 'Jonathan Mora Bustamante', rol: 'VOLUNTARIOS' },
    { nombre: 'Mauricio Alexander Seguel Montecinos', rol: 'VOLUNTARIOS' },
    { nombre: 'Patricio Alfredo Madariaga Faundez', rol: 'VOLUNTARIOS' },
    { nombre: 'Felipe Andrés Villagra Rojas', rol: 'VOLUNTARIOS' },
    { nombre: 'Sergio Ariel Contreras Gutierrez', rol: 'VOLUNTARIOS' },
    { nombre: 'Francisco Ignacio Catalán Parra', rol: 'VOLUNTARIOS' },
    { nombre: 'Juan Carlos Yañez Vallejos', rol: 'VOLUNTARIOS' },
    { nombre: 'Hans Albert Nuñez Salinas', rol: 'VOLUNTARIOS' },
    { nombre: 'Paula Tamara Morales Guzman', rol: 'VOLUNTARIOS' },
    { nombre: 'Diego Ignacio Pezo Mosquera', rol: 'VOLUNTARIOS' },
    { nombre: 'Jasmín Elena Silva Escalona', rol: 'VOLUNTARIOS' },
    { nombre: 'Lukas Sebastián González González', rol: 'VOLUNTARIOS' },
    { nombre: 'Mariano Alexis Ruiz Hernandez', rol: 'VOLUNTARIOS' },
    { nombre: 'Ricardo Sebastián González Mora', rol: 'VOLUNTARIOS' },
    { nombre: 'Diego Salas Parra', rol: 'VOLUNTARIOS' },
    { nombre: 'Alondra Lisoleth Reyes Pino', rol: 'VOLUNTARIOS' },
    { nombre: 'Fernanda Camila Gallardo Gallardo', rol: 'VOLUNTARIOS' },
    { nombre: 'Pamela Thalía Oñate Vergara', rol: 'VOLUNTARIOS' },
    { nombre: 'Rodrigo Ivan Fernandez Burdiles', rol: 'VOLUNTARIOS' },
    { nombre: 'Christine Rafaela Rios Guzman', rol: 'VOLUNTARIOS' },
    { nombre: 'Débora Yinett Baeza Neira', rol: 'VOLUNTARIOS' },
    { nombre: 'Javiera Elizabeth Quezada Rios', rol: 'VOLUNTARIOS' },
    { nombre: 'Daniel Alexander Unda Gonzalez', rol: 'VOLUNTARIOS' },
    { nombre: 'Carlos Elias Gutierrez Urbina', rol: 'VOLUNTARIOS' },
    { nombre: 'Oscar Rolan Arevalo', rol: 'VOLUNTARIOS' },
    { nombre: 'Javiera Garay Rios', rol: 'VOLUNTARIOS' },
    { nombre: 'Belen Heck Pineda', rol: 'VOLUNTARIOS' },
    { nombre: 'Felipe Ignacio Chamorro Ramírez', rol: 'VOLUNTARIOS' },
    { nombre: 'Pablo Rodriguez Areyuna', rol: 'VOLUNTARIOS' },
    { nombre: 'Michelle Andrea Sanhueza Gutiérrez', rol: 'VOLUNTARIOS' },
    { nombre: 'Pablo Morales Morales', rol: 'VOLUNTARIOS' },
    { nombre: 'Sebastian Gallegos Zambrano', rol: 'VOLUNTARIOS' },
    { nombre: 'Benjamín Henríquez Yañez', rol: 'VOLUNTARIOS' },
    { nombre: 'Alison Erices Burdiles', rol: 'VOLUNTARIOS' },
    { nombre: 'Catalina Mora Gutiérrez', rol: 'VOLUNTARIOS' },
    { nombre: 'Nicolás Hidalgo Carrera', rol: 'VOLUNTARIOS' },
  ];

  const honorarios = new Set<string>([
    'Eduardo Pezo Espinoza',
    'Hector González Duran',
    'Freddy Pezo Mardones',
    'Luis Núñez De La Fuente',
    'Omar Ramos Valenzuela',
    'Jhonathan Núñez Pacheco',
    'Francisco Bravo Duran',
    'Claudio Venegas Martinez',
    'Carlos Urrutia Fernandez',
    'Nelson Gutierrez Colipi',
    'Francisco López Flores',
    'Felipe López Flores',
    'Juan José Salazar Erices',
    'Ihan Cleveland Figueroa',
    'Luis Molina Castro',
    'Bernardo Valenzuela Palma',
    'Jonathan Mora Bustamante',
  ]);
  const canjes = new Set<string>([
    'Felipe Ignacio Chamorro Ramírez',
    'Pablo Rodriguez Areyuna',
    'Michelle Andrea Sanhueza Gutiérrez',
  ]);
  const cadetes = new Set<string>([
    'Pablo Morales Morales',
    'Sebastian Gallegos Zambrano',
    'Benjamín Henríquez Yañez',
    'Alison Erices Burdiles',
    'Catalina Mora Gutiérrez',
    'Nicolás Hidalgo Carrera',
  ]);
  const insignes = new Set<string>([...cadetes]);
  const cargosPorNombre: Record<string, string> = {
    'Nicolás Ponce Ramírez': 'CAPITAN_COMPANIA',
    'Luciano Rodriguez Burdiles': 'SECRETARIO_COMPANIA',
    'Martin Salazar Villalobos': 'PRO_SECRETARIO_COMPANIA',
    'Tomás Leyton Miranda': 'TESORERO_COMPANIA',
    'Victor Venegas Zambrano': 'TENIENTE_PRIMERO',
    'Leonardo Ríos Guzmán': 'TENIENTE_SEGUNDO',
    'Carlos Neira Valenzuela': 'TENIENTE_TERCERO',
    'Claudio Aroca Oñate': 'TENIENTE_CUARTO',
    'Renato Medina Araneda': 'AYUDANTE_COMPANIA',
    'Ignacio Pinares Escobar': 'PRO_AYUDANTE',
    'Luis Valenzuela Jara': 'VICE_SUPERINTENDENTE',
    'Nicolás Gutierrez Cid': 'SECRETARIO_GENERAL',
    'Francisco López Flores': 'SEGUNDO_COMANDANTE',
  };

  /** Retratos en `frontend/src/assets/perfiles/` (sincronizar con `node scripts/sync-fotos-nomina.mjs`). */
  const fotoPerfilPorNombre: Partial<Record<string, string>> = {
    'Nicolás Ponce Ramírez': '/assets/perfiles/nicolas-ponce-ramirez.png',
    'Luciano Rodriguez Burdiles': '/assets/perfiles/luciano-rodriguez-burdiles.png',
    'Martin Salazar Villalobos': '/assets/perfiles/martin-salazar-villalobos.png',
    'Tomás Leyton Miranda': '/assets/perfiles/tomas-leyton-miranda.png',
    'Victor Venegas Zambrano': '/assets/perfiles/victor-venegas-zambrano.png',
    'Leonardo Ríos Guzmán': '/assets/perfiles/leonardo-patricio-rios-guzman.png',
    'Carlos Neira Valenzuela': '/assets/perfiles/carlos-neira-valenzuela.png',
    'Claudio Aroca Oñate': '/assets/perfiles/claudio-aroca-onate.png',
    'Renato Medina Araneda': '/assets/perfiles/renato-medina-araneda.png',
    'Ignacio Pinares Escobar': '/assets/perfiles/ignacio-pinares-escobar.png',
    'Luis Valenzuela Jara': '/assets/perfiles/luis-alberto-valenzuela-jara.png',
    'Francisco López Flores': '/assets/perfiles/francisco-enrique-lopez-flores.png',
    'Eduardo Pezo Espinoza': '/assets/perfiles/eduardo-pezo-espinoza.png',
    'Hector González Duran': '/assets/perfiles/hector-mauricio-gonzalez-duran.png',
    'Omar Ramos Valenzuela': '/assets/perfiles/omar-dionisio-ramos-valenzuela.png',
    'Francisco Bravo Duran': '/assets/perfiles/francisco-eduardo-bravo-duran.png',
    'Claudio Venegas Martinez': '/assets/perfiles/claudio-marcelo-venegas-martinez.png',
    'Carlos Urrutia Fernandez': '/assets/perfiles/carlos-andres-urrutia-fernandez.png',
    'Nelson Gutierrez Colipi': '/assets/perfiles/nelson-gutierrez-colipi.png',
    'Felipe López Flores': '/assets/perfiles/felipe-andres-lopez-flores.png',
    'Juan José Salazar Erices': '/assets/perfiles/juan-jose-salazar-erices.png',
    'Ihan Cleveland Figueroa': '/assets/perfiles/ihan-cleveland-figueroa.png',
    'Luis Molina Castro': '/assets/perfiles/luis-molina-castro.png',
    'Bernardo Valenzuela Palma': '/assets/perfiles/bernardo-valenzuela-palma.png',
    'Jonathan Mora Bustamante': '/assets/perfiles/jonathan-patricio-mora-bustamante.png',
    'Mauricio Alexander Seguel Montecinos': '/assets/perfiles/mauricio-seguel-montecinos.png',
    'Patricio Alfredo Madariaga Faundez': '/assets/perfiles/patricio-madariaga-faundez.png',
    'Felipe Andrés Villagra Rojas': '/assets/perfiles/felipe-andres-villagra-rojas.png',
    'Sergio Ariel Contreras Gutierrez': '/assets/perfiles/sergio-ariel-contreras-gutierrez.png',
    'Francisco Ignacio Catalán Parra': '/assets/perfiles/francisco-catalan-parra.png',
    'Juan Carlos Yañez Vallejos': '/assets/perfiles/juan-carlos-yanez-vallejos.png',
    'Paula Tamara Morales Guzman': '/assets/perfiles/paula-tamara-morales-guzman.png',
    'Jasmín Elena Silva Escalona': '/assets/perfiles/jasmin-elena-silva-escalona.png',
    'Mariano Alexis Ruiz Hernandez': '/assets/perfiles/mariano-ruiz-hernandez.png',
    'Ricardo Sebastián González Mora': '/assets/perfiles/ricardo-gonzalez-mora.png',
    'Diego Salas Parra': '/assets/perfiles/diego-salas-parra.png',
    'Alondra Lisoleth Reyes Pino': '/assets/perfiles/alondra-reyes-pino.png',
    'Fernanda Camila Gallardo Gallardo': '/assets/perfiles/fernanda-gallardo-gallardo.png',
    'Pamela Thalía Oñate Vergara': '/assets/perfiles/pamela-onate-vergara.png',
    'Rodrigo Ivan Fernandez Burdiles': '/assets/perfiles/rodrigo-fernandez-burdiles.png',
    'Christine Rafaela Rios Guzman': '/assets/perfiles/christine-rafaela-rios-guzman.png',
    'Débora Yinett Baeza Neira': '/assets/perfiles/debora-yinett-baeza-neira.png',
    'Javiera Elizabeth Quezada Rios': '/assets/perfiles/javiera-quezada-rios.png',
    'Daniel Alexander Unda Gonzalez': '/assets/perfiles/daniel-alexander-gonzalez-unda.png',
    'Carlos Elias Gutierrez Urbina': '/assets/perfiles/carlos-gutierrez-urbina.png',
    'Oscar Rolan Arevalo': '/assets/perfiles/oscar-rolan-arevalo.png',
    'Javiera Garay Rios': '/assets/perfiles/javiera-garay-rios.png',
    'Belen Heck Pineda': '/assets/perfiles/belen-heck-pineda.png',
  };

  const nombreYaRegistrado = new Set<string>();
  for (let i = 0; i < nominaCompania.length; i += 1) {
    const n = nominaCompania[i]!;
    const claveNombre = n.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (nombreYaRegistrado.has(claveNombre)) continue;
    nombreYaRegistrado.add(claveNombre);
    const rut = `55.${String(100000 + i).slice(0, 3)}.${String(300 + i).padStart(3, '0')}-${((i + 3) % 9) + 1}`;
    const tipoVoluntario = honorarios.has(n.nombre)
          ? 'HONORARIO'
          : canjes.has(n.nombre)
            ? 'CANJE'
            : insignes.has(n.nombre)
              ? 'INSIGNE'
              : 'VOLUNTARIO';
    const cargoOficialidad = cargosPorNombre[n.nombre] ?? 'VOLUNTARIO';
    const fotoPerfilSeed = fotoPerfilPorNombre[n.nombre];
    await prisma.usuario.upsert({
      where: { rut },
      update: {
        nombre: n.nombre,
        rol: n.rol,
        tipoVoluntario,
        cargoOficialidad,
        compania: '1ª Compañía Santa Juana',
        estadoVoluntario: 'VIGENTE',
        email: null,
        telefono: `+56 9 6100 ${String(1000 + i)}`,
        activo: true,
        password: hashDefault,
        ...(fotoPerfilSeed ? { fotoPerfil: fotoPerfilSeed } : {}),
      },
      create: {
        rut,
        nombre: n.nombre,
        rol: n.rol,
        tipoVoluntario,
        cargoOficialidad,
        compania: '1ª Compañía Santa Juana',
        estadoVoluntario: 'VIGENTE',
        email: null,
        telefono: `+56 9 6100 ${String(1000 + i)}`,
        activo: true,
        password: hashDefault,
        fotoPerfil: fotoPerfilSeed ?? null,
      },
    });
  }

  const nombresPermitidos = new Set<string>([
    'Administrador SIDEP',
    ...nominaCompania.map((x) => x.nombre),
  ]);
  await prisma.usuario.updateMany({
    where: {
      nombre: { notIn: Array.from(nombresPermitidos) },
      rol: { not: 'ADMIN' },
    },
    data: { activo: false, estadoVoluntario: 'INACTIVO' },
  });

  await prisma.usuario.updateMany({
    where: {
      OR: [
        { nombre: { startsWith: 'Voluntario Demo' } },
        { nombre: 'Capitán Carlos Pérez' },
        { nombre: 'Teniente María González' },
        { nombre: 'Juan Rojas' },
      ],
    },
    data: { activo: false },
  });

  await prisma.usuario.updateMany({
    where: {
      rol: { not: 'ADMIN' },
      OR: [
        { tipoVoluntario: null },
        { tipoVoluntario: '' },
        { tipoVoluntario: { in: ['ACTIVO', 'OFICIAL', 'CADETE', 'ASPIRANTE', 'CUARTELERO', 'CONFEDERADO'] } },
      ],
    },
    data: { tipoVoluntario: 'VOLUNTARIO' },
  });

  const nombresConCargoReal = new Set(Object.keys(cargosPorNombre));
  await prisma.usuario.updateMany({
    where: {
      cargoOficialidad: 'TENIENTE_CUARTO',
      nombre: { notIn: Array.from(nombresConCargoReal) },
    },
    data: { cargoOficialidad: 'VOLUNTARIO' },
  });

  const carrosAll = await prisma.carro.findMany({
    where: { nomenclatura: { in: ['B-1', 'BX-1', 'R-1'] } },
    orderBy: { nomenclatura: 'asc' },
  });
  const usuariosAll = await prisma.usuario.findMany({ where: { activo: true }, orderBy: { id: 'asc' } });
  if (carrosAll.length === 0 || usuariosAll.length === 0) return;

  for (const carro of carrosAll) {
    for (let i = 0; i < 10; i += 1) {
      const marca = `DEMO-MANT-${carro.nomenclatura}-${String(i + 1).padStart(2, '0')}`;
      const fechaMant = new Date(Date.UTC(2025, i % 12, 5 + i));
      const ya = await prisma.carroRegistroHistorial.findFirst({
        where: {
          carroId: carro.id,
          descripcionUltimoMantenimiento: { contains: marca },
        },
      });
      if (ya) continue;
      await prisma.carroRegistroHistorial.create({
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
    const existe = await prisma.parteEmergencia.findUnique({ where: { correlativo } });
    if (existe) continue;
    const carro = carrosAll[i % carrosAll.length]!;
    const obac = usuariosAll[i % usuariosAll.length]!;
    await prisma.parteEmergencia.create({
      data: {
        correlativo,
        claveEmergencia: claves[i % claves.length]!,
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

  // Partes completos de prueba 2024-2026 con asistencia, citaciones y SAMU.
  const clavesFull = ['10-0', '10-1', '10-2', '10-3', '10-4', '10-4-2', '10-6', '10-7'];
  const direcciones = [
    'O Higgins 245, Santa Juana',
    'Los Canelos 118, Santa Juana',
    'Camino a Chacayal km 3, Santa Juana',
    'Lautaro 77, Santa Juana',
    'San Martín 910, Santa Juana',
  ];
  for (let anio = 2024; anio <= 2026; anio += 1) {
    for (let i = 1; i <= 24; i += 1) {
      const correlativo = `PRB-${anio}-${String(i).padStart(3, '0')}`;
      const existe = await prisma.parteEmergencia.findUnique({ where: { correlativo } });
      const carroA = pick(carrosAll, i);
      const carroB = pick(carrosAll, i + 1);
      const obac = pick(usuariosAll, i + anio);
      const fechaBase = new Date(Date.UTC(anio, (i * 2) % 12, ((i * 3) % 27) + 1));
      const h60 = `${String(8 + (i % 8)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`;
      const h63 = `${String(8 + (i % 8)).padStart(2, '0')}:${String((i * 7 + 4) % 60).padStart(2, '0')}`;
      const h69 = `${String(8 + (i % 8)).padStart(2, '0')}:${String((i * 7 + 18) % 60).padStart(2, '0')}`;
      const h610 = `${String(8 + (i % 8)).padStart(2, '0')}:${String((i * 7 + 32) % 60).padStart(2, '0')}`;
      const idsAsistencia = usuariosAll.slice(0, 12).map((u) => `usr-${u.id}`);
      const asistenciaPorContexto = {
        emergencia: Object.fromEntries(idsAsistencia.slice(0, 5).map((id) => [id, true])),
        curso: Object.fromEntries(idsAsistencia.slice(3, 7).map((id) => [id, true])),
        cuartel: Object.fromEntries(idsAsistencia.slice(6, 10).map((id) => [id, true])),
        comision: Object.fromEntries(idsAsistencia.slice(8, 11).map((id) => [id, true])),
        comandancia: Object.fromEntries(idsAsistencia.slice(1, 4).map((id) => [id, true])),
      };
      if (existe) {
        await prisma.parteEmergencia.update({
          where: { id: existe.id },
          data: {
            claveEmergencia: pick(clavesFull, i),
            direccion: pick(direcciones, i),
            fecha: isoHora(fechaBase, 8 + (i % 8), (i * 7) % 60),
            estado: i % 7 === 0 ? 'PENDIENTE' : 'COMPLETADO',
            obacId: obac.id,
            metadata: {
              descripcion: `Parte de prueba ${correlativo}`,
              trabajoRealizado: 'Control de escena, estabilizacion y traslado preventivo.',
              samu: i % 2 === 0 ? { asistio: true, movil: `SAMU-${100 + i}`, trasladadoA: 'Hospital Regional' } : { asistio: false },
              citaciones: [
                { unidad: carroA.nomenclatura, motivo: 'Refuerzo primera salida', hora: h63 },
                { unidad: carroB.nomenclatura, motivo: 'Apoyo logistica', hora: h69 },
              ],
              asistencia: {
                asistenciaPorContexto,
                asistenciaTotal: String(new Set(Object.values(asistenciaPorContexto).flatMap((x) => Object.keys(x))).size),
                oficial128: `Oficial 12-8 ${pick(usuariosAll, i + 4).nombre}`,
                encargadoDatos: pick(usuariosAll, i + 5).nombre,
                nombreObac: obac.nombre,
                radiosSeleccion: { 'C1-1': true, 'C2-2': i % 2 === 0, 'C3-3': i % 3 === 0 },
                radiosDetalle: { 'C1-1': 'Central y tráfico', 'C2-2': 'Comando', 'C3-3': 'Logística' },
              },
              observaciones: i % 5 === 0 ? 'Se solicita seguimiento de mantencion en unidad principal.' : '',
            },
            unidades: {
              deleteMany: {},
              create: [
                {
                  carroId: carroA.id,
                  horaSalida: h60,
                  horaLlegada: h610,
                  hora6_0: h60,
                  hora6_3: h63,
                  hora6_9: h69,
                  hora6_10: h610,
                  kmSalida: 12000 + anio + i * 35,
                  kmLlegada: 12025 + anio + i * 35,
                },
                {
                  carroId: carroB.id,
                  horaSalida: h63,
                  horaLlegada: h610,
                  hora6_0: h63,
                  hora6_3: h69,
                  hora6_9: h610,
                  hora6_10: h610,
                  kmSalida: 9000 + anio + i * 25,
                  kmLlegada: 9016 + anio + i * 25,
                },
              ],
            },
          },
        });
        continue;
      }
      await prisma.parteEmergencia.create({
        data: {
          correlativo,
          claveEmergencia: pick(clavesFull, i),
          direccion: pick(direcciones, i),
          fecha: isoHora(fechaBase, 8 + (i % 8), (i * 7) % 60),
          estado: i % 7 === 0 ? 'PENDIENTE' : 'COMPLETADO',
          obacId: obac.id,
          metadata: {
            descripcion: `Parte de prueba ${correlativo}`,
            trabajoRealizado: 'Control de escena, estabilizacion y traslado preventivo.',
            samu: i % 2 === 0 ? { asistio: true, movil: `SAMU-${100 + i}`, trasladadoA: 'Hospital Regional' } : { asistio: false },
            citaciones: [
              { unidad: carroA.nomenclatura, motivo: 'Refuerzo primera salida', hora: h63 },
              { unidad: carroB.nomenclatura, motivo: 'Apoyo logistica', hora: h69 },
            ],
            asistencia: {
              asistenciaPorContexto,
              asistenciaTotal: String(new Set(Object.values(asistenciaPorContexto).flatMap((x) => Object.keys(x))).size),
              oficial128: `Oficial 12-8 ${pick(usuariosAll, i + 4).nombre}`,
              encargadoDatos: pick(usuariosAll, i + 5).nombre,
              nombreObac: obac.nombre,
              radiosSeleccion: { 'C1-1': true, 'C2-2': i % 2 === 0, 'C3-3': i % 3 === 0 },
              radiosDetalle: { 'C1-1': 'Central y tráfico', 'C2-2': 'Comando', 'C3-3': 'Logística' },
            },
            observaciones: i % 5 === 0 ? 'Se solicita seguimiento de mantencion en unidad principal.' : '',
          },
          unidades: {
            create: [
              {
                carroId: carroA.id,
                horaSalida: h60,
                horaLlegada: h610,
                hora6_0: h60,
                hora6_3: h63,
                hora6_9: h69,
                hora6_10: h610,
                kmSalida: 12000 + anio + i * 35,
                kmLlegada: 12025 + anio + i * 35,
              },
              {
                carroId: carroB.id,
                horaSalida: h63,
                horaLlegada: h610,
                hora6_0: h63,
                hora6_3: h69,
                hora6_9: h610,
                hora6_10: h610,
                kmSalida: 9000 + anio + i * 25,
                kmLlegada: 9016 + anio + i * 25,
              },
            ],
          },
          pacientes: {
            create: [
              {
                nombre: `Paciente Demo ${anio}-${i}-A`,
                triage: i % 3 === 0 ? 'ROJO' : i % 3 === 1 ? 'AMARILLO' : 'VERDE',
                edad: 18 + (i % 60),
                rut: `19.${String(100000 + i).slice(0, 3)}.${String(200 + i).padStart(3, '0')}-${(i % 9) + 1}`,
              },
            ],
          },
        },
      });
    }
  }

  for (let i = 0; i < 10; i += 1) {
    const carro = carrosAll[i % carrosAll.length]!;
    const cuartelero = usuariosAll[i % usuariosAll.length]!;
    const marca = `DEMO-UNIDAD-${String(i + 1).padStart(2, '0')}`;
    const ya = await prisma.checklistCarro.findFirst({
      where: { carroId: carro.id, tipo: 'UNIDAD', observaciones: { contains: marca } },
    });
    if (ya) continue;
    await prisma.checklistCarro.create({
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

  // Checklists de unidad de prueba en fechas 2024-2026.
  for (let anio = 2024; anio <= 2026; anio += 1) {
    for (let i = 1; i <= 18; i += 1) {
      const carro = pick(carrosAll, i + anio);
      const cuartelero = pick(usuariosAll, i + 2);
      const marca = `SEED-UNIDAD-${anio}-${String(i).padStart(2, '0')}`;
      const ya = await prisma.checklistCarro.findFirst({
        where: { carroId: carro.id, tipo: 'UNIDAD', observaciones: { contains: marca } },
      });
      if (ya) continue;
      const total = 40;
      const ok = Math.max(28, 40 - (i % 10));
      await prisma.checklistCarro.create({
        data: {
          carroId: carro.id,
          cuarteleroId: cuartelero.id,
          tipo: 'UNIDAD',
          fecha: new Date(Date.UTC(anio, i % 12, ((i * 2) % 27) + 1, 9, (i * 5) % 60, 0)),
          inspector: `Inspector Unidad ${anio}-${i}`,
          grupoGuardia: `${(i % 4) + 1}`,
          firmaOficial: `SEED-FIRMA-${anio}-${i}`,
          observaciones: `${marca} · checklist completo con semaforo`,
          totalItems: total,
          itemsOk: ok,
          detalle: {
            borrador: i % 8 === 0,
            ubicaciones: [
              {
                nombre: 'Cabina',
                materiales: [
                  { nombre: 'Botiquin', cantidadRequerida: 2, cantidadActual: i % 2 === 0 ? 2 : 1 },
                  { nombre: 'Linterna', cantidadRequerida: 2, cantidadActual: 2 },
                ],
              },
            ],
          },
        },
      });
    }
  }

  // Checklists ERA de prueba 2024-2026.
  for (let anio = 2024; anio <= 2026; anio += 1) {
    for (let i = 1; i <= 18; i += 1) {
      const carro = pick(carrosAll, i);
      const cuartelero = pick(usuariosAll, i + anio);
      const marca = `SEED-ERA-${anio}-${String(i).padStart(2, '0')}`;
      const ya = await prisma.checklistCarro.findFirst({
        where: { carroId: carro.id, tipo: 'ERA', observaciones: { contains: marca } },
      });
      if (ya) continue;
      const total = 8;
      const ok = i % 5 === 0 ? 6 : 8;
      await prisma.checklistCarro.create({
        data: {
          carroId: carro.id,
          cuarteleroId: cuartelero.id,
          tipo: 'ERA',
          fecha: new Date(Date.UTC(anio, (i * 3) % 12, ((i * 4) % 27) + 1, 11, (i * 3) % 60, 0)),
          inspector: `Inspector ERA ${anio}-${i}`,
          grupoGuardia: `${(i % 4) + 1}`,
          firmaOficial: `SEED-FIRMA-ERA-${anio}-${i}`,
          observaciones: `${marca} · revisión ERA`,
          totalItems: total,
          itemsOk: ok,
          detalle: {
            fechaInspeccion: new Date(Date.UTC(anio, (i * 3) % 12, ((i * 4) % 27) + 1)).toISOString().slice(0, 10),
            equipos: [
              {
                numero: 1,
                marca: 'MSA',
                tipo: 'M7',
                ubicacion: 'Cabina',
                codigoMascara: `M-${anio}-${i}-1`,
                codigoArnes: `A-${anio}-${i}-1`,
                codigoCilindro: `C-${anio}-${i}-1`,
                presion: '0 - 5000',
                estado: ok >= total ? 'Operativo' : 'No Operativo',
                arnesCondicion: ok >= total ? 'Operativo' : 'No Operativo',
              },
            ],
            cilindrosRecambio: [
              {
                numero: 1,
                tipo: 'G1',
                presionAire: '0 - 5000',
                presionMayor2000: 'Si',
                condicionGeneral: 'Operativo',
                codigoCilindro: `RC-${anio}-${i}-1`,
                estado: 'Operativo',
              },
            ],
            borrador: i % 9 === 0,
          },
        },
      });
    }
  }

  for (let i = 0; i < 90; i += 1) {
    const carro = carrosAll[i % carrosAll.length]!;
    const cuartelero = usuariosAll[i % usuariosAll.length]!;
    const marca = `DEMO-TRAUMA-${String(i + 1).padStart(3, '0')}`;
    const ya = await prisma.checklistCarro.findFirst({
      where: { carroId: carro.id, tipo: 'TRAUMA', observaciones: { contains: marca } },
    });
    if (ya) continue;
    await prisma.checklistCarro.create({
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

  // Licencias de prueba 2024-2026.
  const usuariosLic = usuariosAll.slice(0, Math.min(20, usuariosAll.length));
  for (let anio = 2024; anio <= 2026; anio += 1) {
    for (let i = 1; i <= 36; i += 1) {
      const usuario = pick(usuariosLic, i + anio);
      const fechaInicio = new Date(Date.UTC(anio, (i * 2) % 12, ((i * 3) % 24) + 1, 0, 0, 0));
      const fechaTermino = new Date(fechaInicio.getTime() + (2 + (i % 6)) * 24 * 60 * 60 * 1000);
      const marcador = `SEED-LIC-${anio}-${String(i).padStart(3, '0')}`;
      const existeLic = await prisma.licenciaMedica.findFirst({
        where: { usuarioId: usuario.id, motivo: { contains: marcador } },
      });
      if (existeLic) continue;
      const estado = i % 5 === 0 ? 'RECHAZADA' : i % 3 === 0 ? 'PENDIENTE' : 'APROBADA';
      const resuelve = pick(usuariosAll, i + 3);
      await prisma.licenciaMedica.create({
        data: {
          usuarioId: usuario.id,
          fechaInicio,
          fechaTermino,
          motivo: `${marcador} · Licencia por recuperacion / permiso medico`,
          estado,
          observacionResolucion:
            estado === 'RECHAZADA'
              ? 'Falta documentación de respaldo.'
              : estado === 'APROBADA'
                ? 'Aprobada por oficialidad.'
                : null,
          resueltoPorId: estado === 'PENDIENTE' ? null : resuelve.id,
          resueltoEn: estado === 'PENDIENTE' ? null : new Date(fechaInicio.getTime() + 12 * 60 * 60 * 1000),
        },
      });
    }
  }

  await prisma.$executeRaw`
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

  console.log(
    'Seed listo: base completa 2024-2026 con partes (asistencia/citaciones/SAMU), checklist unidad, ERA, trauma, licencias y mantenimientos.',
  );
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
