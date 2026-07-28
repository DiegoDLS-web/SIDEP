import { randomBytes } from 'crypto';
import prisma from '../../prisma';
import { hashPassword } from '../../utils/security/hash';
import { validarPasswordNueva } from '../../utils/security/password-policy.util';
import { correoSmtpDisponible, enviarCorreoRecuperacionPassword } from '../../utils/email/email.service';
import { puedeAccederApp } from '../../utils/usuario-acceso.util';

const EXPIRY_MS = 2 * 60 * 60 * 1000;

export type CodigoRecuperacionPassword =
  | 'EMAIL_NO_REGISTRADO'
  | 'USUARIO_SIN_ACCESO'
  | 'SMTP_NO_CONFIGURADO'
  | 'ERROR_ENVIO';

export type ResultadoRecuperacionPassword =
  | { ok: true }
  | { ok: false; codigo: CodigoRecuperacionPassword };

export async function solicitarRecuperacionPassword(
  email: string,
): Promise<ResultadoRecuperacionPassword> {
  const emailNorm = String(email ?? '').trim().toLowerCase();
  if (!emailNorm) {
    return { ok: false, codigo: 'EMAIL_NO_REGISTRADO' };
  }

  const usuario = await prisma.usuario.findFirst({
    where: {
      email: { equals: emailNorm, mode: 'insensitive' },
      activo: 1,
    },
    include: { estadoVoluntario: true, rol: true },
  });

  if (!usuario) {
    return { ok: false, codigo: 'EMAIL_NO_REGISTRADO' };
  }

  if (!puedeAccederApp(usuario)) {
    return { ok: false, codigo: 'USUARIO_SIN_ACCESO' };
  }

  if (!correoSmtpDisponible()) {
    return { ok: false, codigo: 'SMTP_NO_CONFIGURADO' };
  }

  await prisma.passwordResetToken.deleteMany({ where: { usuarioRut: usuario.rut } });

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await prisma.passwordResetToken.create({
    data: {
      token,
      usuarioRut: usuario.rut,
      expiresAt,
    },
  });

  const baseUrl = (
    process.env.APP_PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:4200'
  ).replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/i.test(baseUrl)) {
    console.error(
      '[SIDEP] APP_PUBLIC_URL apunta a localhost en producción; los enlaces de recuperación de contraseña serán incorrectos.',
    );
  }
  const link = `${baseUrl}/restablecer-password/${token}`;

  try {
    await enviarCorreoRecuperacionPassword({
      to: usuario.email,
      nombre: usuario.nombres,
      link,
    });
  } catch (err) {
    console.error('[SIDEP] Error enviando correo de recuperación:', err);
    await prisma.passwordResetToken.deleteMany({ where: { token } });
    return { ok: false, codigo: 'ERROR_ENVIO' };
  }

  return { ok: true };
}

export async function restablecerPasswordConToken(token: string, password: string): Promise<void> {
  const tokenNorm = String(token ?? '').trim();
  if (!tokenNorm) throw new Error('Enlace inválido o expirado.');

  const nueva = String(password ?? '');
  const errPolitica = validarPasswordNueva(nueva);
  if (errPolitica) {
    throw new Error(errPolitica);
  }

  const row = await prisma.passwordResetToken.findUnique({ where: { token: tokenNorm } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new Error('Enlace inválido o expirado.');
  }

  const hash = await hashPassword(nueva);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { rut: row.usuarioRut },
      data: { passwordHash: hash, requiereCambioPassword: 0 },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
