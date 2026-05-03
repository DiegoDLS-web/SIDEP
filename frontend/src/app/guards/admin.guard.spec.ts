import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';
import type { SesionUsuarioDto } from '../models/auth.dto';

describe('adminGuard', () => {
  let auth: { usuarioActual: SesionUsuarioDto | null };
  let router: Router;

  beforeEach(() => {
    auth = { usuarioActual: null };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  const noopRoute = {} as ActivatedRouteSnapshot;
  const noopState = {} as RouterStateSnapshot;

  it('permite acceso si el rol es ADMIN (mayúsculas)', () => {
    auth.usuarioActual = { id: 1, nombre: 'A', rol: 'ADMIN', email: null, rut: '', activo: true };
    const out = TestBed.runInInjectionContext(() => adminGuard(noopRoute, noopState));
    expect(out).toBe(true);
  });

  it('normaliza espacios en blanco antes de comparar ADMIN', () => {
    auth.usuarioActual = { id: 1, nombre: 'A', rol: '  ADMIN  ', email: null, rut: '', activo: true };
    const out = TestBed.runInInjectionContext(() => adminGuard(noopRoute, noopState));
    expect(out).toBe(true);
  });

  it('redirige al inicio si el rol no es ADMIN', () => {
    auth.usuarioActual = { id: 1, nombre: 'A', rol: 'CAPITAN', email: null, rut: '', activo: true };
    const out = TestBed.runInInjectionContext(() => adminGuard(noopRoute, noopState));
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/');
  });
});
