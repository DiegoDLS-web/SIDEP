import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { esErrorUsuarioInactivo } from '../core/auth/acceso-bloqueado.util';
import { mensajeApiError } from '../utils/api-error.util';

/** Cookies httpOnly + credenciales en llamadas API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const prepared = req.url.startsWith('/api')
    ? req.clone({ withCredentials: true })
    : req;

  return next(prepared).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (esErrorUsuarioInactivo(err)) {
          auth.cerrarSesionPorAccesoBloqueado(
            mensajeApiError(err, 'Tu acceso a SIDEP está restringido. Contacta a la oficialidad.'),
          );
        } else if (err.status === 401 && err.error?.codigo === 'SESION_REVOCADA') {
          auth.cerrarSesionPorAccesoBloqueado(
            mensajeApiError(err, 'Tu sesión ya no es válida. Inicia sesión nuevamente.'),
          );
        }
      }
      return throwError(() => err);
    }),
  );
};
