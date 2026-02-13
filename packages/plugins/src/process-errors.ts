/**
 * Process errors plugin: captures uncaughtException and unhandledRejection.
 */

import type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';

function patchProcessErrors(core: IPluginContext['core'], getRequestId: () => string | undefined): () => void {
  const onUncaught = (err: Error) => {
    const requestId = getRequestId();
    core.captureError(err, requestId);
  };

  const onRejection = (reason: unknown) => {
    const requestId = getRequestId();
    const err = reason instanceof Error ? reason : new Error(String(reason));
    core.captureError(err, requestId);
  };

  process.on('uncaughtException', onUncaught);
  process.on('unhandledRejection', onRejection);

  return function restore() {
    process.off('uncaughtException', onUncaught);
    process.off('unhandledRejection', onRejection);
  };
}

export const processErrorsPlugin: ClockworkPlugin = {
  name: 'processErrors',
  install(ctx: IPluginContext): () => void {
    return patchProcessErrors(ctx.core, ctx.getRequestId);
  },
};
