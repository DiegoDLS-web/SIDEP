import type { SesionUsuarioDto } from '../../models/auth.dto';

/**
 * Contrato del almacenamiento de sesión (token + usuario en caché).
 * Permite sustituir localStorage en tests o en el futuro (p. ej. sessionStorage).
 */
export interface AuthSesionStorage {
  getToken(): string | null;
  setToken(token: string): void;
  getUsuarioGuardado(): SesionUsuarioDto | null;
  setUsuarioGuardado(user: SesionUsuarioDto): void;
  limpiar(): void;
}
