import type { NextFunction, Request, Response } from 'express';
import { verificarToken } from '../lib/auth.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('authorization') ?? req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: token requerido' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.status(401).json({ error: 'No autorizado: token inválido' });
    return;
  }
  try {
    req.user = verificarToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'No autorizado: token expirado o inválido' });
  }
}
