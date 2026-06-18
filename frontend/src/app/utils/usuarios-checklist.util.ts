import type { UsuarioListaDto } from '../models/usuario.dto';

/** Voluntarios elegibles como inspector u OBAC en checklists (sin administradores). */
export function esVoluntarioElegibleChecklist(u: UsuarioListaDto): boolean {
  const rol = (u.rol ?? '').trim().toUpperCase();
  if (rol === 'ADMIN') return false;
  const nom = (u.nombre ?? '').trim().toLowerCase();
  if (nom.includes('admin de pruebas') || nom.includes('admin pruebas')) return false;
  return u.activo !== false;
}

export function filtrarUsuariosChecklist(usuarios: UsuarioListaDto[]): UsuarioListaDto[] {
  return (usuarios ?? []).filter(esVoluntarioElegibleChecklist);
}
