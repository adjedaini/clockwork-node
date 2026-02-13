/**
 * Minimal HTTP request/response-like types.
 * No hard dependency on Express; compatible with Express, Fastify (with adapters), etc.
 */

export interface ClockworkRequestLike {
  method: string;
  url?: string;
  originalUrl?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  /** Parsed query (e.g. from ?foo=bar). */
  query?: Record<string, unknown>;
  /** Parsed cookies if available. */
  cookies?: Record<string, unknown>;
  /** Route pattern if available (e.g. "/user/:id"). */
  route?: { path?: string };
}

export interface ClockworkResponseLike {
  setHeader(name: string, value: string | number): void;
  getHeader?(name: string): string | number | string[] | undefined;
  statusCode: number;
  on(event: 'finish', fn: () => void): void;
  /** Set status and return chainable res (Express-style). */
  status?(code: number): ClockworkResponseLike;
  /** Send body (string or Buffer). */
  send?(body?: unknown): unknown;
  /** Send JSON. */
  json?(body?: unknown): unknown;
  /** End response with optional body. */
  end?(body?: string): void;
  headersSent?: boolean;
}

export type NextLike = (err?: unknown) => void;
