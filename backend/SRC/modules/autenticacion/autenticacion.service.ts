import prisma from '../../prisma'; // Asegúrate que esta ruta importe tu cliente de prisma
import { hashPassword, comparePassword } from '../../utils/security/hash';
import { validarRut, normalizarRut, formatearRutDesdeNormalizado } from '../../utils/rut.util';
import { generateToken } from '../../utils/security/jwt';
import { withDbRetry } from '../../utils/db-retry.util';
import {
    CODIGO_ACCESO_USUARIO_INACTIVO,
    mensajeAccesoDenegado,
    puedeAccederApp,
} from '../../utils/usuario-acceso.util';

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
export const loginUsuario = async (rut: string, password: string) => {
    const normalizedRut = normalizarRut(rut);
    const rutFormateado = formatearRutDesdeNormalizado(normalizedRut);
    const rutTrim = rut.trim();
    // Buscamos por RUT (reintento si Neon está despertando)
    const usuario = await withDbRetry(() =>
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

    const token = generateToken({ rut: usuario.rut });

    return { token, usuario };
};