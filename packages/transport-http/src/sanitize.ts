/** Minimal sanitization for headers/body. No framework deps. */

const DEFAULT_REDACT_KEYS = [
  'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token',
  'password', 'passwd', 'secret', 'token', 'access_token', 'refresh_token',
  'api_key', 'apikey', 'credential', 'credentials',
];

function redactValue(): string {
  return '[REDACTED]';
}

function truncate(str: string, maxLength: number): string {
  if (typeof str !== 'string') return str;
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...[truncated]';
}

function shouldRedact(key: string, redactKeys: string[]): boolean {
  const lower = key.toLowerCase();
  return redactKeys.some((k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower));
}

export function sanitizeHeaders(
  obj: Record<string, unknown> | undefined,
  options: { redactKeys?: string[]; maxValueLength?: number } = {}
): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  const keys = options.redactKeys ?? DEFAULT_REDACT_KEYS;
  const maxLen = options.maxValueLength ?? 500;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (shouldRedact(k, keys)) {
      out[k] = redactValue();
    } else if (typeof v === 'string') {
      out[k] = truncate(v, maxLen);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const DEFAULT_MAX_DEPTH = 10;
const OMITTED_DEPTH = '[depth exceeded]';

export interface SanitizeBodyOptions {
  redactKeys?: string[];
  maxLength?: number;
  maxDepth?: number;
}

function sanitizeBodyAtDepth(
  value: unknown,
  options: SanitizeBodyOptions & { _depth?: number }
): unknown {
  const keys = options.redactKeys ?? DEFAULT_REDACT_KEYS;
  const maxLength = options.maxLength ?? 10000;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const depth = options._depth ?? 0;

  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncate(value, maxLength);
  if (depth >= maxDepth) return OMITTED_DEPTH;

  const nextOpts: SanitizeBodyOptions & { _depth?: number } = {
    redactKeys: keys,
    maxLength,
    maxDepth,
    _depth: depth + 1,
  };

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeBodyAtDepth(item, nextOpts));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (shouldRedact(k, keys)) out[k] = redactValue();
      else out[k] = sanitizeBodyAtDepth(v, nextOpts);
    }
    return out;
  }
  return value;
}

export function sanitizeBody(value: unknown, options: SanitizeBodyOptions = {}): unknown {
  const { _depth, ...opts } = options as SanitizeBodyOptions & { _depth?: number };
  return sanitizeBodyAtDepth(value, opts);
}

export { DEFAULT_REDACT_KEYS };
