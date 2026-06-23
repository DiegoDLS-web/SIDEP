import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { verifyToken } from '../utils/security/jwt';
import { payloadAccesoDenegado, puedeAccederApp } from '../utils/usuario-acceso.util';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token faltante' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token malformado' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token inválido' });
    }

    if (!(decoded as { rut?: string }).rut) {
        return res.status(401).json({ success: false, message: 'Token no contiene el RUT del usuario' });
    }

    try {
        const dbUser = await prisma.usuario.findUnique({
            where: { rut: (decoded as { rut: string }).rut },
            include: { rol: true, estadoVoluntario: true },
        });

        if (!dbUser) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        if (!puedeAccederApp(dbUser)) {
            return res.status(403).json(payloadAccesoDenegado(dbUser));
        }

        (req as any).user = decoded;
        (req as any).dbUser = dbUser;
        next();
    } catch (error) {
        console.error('🔥 ERROR EN MIDDLEWARE AUTH:', error);
        return res.status(500).json({ success: false, message: 'Error interno de autenticación' });
    }
};
