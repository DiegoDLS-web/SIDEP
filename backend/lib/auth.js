"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.firmarToken = firmarToken;
exports.verificarToken = verificarToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'sidep_dev_secret_change_me';
const JWT_EXP_SECONDS = Number(process.env.JWT_EXP_SECONDS || 60 * 60 * 12);
function firmarToken(payload) {
    const exp = Math.floor(Date.now() / 1000) + JWT_EXP_SECONDS;
    return jsonwebtoken_1.default.sign({ ...payload, exp }, JWT_SECRET);
}
function verificarToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
//# sourceMappingURL=auth.js.map