import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Login / recuperar password: si ya hay sesión, manda al inicio. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAutenticado()) {
    return true;
  }
  return router.createUrlTree(['/']);
};
