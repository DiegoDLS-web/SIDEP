import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/security/jwt';

export const protect = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token faltante' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token malformado' });
    }

    // El token debe haber sido firmado con el { rut: '...' } en el payload
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token inválido' });
    }

    // VALIDACIÓN CRÍTICA: Aseguramos que el token contenga el rut
    // Si tu token aún guarda 'id' en lugar de 'rut', esto fallará.
    if (!(decoded as any).rut) {
        return res.status(401).json({ success: false, message: 'Token no contiene el RUT del usuario' });
    }

    (req as any).user = decoded;
    next();
};