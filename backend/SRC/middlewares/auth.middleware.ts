import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/security/jwt';

export const protect = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token faltante' });
    }

    // Aquí está el cambio: extraemos y validamos
    const tokenParts = authHeader.split(' ');
    const token = tokenParts[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token malformado' });
    }

    // Ahora TypeScript sabe que 'token' es un string seguro
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token inválido' });
    }

    (req as any).user = decoded;
    next();
};