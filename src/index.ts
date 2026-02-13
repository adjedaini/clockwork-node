/**
 * @adjedaini/clockwork-node
 * Public API: startClockwork(options) -> { core, middleware, handler, uiPath }
 */

import { MonitorCore } from '@adjedaini/clockwork-core';
import { createHttpAdapter } from '@adjedaini/clockwork-transport-http';
import type { CoreConfig } from '@adjedaini/clockwork-core';
import type { HttpAdapterOptions, ClockworkRequestLike, ClockworkResponseLike, NextLike } from '@adjedaini/clockwork-transport-http';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createServeStatic } from './serve-static.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type { MonitorCore, CoreConfig } from '@adjedaini/clockwork-core';
export type { HttpAdapterOptions, ClockworkRequestLike, ClockworkResponseLike } from '@adjedaini/clockwork-transport-http';

const DEFAULT_PATH = '/__clockwork';

export interface startClockworkOptions extends HttpAdapterOptions {
  /** Core config (e.g. maxRequests). */
  core?: CoreConfig;
  /** Enable built-in UI at path + /app. Default true. */
  ui?: boolean;
  /** Override UI directory (default: package dist/public). */
  uiPath?: string;
}

export interface ClockworkInstance {
  /** Framework-agnostic monitoring core. */
  core: MonitorCore;
  /** Connect-style middleware: serves API + UI (if enabled), then captures requests. Use once in your app. */
  middleware: (req: ClockworkRequestLike, res: ClockworkResponseLike, next: NextLike) => void;
  /** Data API handler for GET /__clockwork, /__clockwork/:id, etc. */
  handler: ReturnType<typeof createHttpAdapter>['dataHandler'];
  /** Absolute path to built UI directory (for reference or custom serving). */
  uiPath: string;
}

function getPathPrefix(p: string): string {
  return (p ?? DEFAULT_PATH).replace(/\/$/, '') || DEFAULT_PATH;
}

/**
 * Create a Clockwork instance. Use middleware in your app; it serves the API, optional UI, and captures requests.
 */
export function startClockwork(options: startClockworkOptions = {}): ClockworkInstance {
  const coreConfig = options.core ?? {};
  const core = new MonitorCore(coreConfig);
  core.start();

  const pathPrefix = getPathPrefix(options.path ?? DEFAULT_PATH);
  const adapter = createHttpAdapter(core, {
    path: options.path,
    snapshotLimit: options.snapshotLimit,
    redactKeys: options.redactKeys,
    maxBodySize: options.maxBodySize,
    maxBodyDepth: options.maxBodyDepth,
    captureRequestBody: options.captureRequestBody,
    captureResponseBody: options.captureResponseBody,
    ignoreStartsWith: options.ignoreStartsWith,
  });

  const uiPath = options.uiPath ?? path.join(__dirname, 'public');
  const uiEnabled = options.ui !== false;

  const serveUi = uiEnabled ? createServeStatic(uiPath, pathPrefix + '/app') : null;

  const middleware = (req: ClockworkRequestLike, res: ClockworkResponseLike, next: NextLike) => {
    if (serveUi) {
      serveUi(req, res, () => adapter.middleware(req, res, next));
    } else {
      adapter.middleware(req, res, next);
    }
  };

  return {
    core,
    middleware,
    handler: adapter.dataHandler,
    uiPath,
  };
}

export default {
  startClockwork,
  MonitorCore,
  createHttpAdapter,
};
