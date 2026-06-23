import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { esErrorUsuarioInactivo } from '../core/auth/acceso-bloqueado.util';
import { mensajeApiError } from '../utils/api-error.util';

/** Añade Authorization: Bearer a las llamadas API si existe token. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const prepared = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  return next(prepared).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && esErrorUsuarioInactivo(err)) {
        auth.cerrarSesionPorAccesoBloqueado(
          mensajeApiError(err, 'Tu acceso a SIDEP está restringido. Contacta a la oficialidad.'),
        );
      }
      return throwError(() => err);
    }),
  );
};
