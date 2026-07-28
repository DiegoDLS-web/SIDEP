import prisma from '../../prisma';
import { hashPassword, comparePassword } from '../../utils/security/hash';
import { validarRut, normalizarRut, formatearRutDesdeNormalizado } from '../../utils/rut.util';
import { generateToken } from '../../utils/security/jwt';
import { withDbRetry } from '../../utils/db-retry.util';
import {
    CODIGO_ACCESO_USUARIO_INACTIVO,
    mensajeAccesoDenegado,
    puedeAccederApp,
} from '../../utils/usuario-acceso.util';
import {
    generarMfaPendingToken,
    generarSecretoMfa,
    uriMfaOtpauth,
    verificarCodigoMfa,
    verificarMfaPendingToken,
} from '../../utils/security/mfa.util';

export type LoginResultado =
    | { kind: 'ok'; token: string; usuario: Awaited<ReturnType<typeof buscarUsuarioPorRut>> & object }
    | { kind: 'mfa'; mfaToken: string; usuario: NonNullable<Awaited<ReturnType<typeof buscarUsuarioPorRut>>> };

async function buscarUsuarioPorRut(rut: string) {
    const normalizedRut = normalizarRut(rut);
    const rutFormateado = formatearRutDesdeNormalizado(normalizedRut);
    const rutTrim = rut.trim();
    return withDbRetry(() =>
        prisma.usuario.findFirst({
            where: {
                OR: [
                    { rut: normalizedRut },
                    ...(rutFormateado ? [{ rut: rutFormateado }] : []),
                    ...(rutTrim && rutTrim !== normalizedRut ? [{ rut: rutTrim }] : []),
                ],
            },
            include: { rol: true, estadoVoluntario: true },
        }),
    );
}

// 1. Registro
export const registrarUsuario = async (datos: any) => {
    const { rut, nombres, apellidoPaterno, apellidoMaterno, email, password } = datos;
    if (!rut || !validarRut(rut)) {
        throw new Error('El RUT no es válido.');
    }
    const normalizedRut = normalizarRut(rut);

    const rolVoluntario = await prisma.rolUsuario.findFirst({
        where: { codigo: 'VOLUNTARIOS', activo: 1 },
    });
    if (!rolVoluntario) {
        throw new Error('No hay rol VOLUNTARIOS activo en catálogo.');
    }

    const hashedPassword = await hashPassword(password);

    return await prisma.usuario.create({
        data: {
            rut: normalizedRut,
            nombres,
            apellidoPaterno,
            apellidoMaterno,
            email,
            passwordHash: hashedPassword,
            rolId: rolVoluntario.id,
            activo: 1,
        },
    });
};

// 2. Login
export const loginUsuario = async (rut: string, password: string): Promise<LoginResultado> => {
    const usuario = await buscarUsuarioPorRut(rut);

    if (!usuario) {
        throw new Error('Credenciales inválidas');
    }

    const isMatch = await comparePassword(password, usuario.passwordHash);
    if (!isMatch) {
        throw new Error('Credenciales inválidas');
    }

    if (!puedeAccederApp(usuario)) {
        const err = new Error(mensajeAccesoDenegado(usuario)) as Error & { codigo?: string };
        err.codigo = CODIGO_ACCESO_USUARIO_INACTIVO;
        throw err;
    }

    const rolCodigo = usuario.rol?.codigo ?? '';
    const mfaRequerido = usuario.mfaEnabled === 1 && Boolean(usuario.mfaSecret) && rolCodigo === 'ADMIN';

    if (mfaRequerido) {
        return { kind: 'mfa', mfaToken: generarMfaPendingToken(usuario.rut), usuario };
    }

    const token = generateToken({ rut: usuario.rut, tv: usuario.tokenVersion ?? 0 });
    return { kind: 'ok', token, usuario };
};

export const completarLoginMfa = async (mfaToken: string, code: string) => {
    const pending = verificarMfaPendingToken(mfaToken);
    if (!pending) {
        throw new Error('Sesión MFA expirada. Inicia sesión nuevamente.');
    }

    const usuario = await prisma.usuario.findUnique({
        where: { rut: pending.rut },
        include: { rol: true, estadoVoluntario: true },
    });

    if (!usuario || usuario.mfaEnabled !== 1 || !usuario.mfaSecret) {
        throw new Error('MFA no configurado para esta cuenta.');
    }

    if (!verificarCodigoMfa(usuario.mfaSecret, code)) {
        throw new Error('Código MFA inválido.');
    }

    if (!puedeAccederApp(usuario)) {
        const err = new Error(mensajeAccesoDenegado(usuario)) as Error & { codigo?: string };
        err.codigo = CODIGO_ACCESO_USUARIO_INACTIVO;
        throw err;
    }

    const token = generateToken({ rut: usuario.rut, tv: usuario.tokenVersion ?? 0 });
    return { token, usuario };
};

export const iniciarSetupMfa = async (rut: string) => {
    const usuario = await prisma.usuario.findUnique({ where: { rut }, include: { rol: true } });
    if (!usuario || usuario.rol?.codigo !== 'ADMIN') {
        throw new Error('MFA solo disponible para administradores.');
    }
    const secret = generarSecretoMfa();
    await prisma.usuario.update({
        where: { rut },
        data: { mfaSecret: secret, mfaEnabled: 0 },
    });
    return {
        secret,
        otpauthUrl: uriMfaOtpauth(usuario.email, secret),
    };
};

export const activarMfa = async (rut: string, code: string) => {
    const usuario = await prisma.usuario.findUnique({ where: { rut } });
    if (!usuario?.mfaSecret) {
        throw new Error('Primero inicia la configuración MFA.');
    }
    if (!verificarCodigoMfa(usuario.mfaSecret, code)) {
        throw new Error('Código MFA inválido.');
    }
    await prisma.usuario.update({
        where: { rut },
        data: { mfaEnabled: 1 },
    });
    return { ok: true };
};

export const desactivarMfa = async (rut: string, code: string) => {
    const usuario = await prisma.usuario.findUnique({ where: { rut } });
    if (!usuario?.mfaSecret || usuario.mfaEnabled !== 1) {
        throw new Error('MFA no está activo.');
    }
    if (!verificarCodigoMfa(usuario.mfaSecret, code)) {
        throw new Error('Código MFA inválido.');
    }
    await prisma.usuario.update({
        where: { rut },
        data: { mfaEnabled: 0, mfaSecret: null },
    });
    return { ok: true };
};

export const estadoMfa = async (rut: string) => {
    const usuario = await prisma.usuario.findUnique({ where: { rut }, include: { rol: true } });
    if (!usuario) return { habilitado: false, disponible: false };
    return {
        habilitado: usuario.mfaEnabled === 1,
        disponible: usuario.rol?.codigo === 'ADMIN',
    };
};
