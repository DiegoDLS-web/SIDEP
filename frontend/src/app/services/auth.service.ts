import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthLocalStorageService, mapLoginUsuarioASesion } from '../core/auth';
import {
  consumirMensajeAccesoBloqueado,
  esErrorUsuarioInactivo,
  guardarMensajeAccesoBloqueado,
} from '../core/auth/acceso-bloqueado.util';
import { limpiarBienvenidaSesionAlLogout } from '../core/welcome-overlay-session';
import type { SesionUsuarioDto } from '../models/auth.dto';
import { mensajeApiError } from '../utils/api-error.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(AuthLocalStorageService);

  private readonly userSubject = new BehaviorSubject<SesionUsuarioDto | null>(
    this.storage.getUsuarioGuardado(),
  );

  private meRequest$: Observable<SesionUsuarioDto | null> | null = null;

  readonly usuario$ = this.userSubject.asObservable();

  get token(): string | null {
    return this.storage.getToken();
  }

  get usuarioActual(): SesionUsuarioDto | null {
    return this.userSubject.value;
  }

  isAutenticado(): boolean {
    return Boolean(this.token);
  }

  private invalidateSesionCache(): void {
    this.meRequest$ = null;
  }

  login(rut: string, password: string): Observable<SesionUsuarioDto> {
    this.invalidateSesionCache();
    // Accedemos a 'resp.data' porque el backend ahora envía el objeto envuelto
    return this.http.post<any>('/api/auth/login', { rut, password }).pipe(
      tap((resp) => {
        this.storage.setToken(resp.data.token);
      }),
      map((resp) => mapLoginUsuarioASesion(resp.data.usuario)),
      tap((user) => {
        this.userSubject.next(user);
        this.storage.setUsuarioGuardado(user);
      }),
    );
  }

  loginDemo(): Observable<SesionUsuarioDto> {
    return throwError(() => new Error('El modo demo está deshabilitado. Usa tu RUT y contraseña institucional.'));
  }

  /** Valida el token con el servidor y actualiza usuario en memoria y en disco. */
  cargarSesion(): Observable<SesionUsuarioDto | null> {
    if (!this.token) {
      this.userSubject.next(null);
      this.invalidateSesionCache();
      return of(null);
    }
    if (!this.meRequest$) {
      this.meRequest$ = this.http.get<SesionUsuarioDto>('/api/auth/me').pipe(
        tap((u) => {
          if (u && u.activo === false) {
            throw new HttpErrorResponse({
              status: 403,
              error: {
                codigo: 'USUARIO_INACTIVO',
                message: 'Tu acceso a SIDEP está restringido.',
              },
            });
          }
          this.userSubject.next(u);
          this.storage.setUsuarioGuardado(u);
        }),
        map((u) => u),
        catchError((err) => {
          if (esErrorUsuarioInactivo(err)) {
            this.cerrarSesionPorAccesoBloqueado(mensajeApiError(err, 'Tu acceso a SIDEP está restringido.'));
            return of(null);
          }
          this.clearLocal();
          this.userSubject.next(null);
          return of(null);
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.meRequest$;
  }

  cambiarPasswordSesion(passwordActual: string, passwordNueva: string): Observable<SesionUsuarioDto> {
    return this.http.patch<{ ok: boolean }>('/api/rrhh/mi-perfil/password', {
      passwordActual,
      passwordNueva,
    }).pipe(
      tap(() => this.invalidateSesionCache()),
      switchMap(() => this.cargarSesion()),
      map((u) => {
        if (!u) {
          throw new Error('Sesión no disponible');
        }
        return u;
      }),
    );
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).pipe(catchError(() => of(null))).subscribe();
    this.clearLocal();
    this.userSubject.next(null);
    limpiarBienvenidaSesionAlLogout();
    void this.router.navigateByUrl('/login');
  }

  cerrarSesionPorAccesoBloqueado(mensaje: string): void {
    guardarMensajeAccesoBloqueado(mensaje);
    this.clearLocal();
    this.userSubject.next(null);
    limpiarBienvenidaSesionAlLogout();
    void this.router.navigateByUrl('/login');
  }

  consumirAvisoAccesoBloqueado(): string | null {
    return consumirMensajeAccesoBloqueado();
  }

  private clearLocal(): void {
    this.storage.limpiar();
    this.invalidateSesionCache();
  }

  private activarSesionLocal(token: string, user: SesionUsuarioDto): void {
    this.storage.setToken(token);
    this.storage.setUsuarioGuardado(user);
    this.invalidateSesionCache();
    this.userSubject.next(user);
  }

  register(datos: any): Observable<any> {
    return this.http.post('/api/auth/register', datos);
  }
}