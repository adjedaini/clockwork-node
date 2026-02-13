/**
 * @adjedaini/clockwork-db-interceptor
 * Optional DB query instrumentation as pluggable plugins (pg, mysql2).
 * Implements generic ClockworkPlugin from core (IPluginContext).
 */

import type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
import { patchPg } from './pg';
import { patchMysql2 } from './mysql2';

export type GetRequestId = () => string | undefined;

/** DB plugins conform to generic ClockworkPlugin. */
export const pgPlugin: ClockworkPlugin = {
  name: 'pg',
  install: (ctx: IPluginContext) => patchPg(ctx.core, ctx.getRequestId),
};

export const mysql2Plugin: ClockworkPlugin = {
  name: 'mysql2',
  install: (ctx: IPluginContext) => patchMysql2(ctx.core, ctx.getRequestId),
};

/** Default set of DB plugins (pg + mysql2). */
export const defaultDbPlugins: ClockworkPlugin[] = [pgPlugin, mysql2Plugin];

export { patchPg, patchMysql2 };
export type { ClockworkPlugin, IPluginContext } from '@adjedaini/clockwork-core';
