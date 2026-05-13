import { Injectable } from '@angular/core';
import type { SesionUsuarioDto } from '../../models/auth.dto';
import type { AuthSesionStorage } from './auth-sesion-storage.interface';

const TOKEN_KEY = 'sidep_token';
const USER_KEY = 'sidep_user';

/**
 * Persistencia de sesión en el navegador (localStorage).
 * Una sola responsabilidad: leer/escribir claves; sin llamadas HTTP.
 */
@Injectable({ providedIn: 'root' })
export class AuthLocalStorageService implements AuthSesionStorage {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
