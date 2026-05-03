import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  let auth: jasmine.SpyObj<Pick<AuthService, 'isAutenticado' | 'cargarSesion'>>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['isAutenticado', 'cargarSesion']);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  async function run(url: string) {
    const raw = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, state(url)),
    );
    if (raw instanceof Observable) {
      return firstValueFrom(raw);
    }
    return raw;
  }

  it('sin token redirige a login', async () => {
    auth.isAutenticado.and.returnValue(false);
    const out = await run('/partes');
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/login');
  });

  it('si la sesión no se puede validar redirige a login', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(of(null));
    const out = await run('/partes');
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/login');
  });

  const usuarioBase = {
    id: 1,
    nombre: 'U',
    rol: 'VOLUNTARIOS',
    email: null as string | null,
    rut: '',
    activo: true,
    requiereCambioPassword: false,
  };

  it('usuario válido sin cambio de password obligatorio permite la ruta', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(of(usuarioBase));
    const out = await run('/partes');
    expect(out).toBe(true);
  });

  it('requiere cambio de password: redirige a la pantalla de cambio', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(
      of({ ...usuarioBase, requiereCambioPassword: true }),
    );
    const out = await run('/partes');
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/cambiar-password-inicial');
  });

  it('requiere cambio de password: permite permanecer en cambiar-password-inicial', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(
      of({ ...usuarioBase, requiereCambioPassword: true }),
    );
    const out = await run('/cambiar-password-inicial');
    expect(out).toBe(true);
  });

  it('si ya no requiere cambio, no deja en cambiar-password-inicial', async () => {
    auth.isAutenticado.and.returnValue(true);
    auth.cargarSesion.and.returnValue(of(usuarioBase));
    const out = await run('/cambiar-password-inicial');
    expect(out).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(out as UrlTree)).toBe('/');
  });
});
