"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const auth_js_1 = require("../lib/auth.js");
const auth_js_2 = require("../middleware/auth.js");
const prisma_js_1 = require("../lib/prisma.js");
const auditoria_js_1 = require("../lib/auditoria.js");
const mailer_js_1 = require("../lib/mailer.js");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
        res.status(400).json({ error: 'Email y contraseña son requeridos' });
        return;
    }
    try {
        let usuario = await prisma_js_1.prisma.usuario.findFirst({
            where: { email, activo: true },
        });
        // Modo demo: asegura un usuario admin de prueba aunque falte seed/migración.
        if (!usuario && email === 'admin@bomberos.cl' && password === '123456') {
            const hash = await bcryptjs_1.default.hash('123456', 10);
            await prisma_js_1.prisma.usuario.upsert({
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
            usuario = await prisma_js_1.prisma.usuario.findFirst({
                where: { email, activo: true },
            });
        }
        if (!usuario) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }
        let ok = false;
        try {
            ok = await bcryptjs_1.default.compare(password, usuario.password);
        }
        catch {
            ok = false;
        }
        const okPlano = password === usuario.password;
        if (!ok && !okPlano) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }
        // Si venía legacy en texto plano, migra a hash en el primer login exitoso.
        if (okPlano) {
            const hash = await bcryptjs_1.default.hash(password, 10);
            await prisma_js_1.prisma.usuario.update({
                where: { id: usuario.id },
                data: { password: hash },
            });
        }
        const token = (0, auth_js_1.firmarToken)({
            sub: String(usuario.id),
            uid: usuario.id,
            rol: usuario.rol,
            nombre: usuario.nombre,
            email: usuario.email ?? null,
        });
        await (0, auditoria_js_1.registrarActividad)({
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo iniciar sesión' });
    }
});
exports.authRouter.post('/login-demo', async (_req, res) => {
    try {
        const hash = await bcryptjs_1.default.hash('123456', 10);
        const usuario = await prisma_js_1.prisma.usuario.upsert({
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
        const token = (0, auth_js_1.firmarToken)({
            sub: String(usuario.id),
            uid: usuario.id,
            rol: usuario.rol,
            nombre: usuario.nombre,
            email: usuario.email ?? null,
        });
        await (0, auditoria_js_1.registrarActividad)({
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo iniciar sesión demo' });
    }
});
exports.authRouter.post('/cambiar-password-sesion', auth_js_2.requireAuth, async (req, res) => {
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
        const usuario = await prisma_js_1.prisma.usuario.findUnique({ where: { id: uid } });
        if (!usuario) {
            res.status(401).json({ error: 'No autorizado' });
            return;
        }
        let ok = false;
        try {
            ok = await bcryptjs_1.default.compare(passwordActual, usuario.password);
        }
        catch {
            ok = false;
        }
        const okPlano = passwordActual === usuario.password;
        if (!ok && !okPlano) {
            res.status(400).json({ error: 'La contraseña actual no es correcta' });
            return;
        }
        const hash = await bcryptjs_1.default.hash(passwordNueva, 10);
        await prisma_js_1.prisma.usuario.update({
            where: { id: uid },
            data: { password: hash, requiereCambioPassword: false },
        });
        await (0, auditoria_js_1.registrarActividad)({
            usuarioId: uid,
            accion: 'PASSWORD_CAMBIADO',
            modulo: 'AUTH',
            referencia: `usuario:${uid}`,
        });
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
    }
});
exports.authRouter.get('/me', auth_js_2.requireAuth, async (req, res) => {
    const uid = req.user?.uid;
    if (!uid) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }
    try {
        const usuario = await prisma_js_1.prisma.usuario.findUnique({
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo obtener sesión' });
    }
});
exports.authRouter.post('/logout', auth_js_2.requireAuth, async (req, res) => {
    await (0, auditoria_js_1.registrarActividad)({
        usuarioId: req.user?.uid,
        accion: 'LOGOUT',
        modulo: 'AUTH',
        referencia: req.user?.uid ? `usuario:${req.user.uid}` : undefined,
    });
    res.json({ ok: true });
});
exports.authRouter.post('/recuperar-password', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!email) {
        res.status(400).json({ error: 'Email requerido' });
        return;
    }
    try {
        const usuario = await prisma_js_1.prisma.usuario.findFirst({ where: { email, activo: true } });
        if (usuario) {
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
            await prisma_js_1.prisma.passwordResetToken.create({
                data: {
                    usuarioId: usuario.id,
                    token,
                    expiresAt,
                },
            });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
            const resetUrl = `${frontendUrl}/restablecer-password/${token}`;
            await (0, mailer_js_1.enviarCorreoRecuperacion)(email, resetUrl);
            await (0, auditoria_js_1.registrarActividad)({
                usuarioId: usuario.id,
                accion: 'PASSWORD_RESET_REQUEST',
                modulo: 'AUTH',
                referencia: `usuario:${usuario.id}`,
            });
        }
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo procesar recuperación' });
    }
});
exports.authRouter.post('/restablecer-password', async (req, res) => {
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
        const reset = await prisma_js_1.prisma.passwordResetToken.findUnique({ where: { token } });
        if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
            res.status(400).json({ error: 'Token inválido o expirado' });
            return;
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        await prisma_js_1.prisma.$transaction([
            prisma_js_1.prisma.usuario.update({
                where: { id: reset.usuarioId },
                data: { password: hash, requiereCambioPassword: false },
            }),
            prisma_js_1.prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
        ]);
        await (0, auditoria_js_1.registrarActividad)({
            usuarioId: reset.usuarioId,
            accion: 'PASSWORD_RESET_SUCCESS',
            modulo: 'AUTH',
            referencia: `usuario:${reset.usuarioId}`,
        });
        res.json({ ok: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
    }
});
//# sourceMappingURL=auth.js.map