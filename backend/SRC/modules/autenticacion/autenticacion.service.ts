import prisma from '../../prisma'; // Asegúrate que esta ruta importe tu cliente de prisma
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 1. Registro
export const registrarUsuario = async (datos: any) => {
    const { rut, nombres, apellidoPaterno, apellidoMaterno, email, password, rolId } = datos;

    // Hasheamos la password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creamos el usuario siguiendo la estructura normalizada del MER
    return await prisma.usuario.create({
        data: {
            rut, // Clave primaria ahora
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
    // Buscamos por RUT, ya no por ID
    const usuario = await prisma.usuario.findUnique({
        where: { rut: rut },
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
    const isMatch = await bcrypt.compare(password, usuario.passwordHash);
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