/** Valores API ↔ etiquetas en español (oficialidad / directorio / inspectores). */
export const ETIQUETAS_CARGO_OFICIALIDAD: Record<string, string> = {
  DIRECTOR_COMPANIA: 'Director',
  SECRETARIO_COMPANIA: 'Secretario',
  TESORERO_COMPANIA: 'Tesorero',
  PRO_SECRETARIO_COMPANIA: 'Pro Secretario',
  CAPITAN_COMPANIA: 'Capitán',
  TENIENTE_PRIMERO: 'Teniente primero',
  TENIENTE_SEGUNDO: 'Teniente segundo',
  TENIENTE_TERCERO: 'Teniente tercero',
  TENIENTE_CUARTO: 'Teniente cuarto',
  AYUDANTE_COMPANIA: 'Ayudante compañía',
  PRO_AYUDANTE: 'Pro Ayudante',
  VICE_SUPERINTENDENTE: 'Vicesuperintendente',
  SECRETARIO_GENERAL: 'Secretario general',
  TESORERO_GENERAL: 'Tesorero general',
  SEGUNDO_COMANDANTE: 'Segundo comandante',
  INSPECTOR_COMANDANCIA_1: 'Inspector 1',
  INSPECTOR_COMANDANCIA_2: 'Inspector 2',
};

export const CARGOS_OFICIALIDAD_ORDEN = [
  'DIRECTOR_COMPANIA',
  'SECRETARIO_COMPANIA',
  'TESORERO_COMPANIA',
  'PRO_SECRETARIO_COMPANIA',
  'CAPITAN_COMPANIA',
  'TENIENTE_PRIMERO',
  'TENIENTE_SEGUNDO',
  'TENIENTE_TERCERO',
  'TENIENTE_CUARTO',
  'AYUDANTE_COMPANIA',
  'PRO_AYUDANTE',
  'VICE_SUPERINTENDENTE',
  'SECRETARIO_GENERAL',
  'TESORERO_GENERAL',
  'SEGUNDO_COMANDANTE',
  'INSPECTOR_COMANDANCIA_1',
  'INSPECTOR_COMANDANCIA_2',
] as const;

export const ETIQUETAS_TIPO_VOLUNTARIO: Record<string, string> = {
  ACTIVO: 'Activo',
  HONORARIO: 'Honorario',
  CUARTELERO: 'Cuartelero',
  CANJE: 'Canje',
  CONFEDERADO: 'Confederado',
  INSIGNE: 'Insigne',
};

export const TIPOS_VOLUNTARIO_ORDEN = [
  'ACTIVO',
  'HONORARIO',
  'CUARTELERO',
  'CANJE',
  'CONFEDERADO',
  'INSIGNE',
] as const;

export const GRUPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'DESCONOCIDO'] as const;
