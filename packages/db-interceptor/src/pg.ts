/**
 * Patch pg Client.query so queries are attached to the current request (when in context).
 * Only applied if the 'pg' module is installed.
 */

import type { MonitorCore } from '@adjedaini/clockwork-core';

export type GetRequestId = () => string | undefined;

let restored = false;

export function patchPg(core: MonitorCore, getRequestId: GetRequestId): () => void {
  let pg: { Client?: { prototype: { query: (...args: unknown[]) => unknown } } } | null = null;
  try {
    pg = require('pg');
  } catch {
    return () => {};
  }
  if (!pg?.Client?.prototype?.query) return () => {};
  if (restored) return () => {};

  const Client = pg.Client!;
  const originalQuery = Client.prototype.query;

  Client.prototype.query = function (this: unknown, ...args: unknown[]) {
    const start = performance.now();
    const firstArg = args[0];
    const queryText = typeof firstArg === 'string' ? firstArg : (firstArg as { text?: string })?.text ?? String(firstArg);
    const bindings = typeof firstArg === 'object' && firstArg !== null && 'values' in firstArg
      ? (firstArg as { values?: unknown[] }).values
      : undefined;

    const result = originalQuery.apply(this, args);
    const onDone = () => {
      const duration = performance.now() - start;
      const requestId = getRequestId();
      if (requestId) {
        core.addQuery(requestId, {
          query: queryText,
          bindings,
          duration,
          connection: 'pg',
        });
      }
    };
    if (result && typeof (result as { then?: unknown }).then === 'function') (result as Promise<unknown>).finally(onDone);
    else setTimeout(onDone, 0);
    return result;
  };

  return function restore() {
    if (Client.prototype.query === originalQuery) return;
    Client.prototype.query = originalQuery;
    restored = true;
  };
}
