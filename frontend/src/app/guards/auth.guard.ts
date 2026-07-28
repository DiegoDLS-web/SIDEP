import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Solo usuarios con sesión válida (cookie httpOnly); fuerza cambio de password provisional si aplica. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.cargarSesion().pipe(
    map((u) => {
      if (!u) {
        return router.createUrlTree(['/login']);
      }
      if (u.activo === false) {
        auth.cerrarSesionPorAccesoBloqueado('Tu acceso a SIDEP está restringido.');
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
