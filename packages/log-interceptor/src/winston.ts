/**
 * Winston plugin: intercepts winston logger output and attaches to current request.
 * Only applied if the 'winston' module is installed.
 */

import type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
import type { LogData } from '@adjedaini/clockwork-shared';

const LEVEL_MAP: Record<string, LogData['level']> = {
  error: 'error',
  warn: 'warning',
  warning: 'warning',
  info: 'info',
  http: 'info',
  verbose: 'debug',
  debug: 'debug',
  silly: 'debug',
};

function wrapWinston(ctx: IPluginContext): () => void {
  let winstonId: string;
  try {
    winstonId = require.resolve('winston');
  } catch {
    return () => {};
  }
  const mod = require.cache[winstonId] as { exports: { createLogger?: (opts?: unknown) => WinstonLogger } } | undefined;
  if (!mod?.exports?.createLogger) return () => {};

  const winston = mod.exports;
  const originalCreateLogger = winston.createLogger!.bind(winston);

  winston.createLogger = function (opts?: unknown) {
    const logger = originalCreateLogger(opts) as WinstonLogger;
    const origLog = logger.log?.bind(logger);
    if (typeof origLog !== 'function') return logger;

    logger.log = function (this: WinstonLogger, levelOrMeta: string | object, msg?: string | (() => void), ...args: unknown[]) {
      const requestId = ctx.getRequestId();
      if (requestId) {
        const level = typeof levelOrMeta === 'string' ? levelOrMeta : 'info';
        const message = typeof msg === 'string' ? msg : (typeof levelOrMeta === 'object' && levelOrMeta !== null && 'message' in levelOrMeta)
          ? String((levelOrMeta as { message?: unknown }).message)
          : String(msg ?? levelOrMeta);
        const levelMapped = LEVEL_MAP[level] ?? 'info';
        ctx.core.captureNativeLog(requestId, levelMapped, message, undefined);
      }
      return origLog(levelOrMeta as string, msg as string, ...args);
    };

    return logger;
  };

  return function restore() {
    winston.createLogger = originalCreateLogger;
  };
}

interface WinstonLogger {
  log?(level: string, msg: string, ...args: unknown[]): unknown;
}

export const winstonPlugin: ClockworkPlugin = {
  name: 'winston',
  install: wrapWinston,
};
