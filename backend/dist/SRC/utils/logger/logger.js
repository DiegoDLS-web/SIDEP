"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
exports.logDebug = logDebug;
function emit(level, message, meta) {
    const payload = {
        ts: new Date().toISOString(),
        level,
        service: 'sidep-api',
        message,
        ...(meta && Object.keys(meta).length ? { meta } : {}),
    };
    const line = JSON.stringify(payload);
    if (level === 'error') {
        console.error(line);
        return;
    }
    if (level === 'warn') {
        console.warn(line);
        return;
    }
    console.log(line);
}
function logInfo(message, meta) {
    emit('info', message, meta);
}
function logWarn(message, meta) {
    emit('warn', message, meta);
}
function logError(error, meta) {
    if (error instanceof Error) {
        emit('error', error.message, {
            ...meta,
            stack: error.stack,
            name: error.name,
        });
        return;
    }
    emit('error', String(error), meta);
}
function logDebug(message, meta) {
    if (process.env.NODE_ENV === 'production' && process.env.LOG_DEBUG !== '1') {
        return;
    }
    emit('debug', message, meta);
}
