import type { NextFunction, Request, Response } from 'express';

export function requireRoles(...rolesPermitidos: string[]) {
  const permitidos = new Set(rolesPermitidos.map((r) => r.trim().toUpperCase()));
  return (req: Request, res: Response, next: NextFunction): void => {
    const rol = req.user?.rol?.toUpperCase();
    if (!rol) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    if (!permitidos.has(rol)) {
      res.status(403).json({ error: 'Acceso denegado por rol' });
      return;
    }
    next();
  };
}
