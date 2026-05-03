import { Router, type Request } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { firmarToken } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { registrarActividad } from '../lib/auditoria.js';
import { enviarCorreoRecuperacion } from '../lib/mailer.js';
import { obtenerConfigSistema } from './configuraciones.js';
import { rutasPermitidasParaRol } from '../lib/nav-por-rol.js';
import { GRUPOS_SANGUINEOS, normalizarFotoPerfil } from '../lib/usuario-perfil.js';
import { sendApiError } from '../lib/apiError.js';

export const authRouter = Router();

const selectMiPerfil = {
  id: true,
  nombre: true,
  rut: true,
  rol: true,
  email: true,
  telefono: true,
  activo: true,
  requiereCambioPassword: true,
  nombres: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  nacionalidad: true,
  grupoSanguineo: true,
  direccion: true,
  region: true,
  comuna: true,
  actividad: true,
  fechaNacimiento: true,
  fechaIngreso: true,
  tipoVoluntario: true,
  cuerpoBombero: true,
  compania: true,
  estadoVoluntario: true,
  cargoOficialidad: true,
  observacionesRegistro: true,
  fotoPerfil: true,
  createdAt: true,
  updatedAt: true,
} as const;

authRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    sendApiError(res, 400, 'AUTH_LOGIN_BODY', 'Email y contraseña son requeridos');
    return;
  }
  try {
    let usuario = await prisma.usuario.findFirst({
      where: { email, activo: true },
    });

    // Modo demo: asegura un usuario admin de prueba aunque falte seed/migración.
    if (!usuario && email === 'admin@bomberos.cl' && password === '123456') {
      const hash = await bcrypt.hash('123456', 10);
      await prisma.usuario.upsert({
        where: { rut: '99.999.999-9' },
        update: {
          nombre: 'Administrador SIDEP',
          rol: 'ADMIN',
          email: 'admin@bomberos.cl',
          activo: true,
          password: hash,
        },
        create: {
          rut: '99.999.999-9',
          nombre: 'Administrador SIDEP',
          rol: 'ADMIN',
          email: 'admin@bomberos.cl',
          activo: true,
          password: hash,
        },
      });
      usuario = await prisma.usuario.findFirst({
        where: { email, activo: true },
      });
    }

    if (!usuario) {
      sendApiError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Credenciales inválidas');
      return;
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(password, usuario.password);
    } catch {
      ok = false;
    }
    const okPlano = password === usuario.password;
    if (!ok && !okPlano) {
      sendApiError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Credenciales inválidas');
      return;
    }
    // Si venía legacy en texto plano, migra a hash en el primer login exitoso.
    if (okPlano) {
      const hash = await bcrypt.hash(password, 10);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { password: hash },
      });
    }
    const token = firmarToken({
      sub: String(usuario.id),
      uid: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre,
      email: usuario.email ?? null,
    });

    await registrarActividad({
      usuarioId: usuario.id,
      accion: 'LOGIN',
      modulo: 'AUTH',
      referencia: `usuario:${usuario.id}`,
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        email: usuario.email,
        rut: usuario.rut,
        requiereCambioPassword: usuario.requiereCambioPassword,
      },
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_LOGIN', 'No se pudo iniciar sesión');
  }
});

authRouter.post('/login-demo', async (_req, res) => {
  try {
    const hash = await bcrypt.hash('123456', 10);
    const usuario = await prisma.usuario.upsert({
      where: { rut: '99.999.999-9' },
      update: {
        nombre: 'Administrador SIDEP',
        rol: 'ADMIN',
        email: 'admin@bomberos.cl',
        activo: true,
        password: hash,
      },
      create: {
        rut: '99.999.999-9',
        nombre: 'Administrador SIDEP',
        rol: 'ADMIN',
        email: 'admin@bomberos.cl',
        activo: true,
        password: hash,
      },
    });

    const token = firmarToken({
      sub: String(usuario.id),
      uid: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre,
      email: usuario.email ?? null,
    });

    await registrarActividad({
      usuarioId: usuario.id,
      accion: 'LOGIN_DEMO',
      modulo: 'AUTH',
      referencia: `usuario:${usuario.id}`,
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        email: usuario.email,
        rut: usuario.rut,
        requiereCambioPassword: usuario.requiereCambioPassword,
      },
    });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_LOGIN_DEMO', 'No se pudo iniciar sesión demo');
  }
});

