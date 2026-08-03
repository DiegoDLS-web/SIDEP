import type { Prisma } from '@prisma/client';

const ROLES_EXCLUIDOS = ['ADMIN'];

/** Condición Prisma: voluntarios activos operativos (sin administradores ni inactivos). */
export function whereUsuarioOperativo(): Prisma.UsuarioWhereInput {
  return {
    activo: 1,
    rol: { codigo: { notIn: ROLES_EXCLUIDOS } },
    OR: [
      { estadoVoluntarioId: null },
      { estadoVoluntario: { codigo: { notIn: ['INACTIVO'] } } },
    ],
  };
}

export function esRolAdmin(codigoRol: string | null | undefined): boolean {
  const r = (codigoRol ?? '').trim().toUpperCase();
  return r === 'ADMIN';
}

export function esNombreAdminPrueba(nombre: string | null | undefined): boolean {
  const nom = (nombre ?? '').trim().toLowerCase();
  return nom.includes('admin de pruebas') || nom.includes('admin pruebas');
}

/** Filtro en memoria para DTOs ya cargados. */
export function esUsuarioOperativo(input: {
  activo?: boolean | number | null;
  rol?: string | null;
  rolCodigo?: string | null;
  nombre?: string | null;
  estadoVoluntario?: string | null;
}): boolean {
  const activo = input.activo === true || input.activo === 1;
  if (!activo) return false;
  const rol = (input.rolCodigo ?? input.rol ?? '').trim().toUpperCase();
  if (esRolAdmin(rol)) return false;
  if (esNombreAdminPrueba(input.nombre)) return false;
  const ev = (input.estadoVoluntario ?? '').trim().toUpperCase();
  if (ev === 'INACTIVO') return false;
  return true;
}
