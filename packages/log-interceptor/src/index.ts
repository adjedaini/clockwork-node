/**
 * @adjedaini/clockwork-log-interceptor
 * Optional log library instrumentation (pino, winston). Implements ClockworkPlugin.
 */

import type { ClockworkPlugin } from '@adjedaini/clockwork-core';
import { pinoPlugin } from './pino';
import { winstonPlugin } from './winston';

export { pinoPlugin, winstonPlugin };

export const defaultLogPlugins: ClockworkPlugin[] = [pinoPlugin, winstonPlugin];

export type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
