import prisma from '../../prisma';
import { generateToken, AppError } from '../../utils';
import { hash, compare } from 'bcrypt';

// REGISTRAR: El backend cifra la contraseña antes de guardar
export const registrarUsuario = async (datos: any) => {
    // 1. Hasheamos la contraseña con un factor de 10 (estándar de seguridad)
    const passwordHash = await hash(datos.password, 10);
    
    // 2. Guardamos en la base de datos
    return await prisma.usuario.create({
        data: {
            rut: datos.rut,
            nombre: datos.nombre,
            password: passwordHash, // Guardamos el HASH, nunca el texto plano
            rolId: datos.rolId || 1, // Por defecto asignamos el rol 1
            activo: true,
            // Agregamos campos obligatorios que tu tabla requiere
            updatedAt: new Date(),
            createdAt: new Date()
        }
    });
};

// LOGIN: El backend compara el hash
export const loginUsuario = async (rut: string, contrasenaPlana: string) => {
    const usuario = await prisma.usuario.findUnique({
        where: { rut: rut },
        include: { rol: { select: { nombre: true } } }
    });

    if (!usuario) {
        throw new AppError('Credenciales inválidas', 401);
    }
    
    if (!usuario.activo) {
        throw new AppError('Usuario inactivo. Contacte a su oficial.', 403);
    }

    // COMPROBACIÓN SEGURA: Comparamos el texto plano contra el hash guardado
    const passwordValida = await compare(contrasenaPlana, usuario.password);

    if (!passwordValida) {
        throw new AppError('Credenciales inválidas', 401);
    }

    const token = generateToken({
        id: usuario.id,
        rut: usuario.rut
    });

    return {
        usuario: {
            id: usuario.id,
            rut: usuario.rut,
            nombre: usuario.nombre,
            rol: usuario.rol?.nombre || 'USER',
            requiereCambioPassword: usuario.requiereCambioPassword
        },
        token
    };
};