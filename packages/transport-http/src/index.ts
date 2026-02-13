/**
 * @adjedaini/clockwork-transport-http
 * HTTP adapter: wraps core, exposes middleware + data handler.
 * No hard dependency on Express types.
 */

import type { MonitorCore } from '@adjedaini/clockwork-core';
import type {
  ClockworkRequestLike,
  ClockworkResponseLike,
  NextLike,
} from './types';
import { sanitizeHeaders, sanitizeBody } from './sanitize';

export type { ClockworkRequestLike, ClockworkResponseLike, NextLike } from './types.js';

export interface HttpAdapterOptions {
  /** Base path for API and UI (e.g. "/__clockwork"). No trailing slash. */
  path?: string;
  /** Max request list returned by snapshot. */
  snapshotLimit?: number;
  /** Redact these keys in headers/body. */
  redactKeys?: string[];
  /** Max body size to capture (chars). */
  maxBodySize?: number;
  /** Max depth when serializing body. */
  maxBodyDepth?: number;
  /** Capture request body. */
  captureRequestBody?: boolean;
  /** Capture response body. */
  captureResponseBody?: boolean;
  /** Skip paths that start with any of these. */
  ignoreStartsWith?: string[];
}

const DEFAULT_PATH = '/__clockwork';
const DEFAULT_REDACT_KEYS = [
  'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token',
  'password', 'passwd', 'secret', 'token', 'access_token', 'refresh_token',
];

export interface HttpAdapter {
  /** Middleware: capture request, call next(), finalize on res finish. */
  middleware(
    req: ClockworkRequestLike,
    res: ClockworkResponseLike,
    next: NextLike
  ): void;
  /** Handler: serve JSON API (snapshot, by id). Call for GET path, path/latest, path/:id. */
  dataHandler(req: ClockworkRequestLike, res: ClockworkResponseLike): void;
}

function getPathPrefix(path: string): string {
  return path.replace(/\/$/, '') || DEFAULT_PATH;
}

function getMethod(req: ClockworkRequestLike): string {
  return (req.method || 'GET').toUpperCase();
}

function getUri(req: ClockworkRequestLike): string {
  return req.originalUrl ?? req.url ?? req.path ?? '/';
}

function getPathname(req: ClockworkRequestLike): string {
  const u = req.originalUrl ?? req.url ?? req.path ?? '/';
  const q = u.indexOf('?');
  return q === -1 ? u : u.slice(0, q);
}

