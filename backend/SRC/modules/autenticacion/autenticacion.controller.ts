import { Request, Response } from 'express';
import { loginUsuario, registrarUsuario } from './autenticacion.service';
import prisma from '../../prisma'; // Asegúrate de importar tu instancia de prisma

// 1. Registro
export const register = async (req: Request, res: Response) => {
    try {
        const usuario = await registrarUsuario(req.body);
        return res.status(201).json({ 
            success: true, 
            message: 'Usuario registrado correctamente', 
            data: usuario 
        });
    } catch (error: any) {
        console.error('🔥 ERROR EN REGISTRO:', error);
        return res.status(400).json({ 
            success: false, 
            message: error.message || 'Error al registrar el usuario' 
        });
    }
};

// 2. Login
export const login = async (req: Request, res: Response) => {
    try {
        const { rut, password } = req.body;
        
        if (!rut || !password) {
            return res.status(400).json({ success: false, message: 'RUT y contraseña requeridos' });
        }

        const resultado = await loginUsuario(rut, password);

        return res.status(200).json({ 
            success: true, 
            message: 'Inicio de sesión exitoso', 
            data: resultado 
        });
    } catch (error: any) {
        console.error('🔥 ERROR EN LOGIN:', error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// 3. ME (Lógica REAL conectada a la BD)
export const me = async (req: Request, res: Response) => {
    try {
        // Obtenemos el ID del token que inyectó el middleware 'protect'
        const userId = (req as any).user.id; 
        
        const usuario = await prisma.usuario.findUnique({
            where: { id: userId },
            include: { rol: { select: { nombre: true } } }
        });

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({
            id: usuario.id,
            nombre: usuario.nombre,
            rut: usuario.rut,
            rol: usuario.rol?.nombre || 'USER',
            activo: usuario.activo
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al obtener datos de sesión' });
    }
};

// 4. LOGOUT
export const logout = async (req: Request, res: Response) => {
    // Al usar JWT, el logout suele ser gestionar el token en el cliente.
    // En el backend, simplemente devolvemos éxito.
    return res.status(200).json({ success: true, message: 'Sesión cerrada' });
};

// 5. LOGIN DEMO
export const loginDemo = async (req: Request, res: Response) => {
    return res.status(200).json({ 
        token: 'demo-token', 
        usuario: { id: 0, nombre: 'Demo', rol: 'ADMIN', rut: '00.000.000-0' } 
    });
};

// 6. CAMBIAR PASSWORD
export const cambiarPassword = async (req: Request, res: Response) => {
    return res.status(200).json({ success: true, message: 'Funcionalidad en desarrollo' });
};