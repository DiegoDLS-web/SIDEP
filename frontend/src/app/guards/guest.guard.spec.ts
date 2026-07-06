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
  let auth: jasmine.SpyObj<Pick<AuthService, 'isAutenticado' | 'cargarSesion'>>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isAutenticado', 'cargarSesion']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  const noopRoute = {} as ActivatedRouteSnapshot;
  const noopState = {} as RouterStateSnapshot;

  it('permite entrar si no hay sesión', () => {
    auth.isAutenticado.and.returnValue(false);
    const out = TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState));
    expect(out).toBe(true);
  });

  it('redirige al inicio si la sesión es válida', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(of({ id: '1', nombre: 'Test', rol: 'VOLUNTARIOS', email: null, rut: '1-9', activo: true }));
    const out = await firstValueFrom(
      TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState)) as ReturnType<typeof guestGuard>,
    );
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/');
  });

  it('permite login si el token expiró', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(of(null));
    const out = await firstValueFrom(
      TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState)) as ReturnType<typeof guestGuard>,
    );
    expect(out).toBe(true);
  });
});
