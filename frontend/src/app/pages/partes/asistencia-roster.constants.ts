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
          { id: 'ofi-dir', label: 'Director' },
          { id: 'ofi-sec', label: 'Secretario' },
          { id: 'ofi-tes', label: 'Tesorero' },
          { id: 'ofi-prosec', label: 'Pro Secretario' },
          { id: 'ofi-cap', label: 'Capitán' },
          { id: 'ofi-t1', label: 'Teniente primero' },
          { id: 'ofi-t2', label: 'Teniente segundo' },
          { id: 'ofi-t3', label: 'Teniente tercero' },
          { id: 'ofi-t4', label: 'Teniente cuarto' },
          { id: 'ofi-ayu', label: 'Ayudante compañía' },
          { id: 'ofi-proayu', label: 'Pro Ayudante' },
        ],
      },
      {
        titulo: 'Miembros honorarios de la institución',
        items: Array.from({ length: 12 }, (_, i) => ({
          id: `hon-inst-${i + 1}`,
          label: `Miembro honorario ${i + 1}`,
        })),
      },
      {
        titulo: 'Directorio y comandancia (oficiales generales)',
        items: [
          { id: 'dir-vice', label: 'Vicesuperintendente' },
          { id: 'dir-segen', label: 'Secretario general' },
          { id: 'dir-tesgen', label: 'Tesorero general' },
          { id: 'dir-2do', label: 'Segundo comandante' },
        ],
      },
      {
        titulo: 'Inspectores de comandancia',
        items: Array.from({ length: 6 }, (_, i) => ({
          id: `insp-com-${i + 1}`,
          label: `Inspector ${i + 1}`,
        })),
      },
      {
        titulo: 'Rama de cadetes',
        items: Array.from({ length: 8 }, (_, i) => ({
          id: `cad-${i + 1}`,
          label: `Cadete ${i + 1}`,
        })),
      },
    ],
  },
  {
    secciones: [
      {
        titulo: 'Voluntarios honorarios',
        items: Array.from({ length: 32 }, (_, i) => ({
          id: `vh-${String(i + 1).padStart(2, '0')}`,
          label: `Voluntario honorario ${i + 1}`,
        })),
      },
    ],
  },
  {
    secciones: [
      {
        titulo: 'Voluntarios activos',
        items: Array.from({ length: 32 }, (_, i) => ({
          id: `va-${String(i + 1).padStart(2, '0')}`,
          label: `Voluntario activo ${i + 1}`,
        })),
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
