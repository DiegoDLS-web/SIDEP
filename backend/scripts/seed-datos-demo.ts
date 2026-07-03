/**
 * Datos de demostración realistas para SIDEP.
 * Genera 100 registros de cada tipo: partes, mantenciones, checklist unidad,
 * checklist ERA, bolso trauma y licencias.
 * Fechas: jun 2025 → hoy. Direcciones solo Santa Juana (Biobío).
 *
 * Uso: npx ts-node -r dotenv/config scripts/seed-datos-demo.ts
 * Opcional: CANTIDAD=50 npx ts-node -r dotenv/config scripts/seed-datos-demo.ts
 */
import { randomUUID } from 'crypto';
import prisma from '../SRC/prisma';
import { crearParteConRelaciones } from '../SRC/modules/operaciones/services/partes.service';
import { crearLicencia, cambiarEstado } from '../SRC/modules/rrhh/services/licencias.service';

const CANTIDAD = Math.min(500, Math.max(1, Number(process.env.CANTIDAD) || 100));
const DEMO_PARTE_PREFIX = 'P-DEMO-';
const DEMO_SEED_TAG = 'SEED-DEMO-v1';
const FIRMA_DEMO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const FECHA_INICIO = '2025-06-01';
const FECHA_FIN = '2026-07-02';
const CARROS_NOM = ['B-1', 'BX-1', 'R-1'] as const;
const GRUPOS = ['A', 'B', 'C'] as const;

const DIRECCIONES_SANTA_JUANA = [
  "Av. O'Higgins 450, Santa Juana",
  'Calle Prat 128, Santa Juana',
  'Los Boldos 890, sector Los Boldos, Santa Juana',
  'Camino a Coronel km 4, Santa Juana',
  'Calle Ercilla 55, Santa Juana',
  'Villa Los Notros pasaje Las Flores 12, Santa Juana',
  'Ruta 160 km 18, Santa Juana',
  'Calle San Martín 302, Santa Juana',
  'Pasaje Los Aromos 45, Santa Juana',
  'Sector El Rosario s/n, Santa Juana',
  'Calle Bulnes 210, Santa Juana',
  'Población Los Boldos calle 3 N°45, Santa Juana',
  'Av. Pedro Aguirre Cerda 780, Santa Juana',
  'Camino El Rosario 1200, Santa Juana',
  'Pasaje El Bosque 18, Santa Juana',
];

const CONTEXTOS_ASISTENCIA = ['emergencia', 'curso', 'cuartel', 'comision', 'comandancia'] as const;

const MOTIVOS_LICENCIA = [
  'Reposo por lumbalgia aguda con indicación traumatológica.',
  'Recuperación postoperatoria artroscopia rodilla derecha.',
  'Influenza tipo B con fiebre persistente mayor a 48 horas.',
  'Esguince grado II tobillo izquierdo tras actividad deportiva.',
  'Control médico por hipertensión arterial descompensada leve.',
  'Licencia por duelo familiar según certificado adjunto.',
  'Reposo por contractura cervical post servicio de guardia.',
  'Tratamiento fisioterapia hombro por tendinitis rotuliana.',
];

