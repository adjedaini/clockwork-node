export interface QueryData {
  query: string;
  bindings?: unknown[];
  duration?: number;
  connection?: string;
  file?: number;
  line?: number;
  model?: string;
}

export interface LogData {
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, unknown>;
  time: number;
  file?: number;
  line?: number;
  trace?: unknown[];
  source?: 'native' | 'clockwork';
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

export interface RequestData {
  id: string;
  type: 'http';
  method: string;
  uri: string;
  headers: Record<string, unknown>;
  getData: Record<string, unknown>;
  postData?: unknown;
  responseData?: unknown;
  sessionData?: Record<string, unknown>;
  cookies?: Record<string, unknown>;
  responseStatus: number;
  responseTime: number;
  responseDuration: number;
  memoryUsage: number;
  time: number;
  log: LogData[];
  databaseQueries: QueryData[];
  timelineData: EventData[];
  routes?: unknown[];
  userData?: Record<string, unknown>;
  authenticated?: boolean;
  controller?: string;
  middleware?: string[];
}

export interface ClockworkMetadata {
  id: string;
  method: string;
  uri: string;
  controller?: string;
  responseStatus: number;
  responseDuration: number;
  time: number;
}

export interface MetricsSnapshot {
  timestamp: number;
  spans?: Array<{
    interval: number;
    retention: number;
    responseTime: number[];
    rps: number[];
    statusCodes?: Record<string, number>[];
  }>;
  os?: {
    cpu: number;
    memory: number;
    load?: number[];
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external?: number;
  };
  process?: {
    eventLoopDelay?: number;
    uptime: number;
  };
  healthChecks?: Array<{
    name?: string;
    path: string;
    status: 'ok' | 'error';
    statusCode?: number;
    duration?: number;
    error?: string;
  }>;
}
