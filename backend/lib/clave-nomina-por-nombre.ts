/**
 * Claves de nómina (padrón 1ª Cía.). Mantener alineado con `nominaCompania` en `prisma/seed.ts`.
 * Búsqueda insensible a tildes y mayúsculas.
 */
export function normalizarNombreParaClave(n: string): string {
  return n
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Nombres con la misma ortografía que en el seed (`nominaCompania` / alta manual). */
const CLAVE_RAW: Record<string, string> = {
  /* Oficiales generales / mando — padrón */
  'Felipe López Flores': '2',
  'Freddy Pezo Mardones': '6',
  'Luis Valenzuela Jara': '7',
  'Humberto López Larenas': '8',
  'Nelson Gutierrez Colipi': '9',
  /* Inspectores de comandancia */
  'Jhonathan Núñez Pacheco': '15',
  'Juan José Salazar Erices': '19',
  /* Oficiales de compañía */
  'Nicole Ponce Ramírez': '71',
  'Luciano Rodriguez Burdiles': '106',
  'Martin Salazar Villalobos': '106-A',
  'Tomás Leyton Miranda': '107',
  'Nicolás Ponce Ramírez': '41',
  'Victor Venegas Zambrano': '101',
  'Leonardo Ríos Guzmán': '102',
  'Carlos Neira Valenzuela': '103',
  'Claudio Aroca Oñate': '104',
  'Renato Medina Araneda': '105',
  'Ignacio Pinares Escobar': '105-A',
  /* Insigne */
  'Reynaldo Muñoz Astudillo': '110',
  /* Honorarios — claves volunteer list */
  'Eduardo Pezo Espinoza': '114',
  'Omar Ramos Valenzuela': '115',
  'Hector González Duran': '116',
  'Luis Núñez De La Fuente': '118',
  'Francisco Bravo Duran': '122',
  'Claudio Venegas Martinez': '123',
  'Carlos Urrutia Fernandez': '124',
  'Francisco López Flores': '126',
  'Ihan Cleveland Figueroa': '129',
  'Luis Molina Castro': '132',
  'Bernardo Valenzuela Palma': '133',
  'Jonathan Mora Bustamante': '134',
  'Mauricio Alexander Seguel Montecinos': '130',
  'Patricio Alfredo Madariaga Faundez': '131',
  'Felipe Andrés Villagra Rojas': '135',
  'Sergio Ariel Contreras Gutierrez': '136',
  'Francisco Ignacio Catalán Parra': '140',
  'Juan Carlos Yañez Vallejos': '141',
  'Hans Albert Nuñez Salinas': '142',
  'Paula Tamara Morales Guzman': '143',
  'Diego Ignacio Pezo Mosquera': '144',
  'Jasmín Elena Silva Escalona': '145',
  'Lukas Sebastián González González': '147',
  'Mariano Alexis Ruiz Hernandez': '148',
  'Ricardo Sebastián González Mora': '150',
  'Diego Salas Parra': '151',
  'Alondra Lisoleth Reyes Pino': '153',
  'Fernanda Camila Gallardo Gallardo': '154',
  'Rodrigo Ivan Fernandez Burdiles': '158',
  'Christine Rafaela Rios Guzman': '159',
  'Débora Yinett Baeza Neira': '160',
  'Javiera Elizabeth Quezada Rios': '162',
  'Daniel Alexander Unda Gonzalez': '163',
  'Carlos Elias Gutierrez Urbina': '165',
  'Javiera Garay Rios': '169',
  'Belen Heck Pineda': '171',
  'Michelle Andrea Sanhueza Gutiérrez': '301',
  'Felipe Ignacio Chamorro Ramírez': '302',
  'Pablo Rodriguez Areyuna': '303',
  'Pamela Thalía Oñate Vergara': '155',
  'Oscar Rolan Arevalo': '164',
};

const LOOKUP = new Map<string, string>();
for (const [nombre, clave] of Object.entries(CLAVE_RAW)) {
  LOOKUP.set(normalizarNombreParaClave(nombre), clave.trim());
}

export function claveNominaParaNombreCompleto(nombre: string | null | undefined): string | null {
  const k = nombre?.trim();
  if (!k) return null;
  const v = LOOKUP.get(normalizarNombreParaClave(k));
  return v ?? null;
}

export const CLAVE_NOMINA_POR_NOMBRE_SEED = CLAVE_RAW as Readonly<Record<string, string>>;
