import { Injectable } from '@angular/core';
import type { SesionUsuarioDto } from '../../models/auth.dto';
import type { AuthSesionStorage } from './auth-sesion-storage.interface';

const USER_KEY = 'sidep_user';

/**
 * Persistencia de sesión en el navegador (solo usuario; token en cookie httpOnly).
 */
@Injectable({ providedIn: 'root' })
export class AuthLocalStorageService implements AuthSesionStorage {
  getToken(): string | null {
    return null;
  }

  setToken(_token: string): void {
    /* token en cookie httpOnly */
  }

  getUsuarioGuardado(): SesionUsuarioDto | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SesionUsuarioDto;
    } catch {
      return null;
    }
  }

  setUsuarioGuardado(user: SesionUsuarioDto): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  limpiar(): void {
    localStorage.removeItem(USER_KEY);
  }
}
