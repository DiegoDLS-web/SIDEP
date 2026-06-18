export type AsistenciaContextoKey = 'emergencia' | 'curso' | 'cuartel' | 'comision' | 'comandancia';

export interface AsistenciaItemDef {
  id: string;
  label: string;
}

export interface AsistenciaSeccionDef {
  titulo: string;
  items: AsistenciaItemDef[];
}

export interface AsistenciaColumnaDef {
  secciones: AsistenciaSeccionDef[];
}

export interface AsistenciaContextoOption {
  key: AsistenciaContextoKey;
  label: string;
}

export const ASISTENCIA_CONTEXTO_OPCIONES: AsistenciaContextoOption[] = [
  { key: 'emergencia', label: 'Emergencia' },
  { key: 'curso', label: 'Curso' },
  { key: 'cuartel', label: 'Cuartel' },
  { key: 'comision', label: 'Comisión' },
  { key: 'comandancia', label: 'Comandancia' },
];

export const ASISTENCIA_LAYOUT: AsistenciaColumnaDef[] = [
  {
    secciones: [
      {
        titulo: 'Oficialidad (compañía)',
        items: [
          { id: 'ofi-dir', label: 'Director' },
          { id: 'ofi-sec', label: 'Secretario' },
          { id: 'ofi-cap', label: 'Capitán' },
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

export function resolverEtiquetaAsistenciaId(id: string, nombresPorRut?: Record<string, string>): string {
  const fijo = ASISTENCIA_ITEM_LABELS[id];
  if (fijo) return fijo;
  if (id.startsWith('usr-') && nombresPorRut) {
    const rut = id.slice(4).trim();
    return nombresPorRut[rut] ?? nombresPorRut[id] ?? rut;
  }
  return id;
}

export function esVoluntarioAsistenciaId(id: string): boolean {
  return id.startsWith('vh-') || id.startsWith('va-');
}

export const RADIOS_PARTE_OPCIONES: { id: string; label: string }[] = [
  { id: 'C1-1', label: 'C1-1' },
  { id: 'C2-2', label: 'C2-2' },
]
;