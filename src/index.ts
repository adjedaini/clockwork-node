/**
 * @adjedaini/clockwork-node
 * Public API: startClockwork(options) -> { core, middleware, handler, uiPath, registerPlugin, restore }
 */

import { MonitorCore } from '@adjedaini/clockwork-core';
import { createHttpAdapter } from '@adjedaini/clockwork-transport-http';
import type { CoreConfig, ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
import type { HttpAdapterOptions, ClockworkRequestLike, ClockworkResponseLike, NextLike } from '@adjedaini/clockwork-transport-http';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createServeStatic } from './serve-static.js';
import {
  getDefaultPlugins,
  contextPlugin,
  consolePlugin,
  processErrorsPlugin,
  pinoPlugin,
  winstonPlugin,
  defaultCorePlugins,
  defaultLogPlugins,
  defaultDbPlugins,
  pgPlugin,
  mysql2Plugin,
  type ContextPluginContext,
} from '@adjedaini/clockwork-plugins';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type { MonitorCore, CoreConfig, ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
export type { HttpAdapterOptions, ClockworkRequestLike, ClockworkResponseLike } from '@adjedaini/clockwork-transport-http';
export type { ClockworkContext } from '@adjedaini/clockwork-shared';
export {
  pgPlugin,
  mysql2Plugin,
  defaultDbPlugins,
  contextPlugin,
  consolePlugin,
  processErrorsPlugin,
  pinoPlugin,
  winstonPlugin,
  defaultCorePlugins,
  defaultLogPlugins,
  getDefaultPlugins,
};
export type { ContextPluginContext } from '@adjedaini/clockwork-plugins';

const DEFAULT_PATH = '/__clockwork';

export interface StartClockworkOptions extends HttpAdapterOptions {
  /** Core config (e.g. maxRequests). */
  core?: CoreConfig;
  /** Enable built-in UI at path + /app. Default true. */
  ui?: boolean;
  /** Override UI directory (default: package dist/public). */
  uiPath?: string;
  /** Full plugin set. When set, options below (autoConsole, autoErrors, autoDb, dbPlugins, autoLogPlugins) are ignored. */
  plugins?: ClockworkPlugin[];
  /** Intercept console.* and attach to current request. Default true. (Used when plugins not set.) */
  autoConsole?: boolean;
  /** Capture uncaughtException / unhandledRejection. Default true. (Used when plugins not set.) */
  autoErrors?: boolean;
  /** Intercept pino/winston when installed. Default false. (Used when plugins not set.) */
  autoLogPlugins?: boolean;
  /** Enable default DB plugins (pg, mysql2). Default false. (Used when plugins not set.) */
  autoDb?: boolean;
  /** DB plugins when autoDb or plugins not set. When set with autoDb, only these DB plugins are used. */
  dbPlugins?: ClockworkPlugin[];
}

export interface ClockworkInstance {
  core: MonitorCore;
  middleware: (req: ClockworkRequestLike, res: ClockworkResponseLike, next: NextLike) => void;
  handler: ReturnType<typeof createHttpAdapter>['dataHandler'];
  uiPath: string;
  /** Register any plugin (context, console, DB, log libs). Restore is tracked on instance.restore(). */
  registerPlugin: (plugin: ClockworkPlugin) => void;
  restore: () => void;
}

function getPathPrefix(p: string): string {
  return (p ?? DEFAULT_PATH).replace(/\/$/, '') || DEFAULT_PATH;
}

export function startClockwork(options: StartClockworkOptions = {}): ClockworkInstance {
  const coreConfig = options.core ?? {};
  const core = new MonitorCore(coreConfig);
  core.start();

  let getRequestIdRef: () => string | undefined = () => undefined;
  let contextRunnerRef: ((requestId: string, next: NextLike) => void) | null = null;

  const pluginContext: ContextPluginContext = {
    get core() {
      return core;
    },
    getRequestId() {
      return getRequestIdRef();
    },
    registerContext(getRequestId, contextRunner) {
      getRequestIdRef = getRequestId;
      contextRunnerRef = contextRunner;
    },
  };

  const plugins: ClockworkPlugin[] =
    options.plugins !== undefined && options.plugins.length > 0
      ? options.plugins
      : getDefaultPlugins({
          console: options.autoConsole !== false,
          errors: options.autoErrors !== false,
          logPlugins: options.autoLogPlugins === true,
          db: options.autoDb === true,
          dbPlugins: options.dbPlugins,
        });

  const restores: Array<() => void> = [];
  for (const plugin of plugins) {
    restores.push(plugin.install(pluginContext));
  }

  const contextRunner = contextRunnerRef ?? ((_: string, next: NextLike) => next());

  const pathPrefix = getPathPrefix(options.path ?? DEFAULT_PATH);
  const adapter = createHttpAdapter(core, {
    path: options.path,
    contextRunner,
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

  function registerPlugin(plugin: ClockworkPlugin): void {
    restores.push(plugin.install(pluginContext));
  }

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
    registerPlugin,
    restore() {
      restores.forEach((r) => r());
    },
  };
}

export default {
  startClockwork,
  MonitorCore,
  createHttpAdapter,
  contextPlugin,
  consolePlugin,
  processErrorsPlugin,
  pinoPlugin,
  winstonPlugin,
  pgPlugin,
  mysql2Plugin,
  defaultCorePlugins,
  defaultLogPlugins,
  defaultDbPlugins,
  getDefaultPlugins,
};
