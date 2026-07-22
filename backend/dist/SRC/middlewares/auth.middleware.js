"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const jwt_1 = require("../utils/security/jwt");
const usuario_acceso_util_1 = require("../utils/usuario-acceso.util");
const db_retry_util_1 = require("../utils/db-retry.util");
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token faltante' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token malformado' });
    }
    const decoded = (0, jwt_1.verifyToken)(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token inválido' });
    }
    if (!decoded.rut) {
        return res.status(401).json({ success: false, message: 'Token no contiene el RUT del usuario' });
    }
    try {
        const dbUser = await (0, db_retry_util_1.withDbRetry)(() => prisma_1.default.usuario.findUnique({
            where: { rut: decoded.rut },
            include: { rol: true, estadoVoluntario: true },
        }));
        if (!dbUser) {
            return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        }
        if (!(0, usuario_acceso_util_1.puedeAccederApp)(dbUser)) {
            return res.status(403).json((0, usuario_acceso_util_1.payloadAccesoDenegado)(dbUser));
        }
        req.user = decoded;
        req.dbUser = dbUser;
        next();
    }
    catch (error) {
        console.error('🔥 ERROR EN MIDDLEWARE AUTH:', error);
        return res.status(500).json({ success: false, message: 'Error interno de autenticación' });
    }
};
exports.protect = protect;
