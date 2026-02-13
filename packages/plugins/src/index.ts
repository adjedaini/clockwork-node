/**
 * @adjedaini/clockwork-plugins
 * Built-in plugins (context, console, process-errors) and default plugin composition.
 */

import type { ClockworkPlugin } from '@adjedaini/clockwork-core';
import { contextPlugin } from './context';
import { consolePlugin } from './console';
import { processErrorsPlugin } from './process-errors';
import { defaultLogPlugins } from '@adjedaini/clockwork-log-interceptor';
import { defaultDbPlugins } from '@adjedaini/clockwork-db-interceptor';

export type { ContextPluginContext } from './context';

export { contextPlugin, consolePlugin, processErrorsPlugin };
export { pinoPlugin, winstonPlugin, defaultLogPlugins } from '@adjedaini/clockwork-log-interceptor';
export { pgPlugin, mysql2Plugin, defaultDbPlugins } from '@adjedaini/clockwork-db-interceptor';

/** Context + console + processErrors. Context must be first. */
export const defaultCorePlugins: ClockworkPlugin[] = [
  contextPlugin,
  consolePlugin,
  processErrorsPlugin,
];

/** Build default plugin list from options. */
export function getDefaultPlugins(options: {
  console?: boolean;
  errors?: boolean;
  logPlugins?: boolean;
  db?: boolean;
  dbPlugins?: ClockworkPlugin[];
}): ClockworkPlugin[] {
  const {
    console: enableConsole = true,
    errors: enableErrors = true,
    logPlugins: enableLogPlugins = false,
    db: enableDb = false,
    dbPlugins = [],
  } = options;

  const list: ClockworkPlugin[] = [contextPlugin];
  if (enableConsole) list.push(consolePlugin);
  if (enableErrors) list.push(processErrorsPlugin);
  if (enableLogPlugins) list.push(...defaultLogPlugins);
  if (enableDb && dbPlugins.length === 0) list.push(...defaultDbPlugins);
  else if (dbPlugins.length > 0) list.push(...dbPlugins);

  return list;
}