const PLANTILLAS_EMERGENCIA = [
  {
    clave: '10-0-1',
    desc: 'Humo en vivienda de dos pisos. Fuego en cocina controlado sin propagación a dormitorios.',
    trabajo: 'Ataque con línea 38 mm, ventilación horizontal y revisión de reingreso.',
    material: 'Línea 38 mm, ABA, pitón, ventilador PPV',
    carros: ['B-1'] as const,
  },
  {
    clave: '10-3-1',
    desc: 'Persona caída en terreno con dolor en extremidad inferior. Movilización dolorosa.',
    trabajo: 'Inmovilización, collar cervical de precaución y traslado a SAMU.',
    material: 'Collar cervical, férula, tablero corto, oxígeno',
    carros: ['BX-1', 'R-1'] as const,
  },
  {
    clave: '10-1-1',
    desc: 'Incendio vehículo menor en vía pública. Fuego en motor extinguido.',
    trabajo: 'Extinción PQS, enfriamiento y entrega a Carabineros.',
    material: 'PQS 20 kg, conos, linternas',
    carros: ['BX-1'] as const,
  },
  {
    clave: '10-2-1',
    desc: 'Pastizal seco con propagación lenta por viento moderado.',
    trabajo: 'Línea de ataque con balde portátil y cortafuego manual.',
    material: 'Balde 20 L, beaters, mochila forestal',
    carros: ['B-1'] as const,
  },
  {
    clave: '10-4-1',
    desc: 'Colisión vehicular en intersección con persona lesionada leve atrapada.',
    trabajo: 'Extricación leve, estabilización vehicular y apoyo SAMU.',
    material: 'Cric, expansor, bolso trauma, triángulos',
    carros: ['R-1', 'BX-1'] as const,
  },
  {
    clave: '10-6',
    desc: 'Emanación de gas en medidor domiciliario. Olor detectado por vecinos.',
    trabajo: 'Ventilación, corte de suministro y entrega a Gasco.',
    material: 'Detector gases, ventilador, conos',
    carros: ['BX-1'] as const,
  },
  {
    clave: '10-7',
    desc: 'Accidente eléctrico en poste con chispa visible. Sin lesionados.',
    trabajo: 'Aseguramiento perimetral y entrega a CGE.',
    material: 'Conos, cinta, linternas',
    carros: ['B-1'] as const,
  },
  {
    clave: '10-8',
    desc: 'Llamado no clasificado: olor a quemado en bodega comercial.',
    trabajo: 'Investigación con TIC, ventilación y retiro sin novedad.',
    material: 'TIC, ventilador, linterna térmica',
    carros: ['BX-1'] as const,
  },
  {
    clave: '10-9',
    desc: 'Apoyo a vecino por filtración de agua en vivienda tras lluvia.',
    trabajo: 'Achique menor y orientación. Sin riesgo estructural.',
    material: 'Achique portátil, conos',
    carros: ['R-1'] as const,
  },
  {
    clave: '10-4-2',
    desc: 'Camión liviano volcado en berma. Conductor fuera del vehículo.',
    trabajo: 'Contención de derrame menor y señalización vial.',
    material: 'Absorbente, conos, iluminación',
    carros: ['B-1', 'R-1'] as const,
  },
];

const NOMBRES_PACIENTES = [
  'María González', 'Pedro Soto Riquelme', 'Camila Aravena', 'José Muñoz',
  'Patricia Herrera', 'Roberto Fuentes', 'Andrea Contreras', 'Miguel Salgado',
];

type UsuarioSeed = {
  rut: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  claveNomina: string | null;
  autorizadoConducir: number;
  rol: string;
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function pickMany<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length > 0) {
    const i = randInt(0, copy.length - 1);
    out.push(copy.splice(i, 1)[0]!);
  }
  return out;
}

function nombrePersona(u: Pick<UsuarioSeed, 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'>): string {
  return [u.nombres, u.apellidoPaterno, u.apellidoMaterno].filter(Boolean).join(' ').trim();
}

