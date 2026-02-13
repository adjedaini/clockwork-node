/**
 * Pino plugin: intercepts pino logger output and attaches to current request.
 * Only applied if the 'pino' module is installed.
 */

import type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
import type { LogData } from '@adjedaini/clockwork-shared';

const LEVEL_MAP: Record<string, LogData['level']> = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  warning: 'warning',
  error: 'error',
  fatal: 'error',
};

function wrapPino(ctx: IPluginContext): () => void {
  let pinoId: string;
  try {
    pinoId = require.resolve('pino');
  } catch {
    return () => {};
  }
  const mod = require.cache[pinoId] as { exports: (opts?: unknown) => PinoLogger } | undefined;
  if (!mod?.exports || typeof mod.exports !== 'function') return () => {};

  const original = mod.exports;

  function wrapLogger(logger: PinoLogger): PinoLogger {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
    const wrapped = { ...logger };
    for (const level of levels) {
      const orig = logger[level];
      if (typeof orig !== 'function') continue;
      (wrapped as Record<string, unknown>)[level] = function (this: PinoLogger, ...args: unknown[]) {
        const requestId = ctx.getRequestId();
        if (requestId) {
          const msg = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0] ?? '');
          const levelMapped = LEVEL_MAP[level] ?? 'info';
          ctx.core.captureNativeLog(requestId, levelMapped, msg, undefined);
        }
        return (orig as (...a: unknown[]) => unknown).apply(this, args);
      };
    }
    if (typeof logger.child === 'function') {
      const origChild = logger.child.bind(logger);
      wrapped.child = function (bindings: unknown) {
        return wrapLogger(origChild(bindings));
      };
    }
    return wrapped as PinoLogger;
  }

  mod.exports = function (opts?: unknown) {
    return wrapLogger(original(opts));
  };

  return function restore() {
    mod.exports = original;
  };
}

interface PinoLogger {
  trace?(...args: unknown[]): void;
  debug?(...args: unknown[]): void;
  info?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
  fatal?(...args: unknown[]): void;
  child?(bindings: unknown): PinoLogger;
}

export const pinoPlugin: ClockworkPlugin = {
  name: 'pino',
  install: wrapPino,
};
