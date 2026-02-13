/** Shared types for @adjedaini/clockwork-node. Framework-agnostic. */

/** Per-request context (AsyncLocalStorage). Used to correlate logs/queries to the current request. */
export interface ClockworkContext {
  requestId: string;
}

export interface LogData {
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, unknown>;
  time: number;
  source?: 'native' | 'clockwork';
}

export interface QueryData {
  query: string;
  bindings?: unknown[];
  duration?: number;
  connection?: string;
}

export interface EventData {
  name: string;
  description?: string;
  duration?: number;
  start?: number;
  end?: number;
  data?: Record<string, unknown>;
  color?: string;
}

export interface RequestSnapshot {
  id: string;
  type: 'http';
  method: string;
  uri: string;
  headers: Record<string, unknown>;
  getData: Record<string, unknown>;
  postData?: unknown;
  responseData?: unknown;
  cookies?: Record<string, unknown>;
  responseStatus: number;
  responseTime: number;
  responseDuration: number;
  memoryUsage: number;
  time: number;
  log: LogData[];
  databaseQueries: QueryData[];
  timelineData: EventData[];
  controller?: string;
}

export interface RequestMetadata {
  id: string;
  method: string;
  uri: string;
  controller?: string;
  responseStatus: number;
  responseDuration: number;
  time: number;
}

export interface MetricsSpan {
  interval: number;
  retention: number;
  responseTime: number[];
  rps: number[];
  statusCodes?: Record<string, number>[];
}

export interface Snapshot {
  requests: RequestMetadata[];
  metrics?: {
    spans: MetricsSpan[];
    timestamp: number;
    os?: { cpu: number; memory: number; heapUsed: number; heapTotal: number; rss: number };
    process?: { uptime: number; eventLoopDelay?: number };
  };
}

/** Storage backend for request snapshots. Implement for Redis, SQLite, file, etc. */
export interface IRequestStorage {
  push(id: string, request: RequestSnapshot): void;
  get(id: string): RequestSnapshot | undefined;
  getAll(limit: number): RequestSnapshot[];
  getLatest(): RequestSnapshot | undefined;
}

export interface CoreConfig {
  maxRequests?: number;
  maxBodyDepth?: number;
  maxBodySize?: number;
  /** Custom storage backend. Default: in-memory ring buffer. */
  storage?: IRequestStorage;
}
