import { Request, Response } from 'express';
import { loginUsuario, registrarUsuario } from './autenticacion.service';
import prisma from '../../prisma'; 

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

// 3. ME (Corregido para Schema Normalizado)
export const me = async (req: Request, res: Response) => {
    try {
        // Ahora el token debe traer el 'rut', no el 'id'
        const userRut = (req as any).user.rut; 
        
        const usuario = await prisma.usuario.findUnique({
            where: { rut: userRut },
            include: { rol: true } // Incluimos la relación completa
        });

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        // Construimos el nombre completo desde los campos separados del MER
        const nombreCompleto = `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();

        return res.status(200).json({
            rut: usuario.rut,
            nombre: nombreCompleto,
            rol: usuario.rol?.nombre || 'USER',
            activo: usuario.activo === 1 // Convertimos SmallInt a Boolean para el frontend
        });
    } catch (error) {
        console.error('🔥 ERROR EN ME:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener datos de sesión' });
    }
};

// 4. LOGOUT
export const logout = async (req: Request, res: Response) => {
    return res.status(200).json({ success: true, message: 'Sesión cerrada' });
};

// 5. LOGIN DEMO
export const loginDemo = async (req: Request, res: Response) => {
    return res.status(200).json({ 
        token: 'demo-token', 
        usuario: { rut: '00.000.000-0', nombre: 'Demo Local', rol: 'ADMIN' } 
    });
};

// 6. CAMBIAR PASSWORD
export const cambiarPassword = async (req: Request, res: Response) => {
    return res.status(200).json({ success: true, message: 'Funcionalidad en desarrollo' });
};