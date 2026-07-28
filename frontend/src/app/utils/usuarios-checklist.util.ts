import type { UsuarioListaDto, UsuarioSelectorDto } from '../models/usuario.dto';

/** Voluntarios elegibles como inspector u OBAC en checklists (sin administradores). */
export function esVoluntarioElegibleChecklist(u: Pick<UsuarioListaDto, 'rol' | 'nombre' | 'activo'>): boolean {
  const rol = (u.rol ?? '').trim().toUpperCase();
  if (rol === 'ADMIN') return false;
  const nom = (u.nombre ?? '').trim().toLowerCase();
  if (nom.includes('admin de pruebas') || nom.includes('admin pruebas')) return false;
  return u.activo !== false;
}

export function filtrarUsuariosChecklist<T extends Pick<UsuarioListaDto, 'rol' | 'nombre' | 'activo'>>(
  usuarios: T[],
): T[] {
  return (usuarios ?? []).filter(esVoluntarioElegibleChecklist);
}
