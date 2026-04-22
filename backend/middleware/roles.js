"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = requireRoles;
function requireRoles(...rolesPermitidos) {
    const permitidos = new Set(rolesPermitidos.map((r) => r.trim().toUpperCase()));
    return (req, res, next) => {
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
//# sourceMappingURL=roles.js.map