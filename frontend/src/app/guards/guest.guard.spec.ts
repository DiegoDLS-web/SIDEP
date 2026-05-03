import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('guestGuard', () => {
  let auth: jasmine.SpyObj<Pick<AuthService, 'isAutenticado'>>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isAutenticado']);
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

  it('redirige al inicio si ya hay sesión', () => {
    auth.isAutenticado.and.returnValue(true);
    const out = TestBed.runInInjectionContext(() => guestGuard(noopRoute, noopState));
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/');
  });
});
