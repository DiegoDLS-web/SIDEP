"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const usuario_acceso_util_1 = require("../utils/usuario-acceso.util");
const requireRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user || !user.rut) {
                return res.status(401).json({ success: false, message: 'No autorizado: Usuario no autenticado' });
            }
            const dbUser = req.dbUser ??
                (await prisma_1.default.usuario.findUnique({
                    where: { rut: user.rut },
                    include: { rol: true, estadoVoluntario: true },
                }));
            if (!dbUser) {
                return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
            }
            if (!(0, usuario_acceso_util_1.puedeAccederApp)(dbUser)) {
                return res.status(403).json((0, usuario_acceso_util_1.payloadAccesoDenegado)(dbUser));
            }
            const userRole = dbUser.rol?.codigo || '';
            // Compara en mayúsculas
            const isAllowed = allowedRoles.some(role => userRole.toUpperCase() === role.toUpperCase());
            if (!isAllowed) {
                return res.status(403).json({ success: false, message: 'Acceso denegado: Rol insuficiente' });
            }
            // Guardamos el usuario de BD por si se necesita más adelante
            req.dbUser = dbUser;
            next();
        }
        catch (error) {
            console.error('🔥 ERROR EN MIDDLEWARE DE ROLES:', error);
            return res.status(500).json({ success: false, message: 'Error interno de autenticación de roles' });
        }
    };
};
exports.requireRoles = requireRoles;
