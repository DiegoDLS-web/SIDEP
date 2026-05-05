import type { NextFunction, Request, Response } from 'express';
export declare function requireRoles(...rolesPermitidos: string[]): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=roles.d.ts.map