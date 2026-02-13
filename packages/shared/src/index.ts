/** Shared types for @adjedaini/clockwork-node. Framework-agnostic. */

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

export interface CoreConfig {
  maxRequests?: number;
  maxBodyDepth?: number;
  maxBodySize?: number;
}
