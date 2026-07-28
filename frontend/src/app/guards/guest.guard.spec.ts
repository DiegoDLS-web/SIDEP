import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('guestGuard', () => {
  let auth: jasmine.SpyObj<Pick<AuthService, 'cargarSesion'>>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['cargarSesion']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  const noopRoute = {} as ActivatedRouteSnapshot;
  const noopState = {} as RouterStateSnapshot;

  it('permite entrar si no hay sesión', async () => {
    auth.cargarSesion.and.returnValue(of(null));
    const out = await firstValueFrom(
      TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState)) as import('rxjs').Observable<unknown>,
    );
    expect(out).toBe(true);
  });

  it('redirige al inicio si la sesión es válida', async () => {
    auth.cargarSesion.and.returnValue(of({ id: '1', nombre: 'Test', rol: 'VOLUNTARIOS', email: null, rut: '1-9', activo: true }));
    const out = await firstValueFrom(
      TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState)) as import('rxjs').Observable<unknown>,
    );
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/');
  });

  it('permite login si la cookie expiró', async () => {
    auth.cargarSesion.and.returnValue(of(null));
    const out = await firstValueFrom(
      TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState)) as import('rxjs').Observable<unknown>,
    );
    expect(out).toBe(true);
  });
});
