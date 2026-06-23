import prisma from '../../prisma'; // Asegúrate que esta ruta importe tu cliente de prisma
import { hashPassword, comparePassword } from '../../utils/security/hash';
import jwt from 'jsonwebtoken';
import { validarRut, normalizarRut, formatearRutDesdeNormalizado } from '../../utils/rut.util';
import { withDbRetry } from '../../utils/db-retry.util';
import {
    CODIGO_ACCESO_USUARIO_INACTIVO,
    mensajeAccesoDenegado,
    puedeAccederApp,
} from '../../utils/usuario-acceso.util';

// 1. Registro
export const registrarUsuario = async (datos: any) => {
    const { rut, nombres, apellidoPaterno, apellidoMaterno, email, password, rolId } = datos;
    if (!rut || !validarRut(rut)) {
        throw new Error('El RUT no es válido.');
    }
    const normalizedRut = normalizarRut(rut);

    // Hasheamos la password
    const hashedPassword = await hashPassword(password);

    // Creamos el usuario siguiendo la estructura normalizada del MER
    return await prisma.usuario.create({
        data: {
            rut: normalizedRut, // Clave primaria ahora
            nombres,
            apellidoPaterno, // Mapeado a apellido_paterno
            apellidoMaterno, // Mapeado a apellido_materno
            email,
            passwordHash: hashedPassword,
            rolId,
            activo: 1 // Representando 'true' en tu modelo SmallInt
        }
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

    // Firmamos el JWT usando el RUT
    const token = jwt.sign(
        { rut: usuario.rut },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    return { token, usuario };
};