authRouter.post('/cambiar-password-sesion', requireAuth, async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
    return;
  }
  const passwordActual = String(req.body?.passwordActual ?? '');
  const passwordNueva = String(req.body?.passwordNueva ?? '');
  if (!passwordActual || !passwordNueva) {
    sendApiError(res, 400, 'AUTH_PASSWORD_BODY', 'Contraseña actual y nueva son requeridas');
    return;
  }
  if (passwordNueva.length < 6) {
    sendApiError(res, 400, 'AUTH_PASSWORD_SHORT', 'La nueva contraseña debe tener al menos 6 caracteres');
    return;
  }
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: uid } });
    if (!usuario) {
      sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
      return;
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(passwordActual, usuario.password);
    } catch {
      ok = false;
    }
    const okPlano = passwordActual === usuario.password;
    if (!ok && !okPlano) {
      sendApiError(res, 400, 'AUTH_PASSWORD_ACTUAL', 'La contraseña actual no es correcta');
      return;
    }
    const hash = await bcrypt.hash(passwordNueva, 10);
    await prisma.usuario.update({
      where: { id: uid },
      data: { password: hash, requiereCambioPassword: false },
    });
    await registrarActividad({
      usuarioId: uid,
      accion: 'PASSWORD_CAMBIADO',
      modulo: 'AUTH',
      referencia: `usuario:${uid}`,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_PASSWORD_CHANGE', 'No se pudo cambiar la contraseña');
  }
});

function uidAutenticado(req: Request): number | null {
  const raw = (req.user as { uid?: unknown })?.uid;
  const uid = typeof raw === 'number' && Number.isFinite(raw) ? raw : Number(raw);
  if (!Number.isFinite(uid) || uid < 1) return null;
  return uid;
}

authRouter.get('/me', requireAuth, async (req, res) => {
  const uid = uidAutenticado(req);
  if (!uid) {
    sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
    return;
  }
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: uid },
      select: {
        id: true,
        nombre: true,
        rol: true,
        email: true,
        rut: true,
        activo: true,
        requiereCambioPassword: true,
      },
    });
    if (!usuario || !usuario.activo) {
      sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
      return;
    }
    res.json(usuario);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_SESSION', 'No se pudo obtener sesión');
  }
});

authRouter.get('/mi-perfil', requireAuth, async (req, res) => {
  const uid = uidAutenticado(req);
  if (!uid) {
    sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
    return;
  }
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: uid },
      select: selectMiPerfil,
    });
    if (!usuario || !usuario.activo) {
      sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
      return;
    }
    res.json(usuario);
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_PERFIL_LOAD', 'No se pudo cargar el perfil');
  }
});

function telefonoChileEsValido(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('56') ? digits.slice(2) : digits;
  return /^9\d{8}$/.test(local);
}

function emailFormatoValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Autogestión: solo contacto / domicilio / grupo sanguíneo / foto (no identidad ni rol). */
authRouter.patch('/mi-perfil', requireAuth, async (req, res) => {
  const uid = uidAutenticado(req);
  if (!uid) {
    sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
    return;
  }
  const body = req.body as Record<string, unknown>;
  const permitidos = new Set([
    'grupoSanguineo',
    'direccion',
    'region',
    'comuna',
    'actividad',
    'email',
    'telefono',
    'fotoPerfil',
  ]);
  const extranos = Object.keys(body).filter((k) => !permitidos.has(k));
  if (extranos.length > 0) {
    sendApiError(res, 400, 'AUTH_PERFIL_CAMPOS', 'Campos no permitidos en esta acción.');
    return;
  }

  try {
    const actual = await prisma.usuario.findUnique({
      where: { id: uid },
      select: {
        direccion: true,
        region: true,
        comuna: true,
        email: true,
        telefono: true,
        activo: true,
      },
    });
    if (!actual?.activo) {
      sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
      return;
    }

    const data: Record<string, unknown> = {};

    if (body.grupoSanguineo !== undefined) {
      const g = body.grupoSanguineo;
      if (g === null || g === '') {
        data.grupoSanguineo = null;
      } else {
        const gs = String(g).trim();
        if (!(GRUPOS_SANGUINEOS as readonly string[]).includes(gs)) {
          sendApiError(res, 400, 'AUTH_PERFIL_GRUPO_SANGUINEO', 'Grupo sanguíneo no válido.');
          return;
        }
        data.grupoSanguineo = gs;
      }
    }
    if (body.direccion !== undefined) {
      const d = String(body.direccion ?? '').trim();
      data.direccion = d || null;
    }
    if (body.region !== undefined) {
      data.region = String(body.region ?? '').trim() || null;
    }
    if (body.comuna !== undefined) {
      data.comuna = String(body.comuna ?? '').trim() || null;
    }
    if (body.actividad !== undefined) {
      const a = body.actividad;
      data.actividad = a === null || a === '' ? null : String(a).trim();
    }
    if (body.email !== undefined) {
      const emRaw = body.email;
      data.email =
        emRaw === null || emRaw === '' ? null : String(emRaw).trim().toLowerCase();
    }
    if (body.telefono !== undefined) {
      const t = body.telefono;
      data.telefono = t === null || t === '' ? null : String(t).trim();
    }

    let fotoParche: string | null | undefined;
    if (body.fotoPerfil !== undefined) {
      const raw = body.fotoPerfil;
      if (raw === null || raw === '') {
        fotoParche = null;
      } else {
        try {
          fotoParche = normalizarFotoPerfil(String(raw));
        } catch (e) {
          sendApiError(
            res,
            400,
            'AUTH_PERFIL_FOTO',
            e instanceof Error ? e.message : 'Foto de perfil inválida',
          );
          return;
        }
      }
    }

    const tocaDom =
      body.direccion !== undefined || body.region !== undefined || body.comuna !== undefined;
    const dirEff =
      body.direccion !== undefined
        ? String(body.direccion ?? '').trim()
        : (actual.direccion?.trim() ?? '');
    const regEff =
      body.region !== undefined
        ? String(body.region ?? '').trim()
        : (actual.region?.trim() ?? '');
    const comEff =
      body.comuna !== undefined
        ? String(body.comuna ?? '').trim()
        : (actual.comuna?.trim() ?? '');
    if (tocaDom && (!dirEff || !regEff || !comEff)) {
      sendApiError(res, 400, 'AUTH_PERFIL_DIRECCION', 'Completa dirección, región y comuna.');
      return;
    }

    const emailEff =
      body.email !== undefined ? (data.email as string | null) : actual.email;
    const emailStr = String(emailEff ?? '').trim();
    if (!emailStr) {
      sendApiError(res, 400, 'AUTH_PERFIL_EMAIL_VACIO', 'Indica un correo electrónico.');
      return;
    }
    if (!emailFormatoValido(emailStr)) {
      sendApiError(res, 400, 'AUTH_PERFIL_EMAIL_FORMATO', 'El correo electrónico no tiene formato válido.');
      return;
    }

    const telEff =
      body.telefono !== undefined
        ? String(data.telefono ?? '').trim()
        : (actual.telefono?.trim() ?? '');
    if (!telefonoChileEsValido(telEff)) {
      sendApiError(
        res,
        400,
        'AUTH_PERFIL_TELEFONO',
        'El teléfono debe ser un celular chileno válido (9 dígitos, comenzando en 9).',
      );
      return;
    }

    if (fotoParche !== undefined) {
      data.fotoPerfil = fotoParche;
    }

    if (Object.keys(data).length === 0) {
      const u = await prisma.usuario.findUnique({ where: { id: uid }, select: selectMiPerfil });
      if (!u) {
        sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
        return;
      }
      res.json(u);
      return;
    }

    const actualizado = await prisma.usuario.update({
      where: { id: uid },
      data: data as Prisma.UsuarioUpdateInput,
      select: selectMiPerfil,
    });
    await registrarActividad({
      usuarioId: uid,
      accion: 'MI_PERFIL_ACTUALIZADO',
      modulo: 'AUTH',
      referencia: `usuario:${uid}`,
    });
    res.json(actualizado);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      sendApiError(res, 400, 'AUTH_PERFIL_EMAIL_DUPLICADO', 'El correo ya está registrado en otra cuenta.');
      return;
    }
    console.error(e);
    sendApiError(res, 500, 'AUTH_PERFIL_UPDATE', 'No se pudo actualizar tu perfil');
  }
});

