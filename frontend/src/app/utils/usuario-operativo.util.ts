/** Campos mínimos para decidir si un usuario aparece en guardias, partes o checklist. */
export type UsuarioOperativoInput = {
  rol?: string | null;
  nombre?: string | null;
  activo?: boolean;
  estadoVoluntario?: string | null;
};

/** Voluntarios elegibles en guardias, partes, checklist y planilla (activos, sin ADMIN). */
export function esUsuarioOperativo(u: UsuarioOperativoInput): boolean {
  if (u.activo === false) return false;
  const rol = (u.rol ?? '').trim().toUpperCase();
  if (rol === 'ADMIN') return false;
  const nom = (u.nombre ?? '').trim().toLowerCase();
  if (nom.includes('admin de pruebas') || nom.includes('admin pruebas')) return false;
  const ev = (u.estadoVoluntario ?? '').trim().toUpperCase();
  if (ev === 'INACTIVO') return false;
  return true;
}

export function filtrarUsuariosOperativos<T extends UsuarioOperativoInput>(usuarios: T[]): T[] {
  return (usuarios ?? []).filter(esUsuarioOperativo);
}
