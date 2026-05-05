import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { gestionUsuariosGuard } from './gestion-usuarios.guard';
import { AuthService } from '../services/auth.service';
import type { SesionUsuarioDto } from '../models/auth.dto';

describe('gestionUsuariosGuard', () => {
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

  it('permite acceso solo a ADMIN (normaliza espacios y mayúsculas)', () => {
    auth.usuarioActual = { id: 1, nombre: 'A', rol: '  admin ', email: null, rut: '', activo: true };
    const out = TestBed.runInInjectionContext(() => gestionUsuariosGuard(noopRoute, noopState));
    expect(out).toBe(true);
  });

  it('redirige al inicio si el rol no está autorizado', () => {
    auth.usuarioActual = { id: 1, nombre: 'A', rol: 'TENIENTE', email: null, rut: '', activo: true };
    const out = TestBed.runInInjectionContext(() => gestionUsuariosGuard(noopRoute, noopState));
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/');
  });
});
