import { randomBytes } from 'crypto';
import { normalizarRut } from '../rut.util';

/** Contraseña provisional legible (sin caracteres ambiguos 0/O/1/l). */
export function generarPasswordProvisional(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}

export function validarPasswordNueva(password: string, rut?: string | null): string | null {
  const p = String(password ?? '');
  if (p.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
    return 'La contraseña debe incluir letras y números.';
  }
  if (rut) {
    const rutNorm = normalizarRut(rut).replace(/[^0-9kK]/gi, '').toLowerCase();
    const pClean = p.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
    if (rutNorm && (pClean === rutNorm || pClean.includes(rutNorm) || rutNorm.includes(pClean))) {
      return 'La contraseña no puede ser igual ni contener el RUT.';
    }
  }
  return null;
}
