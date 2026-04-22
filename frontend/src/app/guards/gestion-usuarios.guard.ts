import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const ROLES_GESTION_USUARIOS = new Set(['ADMIN']);

/** Alta y edición de voluntarios (solo estos roles pueden asignar rol en backend). */
export const gestionUsuariosGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rol = auth.usuarioActual?.rol?.trim().toUpperCase();
  if (rol && ROLES_GESTION_USUARIOS.has(rol)) {
    return true;
  }
  return router.createUrlTree(['/']);
};