authRouter.get('/mi-navegacion', requireAuth, async (req, res) => {
  const uid = uidAutenticado(req);
  if (!uid) {
    sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
    return;
  }
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: uid },
      select: { activo: true, rol: true },
    });
    if (!usuario?.activo) {
      sendApiError(res, 401, 'AUTH_UNAUTHORIZED', 'No autorizado');
      return;
    }
    const cfg = await obtenerConfigSistema();
    const paths = rutasPermitidasParaRol(usuario.rol, cfg.navegacionPorRol);
    res.json({ paths });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_MENU_CONFIG', 'No se pudo obtener la configuración de menú');
  }
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  await registrarActividad({
    usuarioId: req.user?.uid,
    accion: 'LOGOUT',
    modulo: 'AUTH',
    referencia: req.user?.uid ? `usuario:${req.user.uid}` : undefined,
  });
  res.json({ ok: true });
});

authRouter.post('/recuperar-password', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!email) {
    sendApiError(res, 400, 'AUTH_RECOVERY_EMAIL', 'Email requerido');
    return;
  }
  try {
    const usuario = await prisma.usuario.findFirst({ where: { email, activo: true } });
    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
      await prisma.passwordResetToken.create({
        data: {
          usuarioId: usuario.id,
          token,
          expiresAt,
        },
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      const resetUrl = `${frontendUrl}/restablecer-password/${token}`;
      await enviarCorreoRecuperacion(email, resetUrl);
      await registrarActividad({
        usuarioId: usuario.id,
        accion: 'PASSWORD_RESET_REQUEST',
        modulo: 'AUTH',
        referencia: `usuario:${usuario.id}`,
      });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_RECOVERY', 'No se pudo procesar recuperación');
  }
});

authRouter.post('/restablecer-password', async (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!token || !password) {
    sendApiError(res, 400, 'AUTH_RESET_BODY', 'token y password son requeridos');
    return;
  }
  if (password.length < 6) {
    sendApiError(res, 400, 'AUTH_RESET_PASSWORD_SHORT', 'La contraseña debe tener al menos 6 caracteres');
    return;
  }
  try {
    const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      sendApiError(res, 400, 'AUTH_RESET_TOKEN', 'Token inválido o expirado');
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: reset.usuarioId },
        data: { password: hash, requiereCambioPassword: false },
      }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    await registrarActividad({
      usuarioId: reset.usuarioId,
      accion: 'PASSWORD_RESET_SUCCESS',
      modulo: 'AUTH',
      referencia: `usuario:${reset.usuarioId}`,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    sendApiError(res, 500, 'AUTH_RESET', 'No se pudo restablecer la contraseña');
  }
});
