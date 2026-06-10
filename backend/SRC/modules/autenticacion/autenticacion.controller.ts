import { Request, Response } from 'express';
import { loginUsuario, registrarUsuario } from './autenticacion.service';
import prisma from '../../prisma'; 
import { validarRut } from '../../utils/rut.util';

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
        const userRut = (req as any).user.rut; 
        
        const usuario = await prisma.usuario.findUnique({
            where: { rut: userRut },
            include: { rol: true } 
        });

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const nombreCompleto = `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();

        return res.status(200).json({
            id: parseInt(usuario.rut.replace(/[^0-9]/g, ''), 10) || 0,
            rut: usuario.rut,
            nombre: nombreCompleto,
            rol: usuario.rol?.codigo || 'USER',
            email: usuario.email,
            activo: usuario.activo === 1
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