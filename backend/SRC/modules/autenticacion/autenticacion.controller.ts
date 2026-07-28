import { Request, Response } from 'express';
import {
    loginUsuario,
    registrarUsuario,
    completarLoginMfa,
    iniciarSetupMfa,
    activarMfa,
    desactivarMfa,
    estadoMfa,
} from './autenticacion.service';
import {
    restablecerPasswordConToken,
    solicitarRecuperacionPassword,
} from './password-reset.service';
import prisma from '../../prisma';
import { validarRut } from '../../utils/rut.util';
import { esErrorConexionPrisma } from '../../utils/db-retry.util';
import {
    CODIGO_ACCESO_USUARIO_INACTIVO,
    payloadAccesoDenegado,
    puedeAccederApp,
} from '../../utils/usuario-acceso.util';
import { setAuthCookie, clearAuthCookie } from '../../utils/security/auth-cookie.util';

function mapUsuarioLogin(usuario: {
    rut: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    email: string;
    activo: number;
    requiereCambioPassword: number;
    rol?: { codigo?: string } | null;
}) {
    const nombreCompleto = `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
    return {
        id: parseInt(usuario.rut.replace(/[^0-9]/g, ''), 10) || 0,
        nombre: nombreCompleto,
        rol: usuario.rol?.codigo || 'USER',
        email: usuario.email,
        rut: usuario.rut,
        activo: usuario.activo === 1,
        requiereCambioPassword: usuario.requiereCambioPassword === 1,
    };
}

// 1. Registro
export const register = async (req: Request, res: Response) => {
    try {
        if (!req.body.rut || !validarRut(req.body.rut)) {
            return res.status(400).json({ success: false, message: 'El RUT no es válido.' });
        }
        const usuario = await registrarUsuario(req.body);
        return res.status(201).json({
            success: true,
            message: 'Usuario registrado correctamente',
            data: usuario,
        });
    } catch (error: any) {
        console.error('🔥 ERROR EN REGISTRO:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error al registrar el usuario',
        });
    }
};

// 2. Login
export const login = async (req: Request, res: Response) => {
    try {
        const { rut, password } = req.body;

        const resultado = await loginUsuario(rut, password);

        if (resultado.kind === 'mfa') {
            return res.status(200).json({
                success: true,
                message: 'Verificación MFA requerida',
                data: {
                    requiresMfa: true,
                    mfaToken: resultado.mfaToken,
                    usuario: mapUsuarioLogin(resultado.usuario),
                },
            });
        }

        setAuthCookie(res, resultado.token);
        const dataMapped = {
            usuario: mapUsuarioLogin(resultado.usuario),
        };

        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: dataMapped,
        });
    } catch (error: any) {
        console.error('🔥 ERROR EN LOGIN:', error);
        if (esErrorConexionPrisma(error)) {
            return res.status(503).json({
                success: false,
                message: 'No se pudo conectar con la base de datos. Espera unos segundos e intenta de nuevo.',
            });
        }
        const msg = String(error?.message ?? 'Error al iniciar sesión');
        const statusCode = msg.includes('Credenciales')
            ? 401
            : error?.codigo === CODIGO_ACCESO_USUARIO_INACTIVO || msg.includes('restringido')
              ? 403
              : error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: msg,
            ...(error?.codigo === CODIGO_ACCESO_USUARIO_INACTIVO
                ? { codigo: CODIGO_ACCESO_USUARIO_INACTIVO }
                : {}),
        });
    }
};

export const verifyMfa = async (req: Request, res: Response) => {
    try {
        const mfaToken = String(req.body?.mfaToken ?? '').trim();
        const code = String(req.body?.code ?? '').trim();
        if (!mfaToken || !code) {
            return res.status(400).json({ success: false, message: 'Token MFA y código requeridos' });
        }
        const { token, usuario } = await completarLoginMfa(mfaToken, code);
        setAuthCookie(res, token);
        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso',
            data: { usuario: mapUsuarioLogin(usuario) },
        });
    } catch (error: any) {
        const msg = String(error?.message ?? 'Error MFA');
        return res.status(400).json({ success: false, message: msg });
    }
};

export const getMfaEstado = async (req: Request, res: Response) => {
    try {
        const rut = (req as any).user.rut as string;
        const data = await estadoMfa(rut);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const postMfaSetup = async (req: Request, res: Response) => {
    try {
        const rut = (req as any).user.rut as string;
        const data = await iniciarSetupMfa(rut);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const postMfaEnable = async (req: Request, res: Response) => {
    try {
        const rut = (req as any).user.rut as string;
        const code = String(req.body?.code ?? '').trim();
        await activarMfa(rut, code);
        return res.status(200).json({ success: true, message: 'MFA activado correctamente' });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const postMfaDisable = async (req: Request, res: Response) => {
    try {
        const rut = (req as any).user.rut as string;
        const code = String(req.body?.code ?? '').trim();
        await desactivarMfa(rut, code);
        return res.status(200).json({ success: true, message: 'MFA desactivado' });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// 3. ME
export const me = async (req: Request, res: Response) => {
    try {
        const userRut = (req as any).user.rut;

        const usuario = await prisma.usuario.findUnique({
            where: { rut: userRut },
            include: { rol: true, estadoVoluntario: true },
        });

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        if (!puedeAccederApp(usuario)) {
            return res.status(403).json(payloadAccesoDenegado(usuario));
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
            requiereCambioPassword: usuario.requiereCambioPassword === 1,
            mfaHabilitado: usuario.mfaEnabled === 1,
        });
    } catch (error) {
        console.error('🔥 ERROR EN ME:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener datos de sesión' });
    }
};

// 4. LOGOUT
export const logout = async (_req: Request, res: Response) => {
    clearAuthCookie(res);
    return res.status(200).json({ success: true, message: 'Sesión cerrada' });
};

// 5. LOGIN DEMO
export const loginDemo = async (_req: Request, res: Response) => {
    return res.status(200).json({
        usuario: { rut: '00.000.000-0', nombre: 'Demo Local', rol: 'ADMIN' },
    });
};

// 6. CAMBIAR PASSWORD
export const cambiarPassword = async (_req: Request, res: Response) => {
    return res.status(200).json({ success: true, message: 'Funcionalidad en desarrollo' });
};

export const recuperarPassword = async (req: Request, res: Response) => {
    try {
        const email = String(req.body?.email ?? '').trim();
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Ingresa un correo válido.', codigo: 'EMAIL_INVALIDO' });
        }
        const resultado = await solicitarRecuperacionPassword(email);
        if (!resultado.ok) {
            const porCodigo: Record<string, { status: number; message: string }> = {
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
            message:
                'Correo enviado. Revisa tu bandeja de entrada y la carpeta de spam. El enlace es válido por 2 horas.',
        });
    } catch (error: any) {
        console.error('Error recuperar password:', error);
        return res.status(500).json({
            success: false,
            message: 'No se pudo procesar la solicitud. Intenta más tarde.',
        });
    }
};

export const restablecerPassword = async (req: Request, res: Response) => {
    try {
        const token = String(req.body?.token ?? '').trim();
        const password = String(req.body?.password ?? '');
        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token y contraseña requeridos.' });
        }
        await restablecerPasswordConToken(token, password);
        return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error: any) {
        const msg = String(error?.message ?? 'No se pudo restablecer la contraseña.');
        const status = msg.includes('inválido') || msg.includes('expirado') || msg.includes('8 caracteres') ? 400 : 500;
        return res.status(status).json({ success: false, message: msg });
    }
};
