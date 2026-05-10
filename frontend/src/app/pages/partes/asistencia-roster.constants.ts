/**
 * Catálogo de asistencia (estilo sistema anterior: columnas con casillas).
 * Completar nombres reales en MIEMBROS HONORARIOS, VOLUNTARIOS HONORARIOS y VOLUNTARIOS ACTIVOS según la compañía.
 */

import type { AsistenciaContextoKey } from '../../models/parte.dto';

export interface AsistenciaItemDef {
  id: string;
  /** Texto junto a la casilla: cargo, o nombre, o "Cargo (nombre)" */
  label: string;
}

export interface AsistenciaSeccionDef {
  titulo: string;
  items: AsistenciaItemDef[];
}

/** Una columna visual (p. ej. izquierda / centro / derecha). */
export interface AsistenciaColumnaDef {
  secciones: AsistenciaSeccionDef[];
}

export const ASISTENCIA_LAYOUT: AsistenciaColumnaDef[] = [
  {
    secciones: [
      {
        titulo: 'Oficialidad (compañía)',
        items: [
          { id: 'ofi-dir', label: 'Director (N. Ponce R.)' },
          { id: 'ofi-sec', label: 'Secretario (L. Rodriguez B.)' },
          { id: 'ofi-prosec', label: 'Pro Secretario (M. Salazar V.)' },
          { id: 'ofi-tes', label: 'Tesorero (T. Leyton M.)' },
          { id: 'ofi-cap', label: 'Capitán (N. Ponce R.)' },
          { id: 'ofi-t1', label: 'Teniente Primero (V. Venegas Z.)' },
          { id: 'ofi-t2', label: 'Teniente Segundo (L. Ríos G.)' },
          { id: 'ofi-t3', label: 'Teniente Tercero (C. Neira V.)' },
          { id: 'ofi-t4', label: 'Teniente Cuarto (C. Aroca O.)' },
          { id: 'ofi-ayu', label: 'Ayudante Compañía (R. Medina A.)' },
          { id: 'ofi-proayu', label: 'Pro Ayudante (I. Pinares E.)' },
        ],
      },
      {
        titulo: 'Miembros honorarios de la institución',
        items: [
          { id: 'hon-inst-1', label: 'Reynaldo Arturo Muñoz Astudillo' },
          { id: 'hon-inst-2', label: 'Humberto Enrique López Larenas' },
        ],
      },
      {
        titulo: 'Directorio y comandancia (oficiales generales)',
        items: [
          { id: 'dir-vice', label: 'Vicesuperintendente (L. Valenzuela J.)' },
          { id: 'dir-segen', label: 'Secretario General (N. Gutierrez C.)' },
          { id: 'dir-tesgen', label: 'Tesorero General (H. López L.)' },
          { id: 'dir-2do', label: 'Segundo Comandante (F. López F.)' },
        ],
      },
      {
        titulo: 'Rama de cadetes y postulantes "Manuel Medina Sánchez"',
        items: [
          { id: 'cad-1', label: 'Pablo Morales Morales' },
          { id: 'cad-2', label: 'Sebastian Gallegos Zambrano' },
          { id: 'cad-3', label: 'Benjamín Henríquez Yañez' },
          { id: 'cad-4', label: 'Alison Erices Burdiles' },
          { id: 'cad-5', label: 'Catalina Mora Gutiérrez' },
          { id: 'cad-6', label: 'Nicolás Hidalgo Carrera' },
        ],
      },
    ],
  },
  {
    secciones: [
      {
        titulo: 'Voluntarios honorarios',
        items: [
          { id: 'vh-01', label: 'Eduardo Enrique Pezo Espinoza' },
          { id: 'vh-02', label: 'Hector Mauricio González Duran' },
          { id: 'vh-03', label: 'Luis Alberto Valenzuela Jara' },
          { id: 'vh-04', label: 'Freddy Mauricio Pezo Mardones' },
          { id: 'vh-05', label: 'Luis Alberto Núñez De La Fuente' },
          { id: 'vh-06', label: 'Omar Dionisio Ramos Valenzuela' },
          { id: 'vh-07', label: 'Jhonathan Josaphat Núñez Pacheco' },
          { id: 'vh-08', label: 'Francisco Eduardo Bravo Duran' },
          { id: 'vh-09', label: 'Claudio Marcelo Venegas Martinez' },
          { id: 'vh-10', label: 'Carlos Andrés Urrutia Fernandez' },
          { id: 'vh-11', label: 'Nelson Antonio Gutierrez Colipi' },
          { id: 'vh-12', label: 'Francisco Enrique López Flores' },
          { id: 'vh-13', label: 'Felipe Andrés López Flores' },
          { id: 'vh-14', label: 'Juan José Salazar Erices' },
          { id: 'vh-15', label: 'Ihan Marcel Cleveland Figueroa' },
          { id: 'vh-16', label: 'Luis Manuel Molina Castro' },
          { id: 'vh-17', label: 'Bernardo Javier Valenzuela Palma' },
          { id: 'vh-18', label: 'Jonathan Patricio Mora Bustamante' },
        ],
      },
    ],
  },
  {
    secciones: [
      {
        titulo: 'Voluntarios activos',
        items: [
          { id: 'va-01', label: 'Mauricio Alexander Seguel Montecinos' },
          { id: 'va-02', label: 'Patricio Alfredo Madariaga Faundez' },
          { id: 'va-03', label: 'Felipe Andrés Villagra Rojas' },
          { id: 'va-04', label: 'Sergio Ariel Contreras Gutierrez' },
          { id: 'va-05', label: 'Francisco Ignacio Catalán Parra' },
          { id: 'va-06', label: 'Juan Carlos Yañez Vallejos' },
          { id: 'va-07', label: 'Hans Albert Nuñez Salinas' },
          { id: 'va-08', label: 'Paula Tamara Morales Guzman' },
          { id: 'va-09', label: 'Diego Ignacio Pezo Mosquera' },
          { id: 'va-10', label: 'Jasmín Elena Silva Escalona' },
          { id: 'va-11', label: 'Lukas Sebastián González González' },
          { id: 'va-12', label: 'Mariano Alexis Ruiz Hernandez' },
          { id: 'va-13', label: 'Ricardo Sebastián González Mora' },
          { id: 'va-14', label: 'Diego Salas Parra' },
          { id: 'va-15', label: 'Alondra Lisoleth Reyes Pino' },
          { id: 'va-16', label: 'Fernanda Camila Gallardo Gallardo' },
          { id: 'va-17', label: 'Pamela Thalía Oñate Vergara' },
          { id: 'va-18', label: 'Rodrigo Ivan Fernandez Burdiles' },
          { id: 'va-19', label: 'Christine Rafaela Rios Guzman' },
          { id: 'va-20', label: 'Débora Yinett Baeza Neira' },
          { id: 'va-21', label: 'Javiera Elizabeth Quezada Rios' },
          { id: 'va-22', label: 'Daniel Alexander Unda Gonzalez' },
          { id: 'va-23', label: 'Carlos Elias Gutierrez Urbina' },
          { id: 'va-24', label: 'Oscar Rolan Arevalo' },
          { id: 'va-25', label: 'Javiera Garay Rios' },
          { id: 'va-26', label: 'Belen Heck Pineda' },
        ],
      },
      {
        titulo: 'Voluntarios canjes',
        items: [
          { id: 'vc-01', label: 'Felipe Ignacio Chamorro Ramírez (CB Penco) (302)' },
          { id: 'vc-02', label: 'Pablo Rodriguez Areyuna (CB La Serena) (303)' },
          { id: 'vc-03', label: 'Michelle Andrea Herminia Sanhueza Gutiérrez (CB Penco) (301)' },
        ],
      },
    ],
  },
];

