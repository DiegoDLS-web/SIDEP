import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Rutas solo para rol ADMIN (p. ej. configuraciones). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rol = auth.usuarioActual?.rol?.toUpperCase();
  if (rol === 'ADMIN') {
    return true;
  }
  return router.createUrlTree(['/']);
};
