import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { verifyToken } from '../utils/security/jwt';
import { payloadAccesoDenegado, puedeAccederApp } from '../utils/usuario-acceso.util';
import { tokenVersionEnJwt } from '../utils/security/session-revocation.util';
import { extractTokenFromRequest } from '../utils/security/auth-cookie.util';
import { withDbRetry } from '../utils/db-retry.util';
import { logError, logWarn } from '../utils/logger/logger';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const token = extractTokenFromRequest(req);

    if (!token) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token faltante' });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token inválido' });
    }

    if (decoded.purpose === 'mfa') {
        return res.status(401).json({ success: false, message: 'Completa la verificación MFA' });
    }

    if (!(decoded as { rut?: string }).rut) {
        return res.status(401).json({ success: false, message: 'Token no contiene el RUT del usuario' });
    }

    try {
        const dbUser = await withDbRetry(() =>
            prisma.usuario.findUnique({
                where: { rut: (decoded as { rut: string }).rut },
                include: { rol: true, estadoVoluntario: true },
            }),
        );

        if (!dbUser) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }

        if (!puedeAccederApp(dbUser)) {
            return res.status(403).json(payloadAccesoDenegado(dbUser));
        }

        const tvToken = tokenVersionEnJwt(decoded as Record<string, unknown>);
        const tvDb = dbUser.tokenVersion ?? 0;
        if (tvToken !== tvDb) {
            logWarn('JWT revocado por tokenVersion', { rut: dbUser.rut, tvToken, tvDb });
            return res.status(401).json({
                success: false,
                message: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
                codigo: 'SESION_REVOCADA',
            });
        }

        (req as any).user = decoded;
        (req as any).dbUser = dbUser;
        next();
    } catch (error) {
        logError(error, { context: 'auth.middleware.protect' });
        return res.status(500).json({ success: false, message: 'Error interno de autenticación' });
    }
};
