import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { firmarToken } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { registrarActividad } from '../lib/auditoria.js';
import { enviarCorreoRecuperacion } from '../lib/mailer.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' });
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
      res.status(401).json({ error: 'Credenciales inválidas' });
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
      res.status(401).json({ error: 'Credenciales inválidas' });
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
    res.status(500).json({ error: 'No se pudo iniciar sesión' });
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
    res.status(500).json({ error: 'No se pudo iniciar sesión demo' });
  }
});

authRouter.post('/cambiar-password-sesion', requireAuth, async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  const passwordActual = String(req.body?.passwordActual ?? '');
  const passwordNueva = String(req.body?.passwordNueva ?? '');
  if (!passwordActual || !passwordNueva) {
    res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    return;
  }
  if (passwordNueva.length < 6) {
    res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    return;
  }
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: uid } });
    if (!usuario) {
      res.status(401).json({ error: 'No autorizado' });
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
      res.status(400).json({ error: 'La contraseña actual no es correcta' });
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
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'No autorizado' });
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
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    res.json(usuario);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo obtener sesión' });
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
    res.status(400).json({ error: 'Email requerido' });
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
    res.status(500).json({ error: 'No se pudo procesar recuperación' });
  }
});

authRouter.post('/restablecer-password', async (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!token || !password) {
    res.status(400).json({ error: 'token y password son requeridos' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    return;
  }
  try {
    const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      res.status(400).json({ error: 'Token inválido o expirado' });
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
    res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
});
