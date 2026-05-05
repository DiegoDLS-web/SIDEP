import { HttpClient } from '@angular/common/http';
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
} from 'rxjs';
import { AuthLocalStorageService, mapLoginUsuarioASesion } from '../core/auth';
import type { LoginResponseDto, SesionUsuarioDto } from '../models/auth.dto';

/**
 * Orquesta autenticación: HTTP + estado en memoria + persistencia vía AuthLocalStorageService.
 * Reglas de negocio de sesión viven aquí; el guard solo pregunta “¿puede pasar?”.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(AuthLocalStorageService);

  /** Estado reactivo del usuario (sidebar, guards, etc.). */
  private readonly userSubject = new BehaviorSubject<SesionUsuarioDto | null>(
    this.storage.getUsuarioGuardado(),
  );

  /** Evita varias peticiones GET /me en paralelo (App + guard). */
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

  login(email: string, password: string): Observable<SesionUsuarioDto> {
    this.invalidateSesionCache();
    return this.http.post<LoginResponseDto>('/api/auth/login', { email, password }).pipe(
      tap((resp) => {
        this.storage.setToken(resp.token);
      }),
      map((resp) => mapLoginUsuarioASesion(resp.usuario)),
      tap((user) => {
        this.userSubject.next(user);
        this.storage.setUsuarioGuardado(user);
      }),
    );
  }

  loginDemo(): Observable<SesionUsuarioDto> {
    this.invalidateSesionCache();
    return this.http.post<LoginResponseDto>('/api/auth/login-demo', {}).pipe(
      tap((resp) => {
        this.storage.setToken(resp.token);
      }),
      map((resp) => mapLoginUsuarioASesion(resp.usuario)),
      tap((user) => {
        this.userSubject.next(user);
        this.storage.setUsuarioGuardado(user);
      }),
      catchError(() => {
        const user: SesionUsuarioDto = {
          id: 0,
          nombre: 'Modo Demo Local',
          rol: 'ADMIN',
          email: 'demo@local',
          rut: '00.000.000-0',
          activo: true,
          requiereCambioPassword: false,
        };
        this.activarSesionLocal('demo-local-token', user);
        return of(user);
      }),
    );
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
          this.userSubject.next(u);
          this.storage.setUsuarioGuardado(u);
        }),
        map((u) => u),
        catchError(() => {
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
    return this.http.post<{ ok: boolean }>('/api/auth/cambiar-password-sesion', {
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
    void this.router.navigateByUrl('/login');
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
}
