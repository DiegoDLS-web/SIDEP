"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const jwt_1 = require("../utils/security/jwt");
const usuario_acceso_util_1 = require("../utils/usuario-acceso.util");
const session_revocation_util_1 = require("../utils/security/session-revocation.util");
const auth_cookie_util_1 = require("../utils/security/auth-cookie.util");
const db_retry_util_1 = require("../utils/db-retry.util");
const logger_1 = require("../utils/logger/logger");
const protect = async (req, res, next) => {
    const token = (0, auth_cookie_util_1.extractTokenFromRequest)(req);
    if (!token) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token faltante' });
    }
    const decoded = (0, jwt_1.verifyToken)(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: 'No autorizado: Token inválido' });
    }
    if (decoded.purpose === 'mfa') {
        return res.status(401).json({ success: false, message: 'Completa la verificación MFA' });
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
        const tvToken = (0, session_revocation_util_1.tokenVersionEnJwt)(decoded);
        const tvDb = dbUser.tokenVersion ?? 0;
        if (tvToken !== tvDb) {
            (0, logger_1.logWarn)('JWT revocado por tokenVersion', { rut: dbUser.rut, tvToken, tvDb });
            return res.status(401).json({
                success: false,
                message: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
                codigo: 'SESION_REVOCADA',
            });
        }
        req.user = decoded;
        req.dbUser = dbUser;
        next();
    }
    catch (error) {
        (0, logger_1.logError)(error, { context: 'auth.middleware.protect' });
        return res.status(500).json({ success: false, message: 'Error interno de autenticación' });
    }
};
exports.protect = protect;
