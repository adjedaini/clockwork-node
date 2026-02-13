/**
 * Console plugin: intercepts console.* (native log) and attaches to current request.
 */

import type { MonitorCore } from '@adjedaini/clockwork-core';
import type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;
type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function patchConsole(core: MonitorCore, getRequestId: () => string | undefined): () => void {
  const original: Partial<Record<ConsoleMethod, (...args: unknown[]) => void>> = {};
  for (const method of CONSOLE_METHODS) {
    const orig = console[method];
    if (typeof orig === 'function') {
      original[method] = orig.bind(console);
    }
  }

  const levelMap: Record<ConsoleMethod, 'debug' | 'info' | 'warning' | 'error'> = {
    log: 'info',
    info: 'info',
    warn: 'warning',
    error: 'error',
    debug: 'debug',
  };

  for (const method of CONSOLE_METHODS) {
    const orig = original[method];
    if (typeof orig !== 'function') continue;

    (console as unknown as Record<string, (...args: unknown[]) => void>)[method] = function (...args: unknown[]) {
      const requestId = getRequestId();
      if (requestId) {
        const message = formatArgs(args);
        const level = levelMap[method];
        core.captureNativeLog(requestId, level, message, undefined);
      }
      return orig.apply(console, args);
    };
  }

  return function restore() {
    for (const method of CONSOLE_METHODS) {
      if (original[method]) {
        (console as unknown as Record<string, (...args: unknown[]) => void>)[method] = original[method]!;
      }
    }
  };
}

export const consolePlugin: ClockworkPlugin = {
  name: 'console',
  install(ctx: IPluginContext): () => void {
    return patchConsole(ctx.core, ctx.getRequestId);
  },
};
