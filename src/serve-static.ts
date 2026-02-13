/**
 * Minimal static file server for UI.
 */

import fs from 'fs';
import path from 'path';
import type { ClockworkRequestLike, ClockworkResponseLike, NextLike } from '@adjedaini/clockwork-transport-http';

const MIMES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getPathname(req: ClockworkRequestLike): string {
  const u = req.originalUrl ?? req.url ?? req.path ?? '/';
  const q = u.indexOf('?');
  return q === -1 ? u : u.slice(0, q);
}

function sendFile(
  res: ClockworkResponseLike,
  filePath: string,
  contentType: string
): void {
  const data = fs.readFileSync(filePath);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', String(data.length));
  if (res.status) res.status(200);
  if (res.end) (res.end as (b?: string | Buffer) => void)(data);
  else if ((res as { send?: (b: Buffer) => void }).send) (res as { send: (b: Buffer) => void }).send(data);
}

function send404(res: ClockworkResponseLike): void {
  if (res.status) res.status(404);
  res.setHeader('Content-Type', 'text/plain');
  if (res.end) res.end('Not Found');
}

/**
 * Returns a middleware that serves static files from dir when pathname starts with appPath.
 * appPath is e.g. "/__clockwork/app". Serves index.html for appPath and appPath/.
 */
export function createServeStatic(
  dir: string,
  appPath: string
): (req: ClockworkRequestLike, res: ClockworkResponseLike, next: NextLike) => void {
  const normalizedApp = appPath.replace(/\/+$/, '') || '/app';
  const dirResolved = path.resolve(dir);

  return function serveStatic(req, res, next) {
    const pathname = getPathname(req);
    if (pathname !== normalizedApp && pathname !== normalizedApp + '/' && !pathname.startsWith(normalizedApp + '/')) {
      return next();
    }

    let relative = pathname.slice(normalizedApp.length).replace(/^\/+/, '') || '';
    if (relative === '' || pathname.endsWith('/')) relative = 'index.html';
    const filePath = path.join(dirResolved, relative);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(dirResolved + path.sep) && resolved !== dirResolved) {
      send404(res);
      return;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      send404(res);
      return;
    }
    const ext = path.extname(resolved);
    const contentType = MIMES[ext] ?? 'application/octet-stream';
    sendFile(res, resolved, contentType);
  };
}
