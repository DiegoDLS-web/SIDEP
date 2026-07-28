"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_NAME = void 0;
exports.setAuthCookie = setAuthCookie;
exports.clearAuthCookie = clearAuthCookie;
exports.extractTokenFromRequest = extractTokenFromRequest;
exports.AUTH_COOKIE_NAME = 'sidep_token';
const MAX_AGE_MS = 8 * 60 * 60 * 1000;
function setAuthCookie(res, token) {
    res.cookie(exports.AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: MAX_AGE_MS,
        path: '/',
    });
}
function clearAuthCookie(res) {
    res.clearCookie(exports.AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
}
function extractTokenFromRequest(req) {
    const fromCookie = req.cookies?.[exports.AUTH_COOKIE_NAME];
    if (typeof fromCookie === 'string' && fromCookie.trim()) {
        return fromCookie.trim();
    }
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const bearer = authHeader.slice(7).trim();
        return bearer || null;
    }
    return null;
}
