import prisma from '../../prisma'; // Asegúrate que esta ruta importe tu cliente de prisma
import { hashPassword, comparePassword } from '../../utils/security/hash';
import jwt from 'jsonwebtoken';
import { validarRut, normalizarRut } from '../../utils/rut.util';

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
    // Buscamos por RUT, ya no por ID
    const usuario = await prisma.usuario.findUnique({
        where: { rut: normalizedRut },
        include: { rol: true }
    });

    if (!usuario) {
        throw new Error('Credenciales inválidas');
    }

    // Validamos que esté activo (1 = true)
    if (usuario.activo !== 1) {
        throw new Error('Usuario inactivo');
    }

    // Comparamos password
    const isMatch = await comparePassword(password, usuario.passwordHash);
    if (!isMatch) {
        throw new Error('Credenciales inválidas');
    }

    // Firmamos el JWT usando el RUT
    const token = jwt.sign(
        { rut: usuario.rut },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    return { token, usuario };
};