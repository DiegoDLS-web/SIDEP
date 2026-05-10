import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Tipos de emergencia: edición solo ADMIN y CAPITÁN. */
export const catalogoEmergenciasGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const r = auth.usuarioActual?.rol?.trim().toUpperCase();
  if (r === 'ADMIN' || r === 'CAPITAN') {
    return true;
  }
  return router.createUrlTree(['/']);
};
