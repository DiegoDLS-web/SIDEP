import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Misma política que `requireRoles` en `/api/usuarios`: ADMIN, CAPITÁN y TENIENTE. */
const ROLES_GESTION_USUARIOS = new Set(['ADMIN', 'CAPITAN', 'TENIENTE']);

/** Directorio de voluntarios (listado y edición según permisos del backend). */
export const gestionUsuariosGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rol = auth.usuarioActual?.rol?.trim().toUpperCase();
  if (rol && ROLES_GESTION_USUARIOS.has(rol)) {
    return true;
  }
  return router.createUrlTree(['/']);
};