function buildLabelMap(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const col of ASISTENCIA_LAYOUT) {
    for (const sec of col.secciones) {
      for (const it of sec.items) {
        m[it.id] = it.label;
      }
    }
  }
  return m;
}

export const ASISTENCIA_ITEM_LABELS = buildLabelMap();

export const ASISTENCIA_IDS_TODOS = Object.keys(ASISTENCIA_ITEM_LABELS);

/** Voluntarios honorarios (`vh-*`) y activos (`va-*`) para total de asistencia. */
export function esVoluntarioAsistenciaId(id: string): boolean {
  return id.startsWith('vh-') || id.startsWith('va-');
}

export const RADIOS_PARTE_OPCIONES: { id: string; label: string }[] = [
  { id: 'C1-1', label: 'C1-1' },
  { id: 'C2-2', label: 'C2-2' },
  { id: 'C3-3', label: 'C3-3' },
];

/** Pestañas del padrón: mismo listado, distinto motivo de asistencia. */
export const ASISTENCIA_CONTEXTO_OPCIONES: ReadonlyArray<{
  key: AsistenciaContextoKey;
  label: string;
}> = [
  { key: 'emergencia', label: 'Emergencia' },
  { key: 'curso', label: 'Curso' },
  { key: 'cuartel', label: 'Cuartel' },
  { key: 'comision', label: 'Comisión de servicio' },
  { key: 'comandancia', label: 'Actividad de comandancia' },
];
