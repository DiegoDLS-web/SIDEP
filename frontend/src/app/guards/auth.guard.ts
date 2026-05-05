import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Solo usuarios con sesión válida; fuerza cambio de password provisional si aplica. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAutenticado()) {
    return router.createUrlTree(['/login']);
  }
  return auth.cargarSesion().pipe(
    map((u) => {
      if (!u) {
        return router.createUrlTree(['/login']);
      }
      const enCambio = state.url.includes('cambiar-password-inicial');
      if (u.requiereCambioPassword === true && !enCambio) {
        return router.createUrlTree(['/cambiar-password-inicial']);
      }
      if (!u.requiereCambioPassword && enCambio) {
        return router.createUrlTree(['/']);
      }
      return true;
    }),
  );
};
