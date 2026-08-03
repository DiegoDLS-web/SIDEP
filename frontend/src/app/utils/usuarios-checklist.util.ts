import { esUsuarioOperativo, type UsuarioOperativoInput } from './usuario-operativo.util';

/** Voluntarios elegibles como inspector u OBAC en checklists (activos, sin ADMIN ni inactivos). */
export function esVoluntarioElegibleChecklist(u: UsuarioOperativoInput): boolean {
  return esUsuarioOperativo(u);
}

export function filtrarUsuariosChecklist<T extends UsuarioOperativoInput>(usuarios: T[]): T[] {
  return (usuarios ?? []).filter(esVoluntarioElegibleChecklist);
}
