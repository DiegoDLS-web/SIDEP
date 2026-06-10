import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

export const requireRoles = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user || !user.rut) {
                return res.status(401).json({ success: false, message: 'No autorizado: Usuario no autenticado' });
            }

            // Consultar en la base de datos para máxima seguridad (cambios de rol o desactivación en tiempo real)
            const dbUser = await prisma.usuario.findUnique({
                where: { rut: user.rut },
                include: { rol: true }
            });

            if (!dbUser) {
                return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
            }

            if (dbUser.activo !== 1) {
                return res.status(403).json({ success: false, message: 'Usuario inactivo' });
            }

            const userRole = dbUser.rol?.codigo || '';
            
            // Compara en mayúsculas
            const isAllowed = allowedRoles.some(role => 
                userRole.toUpperCase() === role.toUpperCase()
            );

            if (!isAllowed) {
                return res.status(403).json({ success: false, message: 'Acceso denegado: Rol insuficiente' });
            }

            // Guardamos el usuario de BD por si se necesita más adelante
            (req as any).dbUser = dbUser;

            next();
        } catch (error) {
            console.error('🔥 ERROR EN MIDDLEWARE DE ROLES:', error);
            return res.status(500).json({ success: false, message: 'Error interno de autenticación de roles' });
        }
    };
};
