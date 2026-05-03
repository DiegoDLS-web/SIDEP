"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const auth_js_1 = require("../lib/auth.js");
const auth_js_2 = require("../middleware/auth.js");
const prisma_js_1 = require("../lib/prisma.js");
const auditoria_js_1 = require("../lib/auditoria.js");
const mailer_js_1 = require("../lib/mailer.js");
const configuraciones_js_1 = require("./configuraciones.js");
const nav_por_rol_js_1 = require("../lib/nav-por-rol.js");
const usuario_perfil_js_1 = require("../lib/usuario-perfil.js");
exports.authRouter = (0, express_1.Router)();
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
};
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
function uidAutenticado(req) {
    const raw = req.user?.uid;
    const uid = typeof raw === 'number' && Number.isFinite(raw) ? raw : Number(raw);
    if (!Number.isFinite(uid) || uid < 1)
        return null;
    return uid;
}
exports.authRouter.get('/me', auth_js_2.requireAuth, async (req, res) => {
    const uid = uidAutenticado(req);
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
exports.authRouter.get('/mi-perfil', auth_js_2.requireAuth, async (req, res) => {
    const uid = uidAutenticado(req);
    if (!uid) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }
    try {
        const usuario = await prisma_js_1.prisma.usuario.findUnique({
            where: { id: uid },
            select: selectMiPerfil,
        });
        if (!usuario || !usuario.activo) {
            res.status(401).json({ error: 'No autorizado' });
            return;
        }
        res.json(usuario);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo cargar el perfil' });
    }
});
function telefonoChileEsValido(value) {
    const digits = value.replace(/\D/g, '');
    const local = digits.startsWith('56') ? digits.slice(2) : digits;
    return /^9\d{8}$/.test(local);
}
function emailFormatoValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
/** Autogestión: solo contacto / domicilio / grupo sanguíneo / foto (no identidad ni rol). */
exports.authRouter.patch('/mi-perfil', auth_js_2.requireAuth, async (req, res) => {
    const uid = uidAutenticado(req);
    if (!uid) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }
    const body = req.body;
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
        res.status(400).json({ error: 'Campos no permitidos en esta acción.' });
        return;
    }
    try {
        const actual = await prisma_js_1.prisma.usuario.findUnique({
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
            res.status(401).json({ error: 'No autorizado' });
            return;
        }
        const data = {};
        if (body.grupoSanguineo !== undefined) {
            const g = body.grupoSanguineo;
            if (g === null || g === '') {
                data.grupoSanguineo = null;
            }
            else {
                const gs = String(g).trim();
                if (!usuario_perfil_js_1.GRUPOS_SANGUINEOS.includes(gs)) {
                    res.status(400).json({ error: 'Grupo sanguíneo no válido.' });
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
        let fotoParche;
        if (body.fotoPerfil !== undefined) {
            const raw = body.fotoPerfil;
            if (raw === null || raw === '') {
                fotoParche = null;
            }
            else {
                try {
                    fotoParche = (0, usuario_perfil_js_1.normalizarFotoPerfil)(String(raw));
                }
                catch (e) {
                    res.status(400).json({ error: e instanceof Error ? e.message : 'Foto de perfil inválida' });
                    return;
                }
            }
        }
        const tocaDom = body.direccion !== undefined || body.region !== undefined || body.comuna !== undefined;
        const dirEff = body.direccion !== undefined
            ? String(body.direccion ?? '').trim()
            : (actual.direccion?.trim() ?? '');
        const regEff = body.region !== undefined
            ? String(body.region ?? '').trim()
            : (actual.region?.trim() ?? '');
        const comEff = body.comuna !== undefined
            ? String(body.comuna ?? '').trim()
            : (actual.comuna?.trim() ?? '');
        if (tocaDom && (!dirEff || !regEff || !comEff)) {
            res.status(400).json({ error: 'Completa dirección, región y comuna.' });
            return;
        }
        const emailEff = body.email !== undefined ? data.email : actual.email;
        const emailStr = String(emailEff ?? '').trim();
        if (!emailStr) {
            res.status(400).json({ error: 'Indica un correo electrónico.' });
            return;
        }
        if (!emailFormatoValido(emailStr)) {
            res.status(400).json({ error: 'El correo electrónico no tiene formato válido.' });
            return;
        }
        const telEff = body.telefono !== undefined
            ? String(data.telefono ?? '').trim()
            : (actual.telefono?.trim() ?? '');
        if (!telefonoChileEsValido(telEff)) {
            res.status(400).json({ error: 'El teléfono debe ser un celular chileno válido (9 dígitos, comenzando en 9).' });
            return;
        }
        if (fotoParche !== undefined) {
            data.fotoPerfil = fotoParche;
        }
        if (Object.keys(data).length === 0) {
            const u = await prisma_js_1.prisma.usuario.findUnique({ where: { id: uid }, select: selectMiPerfil });
            if (!u) {
                res.status(401).json({ error: 'No autorizado' });
                return;
            }
            res.json(u);
            return;
        }
        const actualizado = await prisma_js_1.prisma.usuario.update({
            where: { id: uid },
            data: data,
            select: selectMiPerfil,
        });
        await (0, auditoria_js_1.registrarActividad)({
            usuarioId: uid,
            accion: 'MI_PERFIL_ACTUALIZADO',
            modulo: 'AUTH',
            referencia: `usuario:${uid}`,
        });
        res.json(actualizado);
    }
    catch (e) {
        if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            res.status(400).json({ error: 'El correo ya está registrado en otra cuenta.' });
            return;
        }
        console.error(e);
        res.status(500).json({ error: 'No se pudo actualizar tu perfil' });
    }
});
exports.authRouter.get('/mi-navegacion', auth_js_2.requireAuth, async (req, res) => {
    const uid = uidAutenticado(req);
    if (!uid) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }
    try {
        const usuario = await prisma_js_1.prisma.usuario.findUnique({
            where: { id: uid },
            select: { activo: true, rol: true },
        });
        if (!usuario?.activo) {
            res.status(401).json({ error: 'No autorizado' });
            return;
        }
        const cfg = await (0, configuraciones_js_1.obtenerConfigSistema)();
        const paths = (0, nav_por_rol_js_1.rutasPermitidasParaRol)(usuario.rol, cfg.navegacionPorRol);
        res.json({ paths });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'No se pudo obtener la configuración de menú' });
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