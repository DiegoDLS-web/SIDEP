import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Login / recuperar password: si hay sesión válida (cookie), manda al inicio. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.cargarSesion().pipe(
    map((usuario) => (usuario ? router.createUrlTree(['/']) : true)),
  );
};
