/**
 * Patch mysql2 so Connection.query/execute are tracked. Only applied if 'mysql2' is installed.
 * Wraps createConnection to patch the returned connection.
 */

import type { MonitorCore } from '@adjedaini/clockwork-core';

export type GetRequestId = () => string | undefined;

export function patchMysql2(core: MonitorCore, getRequestId: GetRequestId): () => void {
  let mysql2: { createConnection: (opts?: unknown) => Connection } | null = null;
  try {
    mysql2 = require('mysql2');
  } catch {
    return () => {};
  }
  if (!mysql2?.createConnection) return () => {};

  interface Connection {
    query: (sql: unknown, ...args: unknown[]) => unknown;
    execute?: (sql: unknown, ...args: unknown[]) => unknown;
  }

  const originalCreateConnection = mysql2.createConnection.bind(mysql2);

  function wrapQuery(conn: Connection): void {
    const origQuery = conn.query;
    const origExecute = conn.execute;
    if (typeof origQuery === 'function') {
      conn.query = function (this: Connection, sql: unknown, ...args: unknown[]) {
        const start = performance.now();
        const queryText = typeof sql === 'string' ? sql : String(sql);
        const bindings = Array.isArray(args[0]) ? args[0] : undefined;
        const result = (origQuery as Function).apply(this, [sql, ...args]);
        const onDone = () => {
          const requestId = getRequestId();
          if (requestId) {
            core.addQuery(requestId, {
              query: queryText,
              bindings,
              duration: performance.now() - start,
              connection: 'mysql2',
            });
          }
        };
        if (result?.then) (result as Promise<unknown>).finally(onDone);
        else setTimeout(onDone, 0);
        return result;
      };
    }
    if (typeof origExecute === 'function') {
      conn.execute = function (this: Connection, sql: unknown, ...args: unknown[]) {
        const start = performance.now();
        const queryText = typeof sql === 'string' ? sql : String(sql);
        const bindings = Array.isArray(args[0]) ? args[0] : undefined;
        const result = (origExecute as Function).apply(this, [sql, ...args]);
        const onDone = () => {
          const requestId = getRequestId();
          if (requestId) {
            core.addQuery(requestId, {
              query: queryText,
              bindings,
              duration: performance.now() - start,
              connection: 'mysql2',
            });
          }
        };
        if (result?.then) (result as Promise<unknown>).finally(onDone);
        else setTimeout(onDone, 0);
        return result;
      };
    }
  }

  (mysql2 as { createConnection: (opts?: unknown) => Connection }).createConnection = function (opts?: unknown) {
    const conn = originalCreateConnection(opts) as Connection;
    wrapQuery(conn);
    return conn;
  };

  return function restore() {
    (mysql2 as { createConnection: (opts?: unknown) => Connection }).createConnection = originalCreateConnection;
  };
}