function dateAt(isoDate: string, hour: number, minute: number): Date {
  const [y, mo, d] = isoDate.split('-').map(Number);
  return new Date(y!, mo! - 1, d!, hour, minute, 0, 0);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fechasDistribuidas(cantidad: number): string[] {
  const start = new Date(`${FECHA_INICIO}T12:00:00`).getTime();
  const end = new Date(`${FECHA_FIN}T12:00:00`).getTime();
  const out: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const base = start + ((end - start) * i) / Math.max(1, cantidad - 1);
    const jitter = randInt(-2, 2) * 86_400_000;
    const t = Math.min(end, Math.max(start, base + jitter));
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function horaLlamadoAleatoria(): string {
  const hora = pickOne([...Array.from({ length: 24 }, (_, i) => i)]);
  const min = randInt(0, 59);
  return `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function buildHorariosDespacho(horaLlamado: string) {
  const [h, m] = horaLlamado.split(':').map(Number);
  const base = (h ?? 0) * 60 + (m ?? 0);
  const fmt = (mins: number) => {
    const x = ((mins % 1440) + 1440) % 1440;
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  };
  const h60 = base + randInt(2, 5);
  const h63 = h60 + randInt(9, 16);
  const h69 = h63 + randInt(0, 4);
  const h610 = h63 + randInt(55, 115);
  return { hora6_0: fmt(h60), hora6_3: fmt(h63), hora6_9: fmt(h69), hora6_10: fmt(h610) };
}

function payloadChecklistUnidad(inspector: string, grupo: string, seq: number) {
  const materialesBase = [
    { nombre: 'Extintor ABC 6 kg', cantidadRequerida: 1, cantidadActual: 1 },
    { nombre: 'Linterna recargable', cantidadRequerida: 2, cantidadActual: 2 },
    { nombre: 'Conos reflectantes', cantidadRequerida: 4, cantidadActual: 4 },
    { nombre: 'Cuerda semi-estática 30 m', cantidadRequerida: 1, cantidadActual: 1 },
    { nombre: 'Botiquín primeros auxilios', cantidadRequerida: 1, cantidadActual: 1 },
    { nombre: 'Chaleco reflectante', cantidadRequerida: 4, cantidadActual: 4 },
    { nombre: 'Llave de hidrante', cantidadRequerida: 1, cantidadActual: 1 },
    { nombre: 'Manguera 38 mm (rollo)', cantidadRequerida: 2, cantidadActual: 2 },
  ];
  return {
    borrador: false,
    seedTag: DEMO_SEED_TAG,
    seedSeq: seq,
    inspector,
    grupoGuardia: grupo,
    ubicaciones: [
      { nombre: 'Cabina', materiales: materialesBase.slice(0, 4) },
      { nombre: 'Compartimiento trasero', materiales: materialesBase.slice(4) },
    ],
  };
}

function payloadChecklistEra(fechaInspeccion: string, inspector: string, grupo: string, seq: number) {
  const equipos = [
    'Arnés rescate acuático', 'Casco ERA', 'Chaleco salvavidas tipo V',
    'Cuerda flotante', 'Línea de vida', 'Pitón de anclaje',
  ].map((nombre, i) => ({ id: i + 1, nombre, arnesCondicion: 'Operativo', observacion: '' }));
  return {
    borrador: false,
    seedTag: DEMO_SEED_TAG,
    seedSeq: seq,
    fechaInspeccion,
    inspector,
    grupoGuardia: grupo,
    equipos,
    cilindrosRecambio: [
      { id: 1, numero: 'G1', condicionGeneral: 'Operativo', presion: `${190 + randInt(0, 15)} bar` },
      { id: 2, numero: 'G2', condicionGeneral: 'Operativo', presion: `${190 + randInt(0, 15)} bar` },
    ],
    observaciones: `Revisión ERA periódica #${seq}. Sin novedades.`,
  };
}

function payloadBolsoTrauma(bolsoNumero: number, inspector: string, grupo: string, seq: number) {
  const materiales = [
    'Vía aérea orofaríngea', 'Collar cervical rígido', 'Vendaje elástico 10 cm',
    'Apósito hemostático', 'Guantes estériles', 'Mascarilla RCP',
    'Torniquete táctico', 'Sonda Foley', 'Solución salina 500 ml', 'Jeringa 10 ml',
  ].map((nombre) => ({ nombre, cantidadRequerida: 2, cantidadActual: 2 }));
  return {
    borrador: false,
    seedTag: DEMO_SEED_TAG,
    seedSeq: seq,
    bolsoNumero,
    inspector,
    grupoGuardia: grupo,
    observaciones: `Inventario bolso ${bolsoNumero} — revisión #${seq}.`,
    bolsos: [{ numero: bolsoNumero, ubicaciones: [{ nombre: 'Compartimiento principal', materiales }] }],
    totalItems: materiales.length,
    itemsOk: materiales.length,
  };
}

async function resolverPlantillaId(carroId: string, entidadTipo: string): Promise<string> {
  const carro = await prisma.carro.findUnique({ where: { id: carroId }, select: { nomenclatura: true } });
  const nomenclatura = carro?.nomenclatura ?? 'GEN';
  const codigo = entidadTipo === 'ERA' ? `ERA-${nomenclatura}` : `CHK-${nomenclatura}`;
  const existente = await prisma.checklistPlantilla.findFirst({ where: { codigo } });
  if (existente) return existente.id;
  return (
    await prisma.checklistPlantilla.create({
      data: {
        id: randomUUID(),
        codigo,
        nombre: `Plantilla ${codigo}`,
        entidadTipo,
        estructuraJson: JSON.stringify([]),
        version: 1,
        activo: 1,
      },
    })
  ).id;
}

async function insertarChecklist(
  carroId: string,
  revisorRut: string,
  entidadTipo: 'CARRO' | 'ERA' | 'TRAUMA',
  fecha: Date,
  payload: Record<string, unknown>,
) {
  const plantillaId = await resolverPlantillaId(carroId, entidadTipo === 'TRAUMA' ? 'CARRO' : entidadTipo);
  await prisma.checklistEjecucion.create({
    data: {
      id: randomUUID(),
      plantillaId,
      revisorRut,
      fechaRevision: fecha,
      estado: 'COMPLETADO',
      respuestasJson: JSON.stringify(payload),
      entidadTipo,
      entidadId: carroId,
      firmaOficial: FIRMA_DEMO,
      firmaRevisor: FIRMA_DEMO,
    },
  });
}

class KmTracker {
  private readonly kms = new Map<string, number>();

  constructor(carros: Array<{ nomenclatura: string; kilometraje: number | bigint }>, margenInicial: number) {
    for (const c of carros) {
      this.kms.set(c.nomenclatura, Math.max(0, Number(c.kilometraje) - margenInicial));
    }
  }

  registrarDespacho(nomenclatura: string, distanciaKm: number) {
    const salida = this.kms.get(nomenclatura) ?? 0;
    const llegada = salida + distanciaKm;
    this.kms.set(nomenclatura, llegada);
    return { kmSalida: salida, kmLlegada: llegada };
  }

  valor(nomenclatura: string) {
    return this.kms.get(nomenclatura) ?? 0;
  }

  todos() {
    return Object.fromEntries(this.kms.entries());
  }
}

function buildAsistencia(voluntarios: UsuarioSeed[], cantidad: number) {
  const n = randInt(3, Math.min(12, cantidad));
  const elegidos = pickMany(voluntarios, n);
  const asistenciaPorContexto: Record<string, Record<string, boolean>> = {};
  for (const ctx of CONTEXTOS_ASISTENCIA) asistenciaPorContexto[ctx] = {};
  elegidos.forEach((u, idx) => {
    const ctx = CONTEXTOS_ASISTENCIA[idx % CONTEXTOS_ASISTENCIA.length]!;
    asistenciaPorContexto[ctx]![`usr-${u.rut}`] = true;
  });
  return {
    asistencias: elegidos.map((u) => ({ usuarioRut: u.rut })),
    asistenciaPorContexto,
    count: n,
  };
}

function logProgreso(etapa: string, i: number, total: number) {
  if (i === 1 || i === total || i % 10 === 0) {
    console.log(`  ${etapa}: ${i}/${total}`);
  }
}

async function usuariosDisponiblesEnFecha(pool: UsuarioSeed[], fechaIso: string): Promise<UsuarioSeed[]> {
  const fecha = dateAt(fechaIso, 12, 0);
  const activas = await prisma.licenciaMedica.findMany({
    where: {
      fechaInicio: { lte: fecha },
      fechaTermino: { gte: fecha },
      estado: { nombre: { equals: 'Aprobada', mode: 'insensitive' } },
    },
    select: { usuarioRut: true },
  });
  const bloqueados = new Set(activas.map((l) => l.usuarioRut));
  const libres = pool.filter((u) => !bloqueados.has(u.rut));
  return libres.length > 0 ? libres : pool;
}

async function limpiarDemoAnterior() {
  console.log('Limpiando registros demo anteriores…');
  const partesDemo = await prisma.parteEmergencia.findMany({
    where: { correlativo: { startsWith: DEMO_PARTE_PREFIX } },
    select: { id: true },
  });
  const ids = partesDemo.map((p) => p.id);
  if (ids.length > 0) {
    await prisma.asistenciaPersonal.deleteMany({ where: { parteId: { in: ids } } });
    await prisma.unidadEnEmergencia.deleteMany({ where: { parteId: { in: ids } } });
    await prisma.pacienteEmergencia.deleteMany({ where: { parteId: { in: ids } } });
    await prisma.vehiculoCivilEmergencia.deleteMany({ where: { parteId: { in: ids } } });
    await prisma.parteEmergencia.deleteMany({ where: { id: { in: ids } } });
    console.log(`  Eliminados ${ids.length} partes demo.`);
  }

  const checklists = await prisma.checklistEjecucion.findMany({ select: { id: true, respuestasJson: true } });
  const chkIds = checklists.filter((c) => c.respuestasJson.includes(DEMO_SEED_TAG)).map((c) => c.id);
  if (chkIds.length > 0) {
    await prisma.checklistEjecucion.deleteMany({ where: { id: { in: chkIds } } });
    console.log(`  Eliminados ${chkIds.length} checklists demo.`);
  }

  const mant = await prisma.mantenimientoCarro.findMany({ select: { id: true, descripcion: true } });
  const mantIds = mant.filter((m) => (m.descripcion ?? '').includes(DEMO_SEED_TAG)).map((m) => m.id);
  if (mantIds.length > 0) {
    await prisma.mantenimientoCarro.deleteMany({ where: { id: { in: mantIds } } });
    console.log(`  Eliminados ${mantIds.length} mantenimientos demo.`);
  }

  const lic = await prisma.licenciaMedica.findMany({ select: { id: true, motivo: true } });
  const licIds = lic.filter((l) => l.motivo.includes(DEMO_SEED_TAG)).map((l) => l.id);
  if (licIds.length > 0) {
    await prisma.licenciaMedica.deleteMany({ where: { id: { in: licIds } } });
    console.log(`  Eliminadas ${licIds.length} licencias demo.`);
  }
}

async function main() {
  console.log(`=== Seed demo SIDEP: ${CANTIDAD} de cada tipo ===\n`);
  await limpiarDemoAnterior();

  const usuariosRaw = await prisma.usuario.findMany({
    where: { activo: 1 },
    select: {
      rut: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
      claveNomina: true, autorizadoConducir: true, rol: { select: { codigo: true } },
    },
  });

  const usuarios: UsuarioSeed[] = usuariosRaw
    .filter((u) => u.rol.codigo !== 'ADMIN')
    .map((u) => ({
      rut: u.rut,
      nombres: u.nombres,
      apellidoPaterno: u.apellidoPaterno,
      apellidoMaterno: u.apellidoMaterno,
      claveNomina: u.claveNomina,
      autorizadoConducir: u.autorizadoConducir ?? 0,
      rol: u.rol.codigo,
    }));

  const conductores = usuarios.filter((u) => u.autorizadoConducir === 1);
  const obacPool = usuarios.filter((u) => ['CAPITAN', 'TENIENTE', 'VOLUNTARIOS'].includes(u.rol));

  if (conductores.length === 0 || obacPool.length === 0 || usuarios.length < 8) {
    throw new Error('Se necesitan voluntarios activos (conductores y OBAC) en la base de datos.');
  }

  const carros = await prisma.carro.findMany({ orderBy: { nomenclatura: 'asc' } });
  const carroByNom = Object.fromEntries(carros.map((c) => [c.nomenclatura, c]));
  const resolutorRut = obacPool.find((u) => u.rol === 'CAPITAN')?.rut ?? obacPool[0]!.rut;
  const fechas = fechasDistribuidas(CANTIDAD);

  const kmMargen = CANTIDAD * 12;
  const km = new KmTracker(
    carros.map((c) => ({ nomenclatura: c.nomenclatura, kilometraje: Number(c.kilometraje ?? 0) })),
    kmMargen,
  );

  // --- 100 Mantenciones ---
  console.log(`\nMantenimientos (${CANTIDAD}):`);
  for (let i = 0; i < CANTIDAD; i++) {
    const nom = CARROS_NOM[i % CARROS_NOM.length]!;
    const carro = carroByNom[nom];
    if (!carro) continue;
    const fecha = dateAt(fechas[i]!, randInt(9, 17), randInt(0, 59));
    const proxMant = dateAt(addDays(fechas[i]!, randInt(120, 200)), 0, 0);
    const proxRev = dateAt(addDays(fechas[i]!, randInt(150, 250)), 0, 0);
    await prisma.mantenimientoCarro.create({
      data: {
        id: randomUUID(),
        carroId: carro.id,
        fechaRegistro: fecha,
        fechaMantenimiento: fecha,
        fechaProximoMantenimiento: proxMant,
        fechaProximaRevTecnica: proxRev,
        inspectorRut: resolutorRut,
        inspectorNombre: pickOne(obacPool).claveNomina ?? '114',
        descripcion: `Mantención preventiva #${i + 1}. ${DEMO_SEED_TAG}`,
      },
    });
    logProgreso('Mantenciones', i + 1, CANTIDAD);
  }

  // --- 100 Checklist unidad ---
  console.log(`\nChecklist unidad (${CANTIDAD}):`);
  for (let i = 0; i < CANTIDAD; i++) {
    const nom = CARROS_NOM[i % CARROS_NOM.length]!;
    const carro = carroByNom[nom];
    if (!carro) continue;
    const obac = obacPool[i % obacPool.length]!;
    const inspector = obac.claveNomina ?? '114';
    const grupo = GRUPOS[i % GRUPOS.length]!;
    await insertarChecklist(
      carro.id,
      obac.rut,
      'CARRO',
      dateAt(fechas[i]!, randInt(8, 11), randInt(0, 59)),
      payloadChecklistUnidad(inspector, grupo, i + 1),
    );
    logProgreso('Checklist unidad', i + 1, CANTIDAD);
  }

  // --- 100 Checklist ERA ---
  console.log(`\nChecklist ERA (${CANTIDAD}):`);
  for (let i = 0; i < CANTIDAD; i++) {
    const nom = CARROS_NOM[i % CARROS_NOM.length]!;
    const carro = carroByNom[nom];
    if (!carro) continue;
    const obac = obacPool[(i + 1) % obacPool.length]!;
    const inspector = obac.claveNomina ?? '114';
    const grupo = GRUPOS[(i + 1) % GRUPOS.length]!;
    await insertarChecklist(
      carro.id,
      obac.rut,
      'ERA',
      dateAt(fechas[i]!, randInt(14, 18), randInt(0, 59)),
      payloadChecklistEra(fechas[i]!, inspector, grupo, i + 1),
    );
    logProgreso('Checklist ERA', i + 1, CANTIDAD);
  }

  // --- 100 Bolso trauma ---
  console.log(`\nBolso trauma (${CANTIDAD}):`);
  for (let i = 0; i < CANTIDAD; i++) {
    const nom = CARROS_NOM[i % CARROS_NOM.length]!;
    const carro = carroByNom[nom];
    if (!carro) continue;
    const obac = obacPool[(i + 2) % obacPool.length]!;
    const inspector = obac.claveNomina ?? '114';
    const grupo = GRUPOS[(i + 2) % GRUPOS.length]!;
    const bolsoNum = (i % 3) + 1;
    await insertarChecklist(
      carro.id,
      obac.rut,
      'TRAUMA',
      dateAt(fechas[i]!, randInt(10, 16), randInt(0, 59)),
      payloadBolsoTrauma(bolsoNum, inspector, grupo, i + 1),
    );
    logProgreso('Bolso trauma', i + 1, CANTIDAD);
  }

  await seedPartes(CANTIDAD, fechas, usuarios, conductores, obacPool, carroByNom, km);

  console.log(`\nLicencias (${CANTIDAD}):`);
  const estadosLic = ['Aprobada', 'Aprobada', 'Aprobada', 'Pendiente', 'Rechazada'] as const;
  for (let i = 0; i < CANTIDAD; i++) {
    const usuario = usuarios[i % usuarios.length]!;
    const duracion = randInt(5, 18);
    const inicio = fechas[i]!;
    const termino = addDays(inicio, duracion);
    const motivoBase = MOTIVOS_LICENCIA[i % MOTIVOS_LICENCIA.length]!;
    const creada = await crearLicencia(usuario.rut, {
      fechaInicio: inicio,
      fechaTermino: termino,
      motivo: `${motivoBase} ${DEMO_SEED_TAG} #${i + 1}`,
    });
    const estadoFinal = estadosLic[i % estadosLic.length]!;
    if (estadoFinal !== 'Pendiente') {
      await cambiarEstado(
        creada.id,
        resolutorRut,
        estadoFinal,
        estadoFinal === 'Aprobada' ? 'Aprobada para datos demo.' : 'Rechazada en revisión demo.',
      );
    }
    logProgreso('Licencias', i + 1, CANTIDAD);
  }

  for (const carro of carros) {
    const nuevoKm = km.valor(carro.nomenclatura);
    if (nuevoKm > 0) {
      await prisma.carro.update({
        where: { id: carro.id },
        data: { kilometraje: Math.max(Number(carro.kilometraje ?? 0), nuevoKm) },
      });
    }
  }

  console.log('\nKilometraje final:');
  for (const [nom, val] of Object.entries(km.todos())) {
    console.log(`  ${nom}: ${val} km`);
  }

  console.log(`\n✅ Completado: ${CANTIDAD} partes, ${CANTIDAD} mantenciones, ${CANTIDAD} checklist unidad, ${CANTIDAD} ERA, ${CANTIDAD} bolso trauma, ${CANTIDAD} licencias.`);
}

async function seedPartes(
  CANTIDAD: number,
  fechas: string[],
  usuarios: UsuarioSeed[],
  conductores: UsuarioSeed[],
  obacPool: UsuarioSeed[],
  carroByNom: Record<string, { id: string; nomenclatura: string; kilometraje: unknown }>,
  km: KmTracker,
) {
  console.log(`\nPartes (${CANTIDAD}):`);
  for (let i = 0; i < CANTIDAD; i++) {
    const plantilla = PLANTILLAS_EMERGENCIA[i % PLANTILLAS_EMERGENCIA.length]!;
    const fecha = fechas[i]!;
    const horaLlamado = horaLlamadoAleatoria();
    const obacElegibles = await usuariosDisponiblesEnFecha(obacPool, fecha);
    const asistElegibles = await usuariosDisponiblesEnFecha(usuarios, fecha);
    const conductoresLibres = await usuariosDisponiblesEnFecha(conductores, fecha);
    const obac = obacElegibles[i % obacElegibles.length]!;
    const conductoresUsar = conductoresLibres.length > 0 ? conductoresLibres : conductores;
    const asist = buildAsistencia(asistElegibles.length > 0 ? asistElegibles : usuarios, usuarios.length);
    const horariosUnidades: Record<string, Record<string, string>> = {};
    const conductoresPorCarroId: Record<string, string> = {};
    const unidadesPayload: Array<Record<string, unknown>> = [];

    for (const nom of plantilla.carros) {
      const carro = carroByNom[nom];
      if (!carro) continue;
      const conductor = conductoresUsar[(i + randInt(0, conductoresUsar.length - 1)) % conductoresUsar.length]!;
      const distKm = randInt(15, 38);
      const { kmSalida, kmLlegada } = km.registrarDespacho(nom, distKm);
      const hor = buildHorariosDespacho(horaLlamado);
      conductoresPorCarroId[carro.id] = nombrePersona(conductor);
      horariosUnidades[carro.id] = hor;
      unidadesPayload.push({
        carroId: carro.id,
        conductorRut: conductor.rut,
        ...hor,
        kmSalida,
        kmLlegada,
      });
    }

    const triages = ['VERDE', 'AMARILLO', 'ROJO', 'NEGRO'] as const;
    const pacientes =
      plantilla.clave.startsWith('10-3') || plantilla.clave.startsWith('10-4')
        ? [{
            nombre: pickOne(NOMBRES_PACIENTES),
            triage: pickOne(triages),
            rut: `${randInt(10, 25)}.${randInt(100, 999)}.${randInt(100, 999)}-${randInt(0, 9)}`,
          }]
        : [];

    const vehiculos =
      plantilla.clave.startsWith('10-1') || plantilla.clave.startsWith('10-4')
        ? [{
            patente: `${pickOne(['KJ', 'LW', 'RP', 'HS'])}${pickOne(['LP', 'TR', 'XH'])}-${randInt(10, 99)}`,
            marca: pickOne(['Chevrolet', 'Toyota', 'Hyundai', 'Nissan']),
            conductor: pickOne(NOMBRES_PACIENTES),
          }]
        : [];

    const claveNominaObac = obac.claveNomina ?? nombrePersona(obac).split(' ')[0] ?? '114';
    const correlativo = `${DEMO_PARTE_PREFIX}${String(i + 1).padStart(4, '0')}`;
    const [hh, mm] = horaLlamado.split(':').map(Number);

    await crearParteConRelaciones({
      correlativo,
      claveEmergencia: plantilla.clave,
      direccion: DIRECCIONES_SANTA_JUANA[i % DIRECCIONES_SANTA_JUANA.length]!,
      referenciaLugar: 'Comuna de Santa Juana, Región del Biobío',
      obacRut: obac.rut,
      obacId: obac.rut,
      fecha: dateAt(fecha, hh ?? 12, mm ?? 0).toISOString(),
      estado: 'COMPLETADO',
      descripcionEmergencia: plantilla.desc,
      trabajoRealizado: plantilla.trabajo,
      materialUtilizado: plantilla.material,
      observaciones: `Parte demo #${i + 1} ${DEMO_SEED_TAG}. Guardia ${GRUPOS[i % GRUPOS.length]}.`,
      horaDelLlamado: horaLlamado,
      unidades: unidadesPayload,
      pacientes,
      asistencias: asist.asistencias,
      vehiculosAfectados: vehiculos,
      metadata: {
        seedTag: DEMO_SEED_TAG,
        seedSeq: i + 1,
        horaDelLlamado: horaLlamado,
        conductoresPorCarroId,
        unidadesHorarios: horariosUnidades,
        asistencia: {
          asistenciaPorContexto: asist.asistenciaPorContexto,
          encargadoDatos: claveNominaObac,
          oficial128: claveNominaObac,
          nombreObac: claveNominaObac,
          asistenciaTotal: String(asist.count),
        },
      },
      firmaObac: FIRMA_DEMO,
      firmaEncargadoDatos: FIRMA_DEMO,
    });

    logProgreso('Partes', i + 1, CANTIDAD);
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
