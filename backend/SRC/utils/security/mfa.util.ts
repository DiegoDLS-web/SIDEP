import { generateSecret, generateURI, verifySync } from 'otplib';
import { generateToken, verifyToken } from './jwt';

export function generarSecretoMfa(): string {
  return generateSecret();
}

export function uriMfaOtpauth(email: string, secret: string): string {
  return generateURI({ issuer: 'SIDEP', label: email, secret });
}

export function verificarCodigoMfa(secret: string, code: string): boolean {
  const normalized = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = verifySync({ token: normalized, secret });
  return result.valid;
}

export function generarMfaPendingToken(rut: string): string {
  return generateToken({ rut, purpose: 'mfa', tv: 0 });
}

export function verificarMfaPendingToken(token: string): { rut: string } | null {
  const decoded = verifyToken(token);
  if (!decoded || decoded.purpose !== 'mfa' || !decoded.rut) return null;
  return { rut: String(decoded.rut) };
}
