/** Claves de emergencia y servicios (valor almacenado en `claveEmergencia`). */
export const CLAVES_EMERGENCIA: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos los tipos' },

  // —— Clasificación 10-x (operativas) ——
  { value: '10-0-1', label: '10-0-1 — Llamado incendio en vivienda.' },
  { value: '10-0-2', label: '10-0-2 — Llamado estructural en lugar con afluencia de público.' },
  { value: '10-1-1', label: '10-1-1 — Llamado a incendio de vehículo.' },
  { value: '10-1-2', label: '10-1-2 — Llamado a incendio de vehículo pesado.' },
  { value: '10-2-1', label: '10-2-1 — Llamado de pastizales y/o matorrales.' },
  { value: '10-2-2', label: '10-2-2 — Llamado de incendio forestal.' },
  { value: '10-3-1', label: '10-3-1 — Llamado a rescate de persona.' },
  { value: '10-4-1', label: '10-4-1 — Llamado a rescate vehicular.' },
  { value: '10-4-2', label: '10-4-2 — Llamado a rescate vehicular pesado.' },
  { value: '10-5', label: '10-5 — Llamado por presencia de materiales peligrosos (Haz-Mat).' },
  { value: '10-6', label: '10-6 — Llamado a emanación de gases.' },
  { value: '10-7', label: '10-7 — Llamado a accidente eléctrico.' },
  { value: '10-8', label: '10-8 — Llamado no clasificado.' },
  { value: '10-9', label: '10-9 — Llamado a otros servicios.' },
  { value: '10-10', label: '10-10 — Llamado a escombros.' },
  { value: '10-11', label: '10-11 — Llamado de apoyo a Aeródromo y/o Aeropuertos.' },
  { value: '10-12', label: '10-12 — Llamado de apoyo a otros Cuerpos de Bomberos.' },
  { value: '10-13', label: '10-13 — Llamado a atentados terroristas.' },
  { value: '10-14', label: '10-14 — Llamado a accidentes aéreos.' },
  { value: '10-15', label: '10-15 — Llamado a simulacro.' },
  { value: '10-16', label: '10-16 — Llamado por derrumbe de …' },
  { value: '10-17', label: '10-17 — Llamado por inundación o anegamiento.' },
  { value: '10-18', label: '10-18 — Emergencia Marítimo / Portuaria.' },

  // —— Servicios / administrativos ——
  { value: 'ACUARTELAMIENTO', label: 'Acuartelamiento' },
  { value: 'ACUARTELAMIENTO_PREVENTIVO', label: 'Acuartelamiento Preventivo' },
  { value: 'EJERCICIO_COMPANIA', label: 'Ejercicio de Compañía' },
  { value: 'ELECCIONES_OFICIALES_GENERALES', label: 'Elecciones Oficiales Generales' },
  { value: 'FUNERAL_COMPANIA', label: 'Funeral Compañía' },
  { value: 'FUNERAL_COMANDANCIA', label: 'Funeral Comandancia' },
  { value: 'OTROS_ABONOS', label: 'Otros Abonos' },
  { value: 'REUNION_COMPANIA', label: 'Reunión de Compañía' },
  { value: 'ROMERIA_COMPANIA', label: 'Romería de Compañía' },
  { value: 'ASAMBLEA_GENERAL', label: 'Asamblea General' },
  { value: 'ASAMBLEA_EXTRAORDINARIA', label: 'Asamblea Extraordinaria' },
];

export const CLAVES_NUEVO_PARTE = CLAVES_EMERGENCIA.filter((c) => c.value !== 'todos');

/** Claves que empiezan con `10-…` (emergencias operativas). */
export const CLAVES_OPERATIVAS = CLAVES_NUEVO_PARTE.filter((c) => /^10/.test(c.value));

/** Acuartelamientos, reuniones, asambleas, etc. */
export const CLAVES_COMPANIA_SERVICIOS = CLAVES_NUEVO_PARTE.filter((c) => !/^10/.test(c.value));

/** Valor por defecto en borradores cuando no se eligió tipo (genérico). */
export const CLAVE_BORRADOR_DEFAULT = '10-9';

export function etiquetaClave(clave: string): string {
  const found = CLAVES_EMERGENCIA.find((c) => c.value === clave);
  return found ? found.label : clave;
}