export function createHttpAdapter(
  core: MonitorCore,
  options: HttpAdapterOptions = {}
): HttpAdapter {
  const pathPrefix = getPathPrefix(options.path ?? DEFAULT_PATH);
  const snapshotLimit = options.snapshotLimit ?? 50;
  const redactKeys = options.redactKeys ?? DEFAULT_REDACT_KEYS;
  const maxBodySize = options.maxBodySize ?? 10000;
  const maxBodyDepth = options.maxBodyDepth ?? 10;
  const captureRequestBody = options.captureRequestBody ?? true;
  const captureResponseBody = options.captureResponseBody ?? true;
  const ignoreStartsWith = options.ignoreStartsWith ?? [];

  const sanitizeOpts = { redactKeys, maxLength: maxBodySize, maxDepth: maxBodyDepth };

  function shouldIgnore(pathname: string): boolean {
    return ignoreStartsWith.some((p) => pathname.startsWith(p));
  }

  function isClockworkPath(pathname: string): boolean {
    return pathname === pathPrefix || pathname.startsWith(pathPrefix + '/');
  }

  function sendJson(res: ClockworkResponseLike, body: unknown, statusCode?: number): void {
    const payload = JSON.stringify(body);
    if (statusCode != null && res.status) {
      const r = res.status(statusCode);
      if (r.json) r.json(body);
      else r.end?.(payload);
    } else if (res.json) {
      res.json(body);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.end?.(payload);
    }
  }

  const dataHandler: HttpAdapter['dataHandler'] = (req, res) => {
    const pathname = getPathname(req);
    if (!isClockworkPath(pathname)) {
      if (res.status) res.status(404).end?.('Not found');
      else { res.setHeader('Content-Type', 'text/plain'); res.end?.('Not found'); }
      return;
    }

    const relative = pathname.slice(pathPrefix.length).replace(/^\/+/, '') || 'index';
    const segments = relative.split('/');

    // GET /__clockwork -> snapshot (requests list)
    if (segments[0] === 'index' || segments[0] === '') {
      sendJson(res, core.getSnapshot(snapshotLimit));
      return;
    }

    // GET /__clockwork/metrics -> metrics only
    if (segments[0] === 'metrics') {
      const snapshot = core.getSnapshot(1);
      sendJson(res, snapshot.metrics ?? { timestamp: Date.now() / 1000, spans: [] });
      return;
    }

    // GET /__clockwork/latest -> latest request
    if (segments[0] === 'latest') {
      const snapshot = core.getSnapshot(1);
      const reqs = snapshot.requests;
      if (reqs.length === 0) {
        sendJson(res, { error: 'No requests found' }, 404);
        return;
      }
      const latest = core.getRequest(reqs[0].id);
      sendJson(res, latest ?? {});
      return;
    }

    // GET /__clockwork/:id -> single request
    const id = segments[0];
    const request = core.getRequest(id);
    if (!request) {
      sendJson(res, { error: 'Request not found' }, 404);
      return;
    }
    sendJson(res, request);
  };

  const middleware: HttpAdapter['middleware'] = (req, res, next) => {
    const pathname = getPathname(req);
    if (isClockworkPath(pathname)) {
      dataHandler(req, res);
      return;
    }
    if (shouldIgnore(pathname)) {
      next();
      return;
    }

    const headers = sanitizeHeaders(
      req.headers as Record<string, unknown>,
      { redactKeys, maxValueLength: 500 }
    );
    const getData = (req.query ?? {}) as Record<string, unknown>;
    const postData =
      captureRequestBody && req.body !== undefined
        ? sanitizeBody(req.body, sanitizeOpts)
        : undefined;
    const cookies =
      req.cookies !== undefined
        ? sanitizeHeaders(req.cookies as Record<string, unknown>, { redactKeys })
        : undefined;

    const requestId = core.captureRequest({
      method: getMethod(req),
      uri: getUri(req),
      headers,
      getData: sanitizeBody(getData, sanitizeOpts) as Record<string, unknown>,
      postData,
      cookies,
      controller: req.route?.path,
    });
    const startTimeMs = Date.now();
    let capturedResponseBody: unknown = undefined;

    const setHeader = res.setHeader.bind(res);
    res.setHeader = function (name: string, value: string | number) {
      if (!(res as { headersSent?: boolean }).headersSent) {
        if (name.toLowerCase() === 'x-clockwork-id') {
          setHeader('X-Clockwork-Id', String(value));
        } else if (name.toLowerCase() === 'x-clockwork-version') {
          setHeader('X-Clockwork-Version', '2.0');
        } else if (name.toLowerCase() === 'x-clockwork-path') {
          setHeader('X-Clockwork-Path', `${pathPrefix}/${value}`);
        }
      }
      return setHeader(name, value);
    };

    const originalSend = res.send;
    const originalJson = res.json;
    if (originalSend) {
      res.send = function (body?: unknown) {
        if (!(res as { headersSent?: boolean }).headersSent) {
          res.setHeader('X-Clockwork-Id', requestId);
          res.setHeader('X-Clockwork-Version', '2.0');
          res.setHeader('X-Clockwork-Path', `${pathPrefix}/${requestId}`);
        }
        if (captureResponseBody && body !== undefined) {
          try {
            const str = typeof body === 'string' ? body : JSON.stringify(body);
            capturedResponseBody =
              str.length <= maxBodySize ? (typeof body === 'string' ? body : body) : str.slice(0, maxBodySize) + '...[truncated]';
          } catch {
            capturedResponseBody = '[unserializable]';
          }
        }
        return originalSend.call(this, body);
      };
    }
    if (originalJson) {
      res.json = function (body?: unknown) {
        if (!(res as { headersSent?: boolean }).headersSent) {
          res.setHeader('X-Clockwork-Id', requestId);
          res.setHeader('X-Clockwork-Version', '2.0');
          res.setHeader('X-Clockwork-Path', `${pathPrefix}/${requestId}`);
        }
        if (captureResponseBody && body !== undefined) {
          try {
            const str = JSON.stringify(body);
            capturedResponseBody =
              str.length <= maxBodySize ? body : str.slice(0, maxBodySize) + '...[truncated]';
          } catch {
            capturedResponseBody = '[unserializable]';
          }
        }
        return originalJson.call(this, body);
      };
    }

    res.on('finish', () => {
      const statusCode =
        typeof (res as { statusCode?: number }).statusCode === 'number'
          ? (res as { statusCode: number }).statusCode
          : 200;
      const duration = Date.now() - startTimeMs;
      core.finalizeRequest(requestId, {
        responseStatus: statusCode,
        responseDuration: duration,
        responseData:
          capturedResponseBody !== undefined
            ? sanitizeBody(capturedResponseBody, sanitizeOpts)
            : undefined,
      });
    });

    (req as { clockworkId?: string }).clockworkId = requestId;
    next();
  };

  return { middleware, dataHandler };
}
