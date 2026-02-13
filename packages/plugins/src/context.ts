/**
 * Context plugin: provides AsyncLocalStorage and request-scoped getRequestId.
 * Must be installed first so other plugins receive a working getRequestId.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
import type { ClockworkContext } from '@adjedaini/clockwork-shared';
import type { NextLike } from '@adjedaini/clockwork-transport-http';

/** Extended context that allows the context plugin to register getRequestId and runner. */
export interface ContextPluginContext extends IPluginContext {
  registerContext(
    getRequestId: () => string | undefined,
    contextRunner: (requestId: string, next: NextLike) => void
  ): void;
}

export const contextPlugin: ClockworkPlugin = {
  name: 'context',
  install(ctx: ContextPluginContext): () => void {
    const storage = new AsyncLocalStorage<ClockworkContext>();
    const getRequestId = (): string | undefined => storage.getStore()?.requestId;
    const contextRunner = (requestId: string, next: NextLike): void => {
      storage.run({ requestId }, next);
    };
    ctx.registerContext(getRequestId, contextRunner);
    return () => {};
  },
};
