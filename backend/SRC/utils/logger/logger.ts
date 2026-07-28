export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
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

export function logInfo(message: string, meta?: LogMeta): void {
  emit('info', message, meta);
}

export function logWarn(message: string, meta?: LogMeta): void {
  emit('warn', message, meta);
}

export function logError(error: unknown, meta?: LogMeta): void {
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

export function logDebug(message: string, meta?: LogMeta): void {
  if (process.env.NODE_ENV === 'production' && process.env.LOG_DEBUG !== '1') {
    return;
  }
  emit('debug', message, meta);
}
