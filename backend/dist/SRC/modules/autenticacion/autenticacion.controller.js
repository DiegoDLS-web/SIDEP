"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restablecerPassword = exports.recuperarPassword = exports.cambiarPassword = exports.loginDemo = exports.logout = exports.me = exports.login = exports.register = void 0;
const autenticacion_service_1 = require("./autenticacion.service");
const password_reset_service_1 = require("./password-reset.service");
const prisma_1 = __importDefault(require("../../prisma"));
const rut_util_1 = require("../../utils/rut.util");
const db_retry_util_1 = require("../../utils/db-retry.util");
const usuario_acceso_util_1 = require("../../utils/usuario-acceso.util");
// 1. Registro
const register = async (req, res) => {
    try {
        if (!req.body.rut || !(0, rut_util_1.validarRut)(req.body.rut)) {
            return res.status(400).json({ success: false, message: 'El RUT no es válido.' });
        }
        const usuario = await (0, autenticacion_service_1.registrarUsuario)(req.body);
        return res.status(201).json({
            success: true,
            message: 'Usuario registrado correctamente',
            data: usuario
        });
    }
    catch (error) {
        console.error('🔥 ERROR EN REGISTRO:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error al registrar el usuario'
        });
    }
};
exports.register = register;
// 2. Login
const login = async (req, res) => {
    try {
        const { rut, password } = req.body;
        if (!rut || !password) {
            return res.status(400).json({ success: false, message: 'RUT y contraseña requeridos' });
        }
        const resultado = await (0, autenticacion_service_1.loginUsuario)(rut, password);
        // Mapear al formato esperado por el frontend
        const nombreCompleto = `${resultado.usuario.nombres} ${resultado.usuario.apellidoPaterno} ${resultado.usuario.apellidoMaterno}`.trim();
        const dataMapped = {
            token: resultado.token,
            usuario: {
                id: parseInt(resultado.usuario.rut.replace(/[^0-9]/g, ''), 10) || 0,
                nombre: nombreCompleto,
                rol: resultado.usuario.rol?.codigo || 'USER',
                email: resultado.usuario.email,
                rut: resultado.usuario.rut,
                activo: resultado.usuario.activo === 1
            }
        };
        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: dataMapped
        });
    }
    catch (error) {
        console.error('🔥 ERROR EN LOGIN:', error);
        if ((0, db_retry_util_1.esErrorConexionPrisma)(error)) {
            return res.status(503).json({
                success: false,
                message: 'No se pudo conectar con la base de datos. Espera unos segundos e intenta de nuevo.',
            });
        }
        const msg = String(error?.message ?? 'Error al iniciar sesión');
        const statusCode = msg.includes('Credenciales')
            ? 401
            : error?.codigo === usuario_acceso_util_1.CODIGO_ACCESO_USUARIO_INACTIVO || msg.includes('restringido')
                ? 403
                : error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: msg,
            ...(error?.codigo === usuario_acceso_util_1.CODIGO_ACCESO_USUARIO_INACTIVO
                ? { codigo: usuario_acceso_util_1.CODIGO_ACCESO_USUARIO_INACTIVO }
                : {}),
        });
    }
};
exports.login = login;
// 3. ME (Corregido para Schema Normalizado)
const me = async (req, res) => {
    try {
        const userRut = req.user.rut;
        const usuario = await prisma_1.default.usuario.findUnique({
            where: { rut: userRut },
            include: { rol: true, estadoVoluntario: true },
        });
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        if (!(0, usuario_acceso_util_1.puedeAccederApp)(usuario)) {
            return res.status(403).json((0, usuario_acceso_util_1.payloadAccesoDenegado)(usuario));
        }
        const nombreCompleto = `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
        return res.status(200).json({
            id: parseInt(usuario.rut.replace(/[^0-9]/g, ''), 10) || 0,
            rut: usuario.rut,
            nombre: nombreCompleto,
            rol: usuario.rol?.codigo || 'USER',
            email: usuario.email,
            activo: usuario.activo === 1,
            estadoVoluntario: usuario.estadoVoluntario?.codigo ?? null,
        });
    }
    catch (error) {
        console.error('🔥 ERROR EN ME:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener datos de sesión' });
    }
};
exports.me = me;
// 4. LOGOUT
const logout = async (req, res) => {
    return res.status(200).json({ success: true, message: 'Sesión cerrada' });
};
exports.logout = logout;
// 5. LOGIN DEMO
const loginDemo = async (req, res) => {
    return res.status(200).json({
        token: 'demo-token',
        usuario: { rut: '00.000.000-0', nombre: 'Demo Local', rol: 'ADMIN' }
    });
};
exports.loginDemo = loginDemo;
// 6. CAMBIAR PASSWORD
const cambiarPassword = async (req, res) => {
    return res.status(200).json({ success: true, message: 'Funcionalidad en desarrollo' });
};
exports.cambiarPassword = cambiarPassword;
const recuperarPassword = async (req, res) => {
    try {
        const email = String(req.body?.email ?? '').trim();
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Ingresa un correo válido.', codigo: 'EMAIL_INVALIDO' });
        }
        const resultado = await (0, password_reset_service_1.solicitarRecuperacionPassword)(email);
        if (!resultado.ok) {
            const porCodigo = {
                EMAIL_NO_REGISTRADO: {
                    status: 404,
                    message: 'Este correo no está asociado a ninguna cuenta activa en SIDEP.',
                },
                USUARIO_SIN_ACCESO: {
                    status: 403,
                    message: 'Esta cuenta no tiene acceso activo al sistema. Contacte a la administración.',
                },
                SMTP_NO_CONFIGURADO: {
                    status: 503,
                    message: 'El envío de correo no está disponible. Contacte al administrador del sistema.',
                },
                ERROR_ENVIO: {
                    status: 502,
                    message: 'No se pudo enviar el correo de recuperación. Intente más tarde o contacte al administrador.',
                },
            };
            const det = porCodigo[resultado.codigo] ?? {
                status: 500,
                message: 'No se pudo procesar la solicitud.',
            };
            return res.status(det.status).json({
                success: false,
                message: det.message,
                codigo: resultado.codigo,
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Correo enviado. Revisa tu bandeja de entrada y la carpeta de spam. El enlace es válido por 2 horas.',
        });
    }
    catch (error) {
        console.error('Error recuperar password:', error);
        return res.status(500).json({
            success: false,
            message: 'No se pudo procesar la solicitud. Intenta más tarde.',
        });
    }
};
exports.recuperarPassword = recuperarPassword;
const restablecerPassword = async (req, res) => {
    try {
        const token = String(req.body?.token ?? '').trim();
        const password = String(req.body?.password ?? '');
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token y contraseña requeridos.' });
        }
        await (0, password_reset_service_1.restablecerPasswordConToken)(token, password);
        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    }
    catch (error) {
        const msg = String(error?.message ?? 'No se pudo restablecer la contraseña.');
        const status = msg.includes('inválido') || msg.includes('expirado') || msg.includes('8 caracteres') ? 400 : 500;
        return res.status(status).json({ success: false, message: msg });
    }
};
exports.restablecerPassword = restablecerPassword;
