"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const auth_js_1 = require("../lib/auth.js");
function requireAuth(req, res, next) {
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
        req.user = (0, auth_js_1.verificarToken)(token);
        next();
    }
    catch {
        res.status(401).json({ error: 'No autorizado: token expirado o inválido' });
    }
}
//# sourceMappingURL=auth.js.map