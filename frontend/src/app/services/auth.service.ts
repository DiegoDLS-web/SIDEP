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

export type LoginResult =
  | { kind: 'ok'; usuario: SesionUsuarioDto }
  | { kind: 'mfa'; mfaToken: string; usuario: SesionUsuarioDto };

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
    return null;
  }

  get usuarioActual(): SesionUsuarioDto | null {
    return this.userSubject.value;
  }

  isAutenticado(): boolean {
    return Boolean(this.userSubject.value ?? this.storage.getUsuarioGuardado());
  }

  private invalidateSesionCache(): void {
    this.meRequest$ = null;
  }

  login(rut: string, password: string): Observable<LoginResult> {
    this.invalidateSesionCache();
    return this.http.post<any>('/api/auth/login', { rut, password }).pipe(
      map((resp) => {
        const data = resp.data;
        if (data?.requiresMfa && data?.mfaToken) {
          return {
            kind: 'mfa' as const,
            mfaToken: data.mfaToken as string,
            usuario: mapLoginUsuarioASesion(data.usuario),
          };
        }
        const user = mapLoginUsuarioASesion(data.usuario);
        this.userSubject.next(user);
        this.storage.setUsuarioGuardado(user);
        return { kind: 'ok' as const, usuario: user };
      }),
    );
  }

  verifyMfa(mfaToken: string, code: string): Observable<SesionUsuarioDto> {
    this.invalidateSesionCache();
    return this.http.post<any>('/api/auth/mfa/verify', { mfaToken, code }).pipe(
      map((resp) => mapLoginUsuarioASesion(resp.data.usuario)),
      tap((user) => {
        this.userSubject.next(user);
        this.storage.setUsuarioGuardado(user);
      }),
    );
  }

  getMfaEstado(): Observable<{ habilitado: boolean; disponible: boolean }> {
    return this.http
      .get<{ success: boolean; data: { habilitado: boolean; disponible: boolean } }>(
        '/api/auth/mfa/estado',
      )
      .pipe(map((r) => r.data));
  }

  iniciarMfaSetup(): Observable<{ secret: string; otpauthUrl: string }> {
    return this.http
      .post<{ success: boolean; data: { secret: string; otpauthUrl: string } }>(
        '/api/auth/mfa/setup',
        {},
      )
      .pipe(map((r) => r.data));
  }

  activarMfa(code: string): Observable<void> {
    return this.http.post<void>('/api/auth/mfa/enable', { code });
  }

  desactivarMfa(code: string): Observable<void> {
    return this.http.post<void>('/api/auth/mfa/disable', { code });
  }

  loginDemo(): Observable<SesionUsuarioDto> {
    return throwError(() => new Error('El modo demo está deshabilitado. Usa tu RUT y contraseña institucional.'));
  }

  cargarSesion(): Observable<SesionUsuarioDto | null> {
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

  register(datos: any): Observable<any> {
    return this.http.post('/api/auth/register', datos);
  }
}
