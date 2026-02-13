/**
 * Global type augmentation for Clockwork request id.
 * Reference this file for typed req.clockworkId in Express / Node.
 *
 * Usage: add to your tsconfig.json "include" or a .d.ts file:
 *   /// <reference types="@adjedaini/clockwork-node/globals" />
 */

import type { IncomingMessage } from 'http';

declare global {
  namespace Express {
    interface Request {
      /** Set by Clockwork middleware. Use with clockwork.core.captureLog(id, ...). */
      clockworkId?: string;
    }
  }
}

declare module 'http' {
  interface IncomingMessage {
    /** Set by Clockwork middleware when using Node http.createServer. */
    clockworkId?: string;
  }
}

export {};
