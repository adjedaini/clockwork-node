/**
 * @adjedaini/clockwork-core
 * Framework-agnostic monitoring engine. No Express, Fastify, or React.
 */

import * as os from 'node:os';
import type {
  RequestSnapshot,
  RequestMetadata,
  LogData,
  QueryData,
  EventData,
  Snapshot,
  MetricsSpan,
  CoreConfig,
  IRequestStorage,
} from '@adjedaini/clockwork-shared';
import { RequestRingBuffer } from './ring-buffer';

export type { RequestSnapshot, RequestMetadata, Snapshot, CoreConfig, IRequestStorage } from '@adjedaini/clockwork-shared';

/** Context passed to every plugin. getRequestId() returns current request id when inside middleware. */
export interface IPluginContext {
  core: MonitorCore;
  getRequestId(): string | undefined;
}

/** Generic plugin: install patches and return a restore function. */
export interface ClockworkPlugin {
  name: string;
  install(ctx: IPluginContext): () => void;
}

const DEFAULT_MAX_REQUESTS = 100;

const ROLLING_WINDOW_SEC = 60;
const SPAN_INTERVAL_SEC = 10; // 10s buckets for smoother charts
const SPAN_RETENTION = Math.floor(ROLLING_WINDOW_SEC / SPAN_INTERVAL_SEC); // 6 buckets
const METRICS_REQUEST_LIMIT = 500;

export class MonitorCore {
  private buffer: IRequestStorage;
  private current: Map<string, RequestSnapshot> = new Map();
  private startedAt: number = 0;
  private config: Required<Pick<CoreConfig, 'maxRequests'>>;
  private _lastCpuUsage: ReturnType<typeof process.cpuUsage> = { user: 0, system: 0 };
  private _lastCpuTime: number = 0;

  constructor(config: CoreConfig = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? DEFAULT_MAX_REQUESTS,
    };
    this.buffer = config.storage ?? new RequestRingBuffer(this.config.maxRequests);
  }

  /** Start the monitor (call once at bootstrap). */
  start(): void {
    this.startedAt = Date.now();
  }

  /** Begin capturing a request. Returns request id. */
  captureRequest(initial: Partial<RequestSnapshot>): string {
    const id =
      (initial.id as string) ||
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
    const startTime = Date.now();
    const heapAtStart = process.memoryUsage().heapUsed;
    const snapshot: RequestSnapshot = {
      id,
      type: 'http',
      method: initial.method ?? '',
      uri: initial.uri ?? '',
      headers: initial.headers ?? {},
      getData: initial.getData ?? {},
      postData: initial.postData,
      cookies: initial.cookies,
      responseStatus: 0,
      responseTime: startTime,
      responseDuration: 0,
      memoryUsage: heapAtStart,
      time: startTime / 1000,
      log: [],
      databaseQueries: [],
      timelineData: [],
      controller: initial.controller,
    };
    this.current.set(id, snapshot);
    return id;
  }

  /** Attach a log entry to a request. */
  captureLog(
    requestId: string,
    level: LogData['level'],
    message: string,
    context?: Record<string, unknown>
  ): void {
    const req = this.current.get(requestId);
    if (!req) return;
    const startTime = req.time * 1000;
    req.log.push({
      level,
      message,
      context,
      time: (Date.now() - startTime) / 1000,
      source: 'clockwork',
    });
  }

  /** Attach a native (e.g. console) log entry. */
  captureNativeLog(
    requestId: string,
    level: LogData['level'],
    message: string,
    context?: Record<string, unknown>,
    timeOffset?: number
  ): void {
    const req = this.current.get(requestId);
    if (!req) return;
    const startTime = req.time * 1000;
    req.log.push({
      level,
      message,
      context,
      time: timeOffset ?? (Date.now() - startTime) / 1000,
      source: 'native',
    });
  }

  /** Capture an error. If requestId is set, also attach to that request's log. */
  captureError(error: unknown, requestId?: string): void {
    const message = error instanceof Error ? error.message : String(error);
    const context = error instanceof Error ? { name: error.name, stack: error.stack } : undefined;
    if (requestId) {
      this.captureLog(requestId, 'error', message, context as Record<string, unknown>);
    }
    // Global errors could be stored in a ring buffer here for getSnapshot(); optional for later.
  }

  /** Add a query to a request. */
  addQuery(requestId: string, data: QueryData): void {
    const req = this.current.get(requestId);
    if (!req) return;
    req.databaseQueries.push(data);
  }

  /** Add a timeline event to a request. */
  addEvent(requestId: string, data: EventData): void {
    const req = this.current.get(requestId);
    if (!req) return;
    req.timelineData.push(data);
  }

  /** Update request data (e.g. response status, duration, body). */
  finalizeRequest(
    requestId: string,
    update: {
      responseStatus: number;
      responseDuration: number;
      responseData?: unknown;
    }
  ): void {
    const req = this.current.get(requestId);
    if (!req) return;
    req.responseStatus = update.responseStatus;
    req.responseDuration = update.responseDuration;
    if (update.responseData !== undefined) req.responseData = update.responseData;
    req.memoryUsage = process.memoryUsage().heapUsed - req.memoryUsage;
    this.buffer.push(requestId, req);
    this.current.delete(requestId);
  }

  /** Get full request by id. */
  getRequest(id: string): RequestSnapshot | undefined {
    return this.current.get(id) ?? this.buffer.get(id);
  }

  /** Get snapshot for UI: list of requests + optional metrics. */
  getSnapshot(limit: number = 50): Snapshot {
    const all = this.buffer.getAll(limit);
    const requests: RequestMetadata[] = all.map((r) => ({
      id: r.id,
      method: r.method,
      uri: r.uri,
      controller: r.controller,
      responseStatus: r.responseStatus,
      responseDuration: r.responseDuration,
      time: r.time,
    }));

    const now = Date.now() / 1000;
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryPct = totalMem > 0 ? ((totalMem - freeMem) / totalMem) * 100 : 0;

    let cpuPct: number | undefined;
    const cpu = process.cpuUsage(this._lastCpuUsage);
    this._lastCpuUsage = process.cpuUsage();
    const elapsed = this._lastCpuTime > 0 ? now - this._lastCpuTime : 0;
    this._lastCpuTime = now;
    if (elapsed > 0.1) {
      const cpuSeconds = (cpu.user + cpu.system) / 1e6;
      cpuPct = Math.min(100, (cpuSeconds / elapsed) * 100);
    }

    const metricsRequests = this.buffer.getAll(METRICS_REQUEST_LIMIT);
    const span = this.buildSpan(metricsRequests, now);

    return {
      requests,
      metrics: {
        timestamp: now,
        spans: span ? [span] : [],
        os: {
          cpu: cpuPct ?? 0,
          memory: memoryPct,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          rss: mem.rss,
        },
        process: {
          uptime: process.uptime(),
        },
      },
    };
  }

  private buildSpan(requests: RequestSnapshot[], now: number): MetricsSpan | null {
    const responseTime: number[] = new Array(SPAN_RETENTION).fill(0);
    const rps: number[] = new Array(SPAN_RETENTION).fill(0);
    const counts: number[] = new Array(SPAN_RETENTION).fill(0);
    const statusCodes: Record<string, number>[] = new Array(SPAN_RETENTION).fill(null).map(() => ({}));

    const windowStart = now - ROLLING_WINDOW_SEC;
    for (const r of requests) {
      if (r.time < windowStart || r.responseStatus === 0) continue;
      const bucket = Math.floor((r.time - windowStart) / SPAN_INTERVAL_SEC);
      if (bucket < 0 || bucket >= SPAN_RETENTION) continue;
      responseTime[bucket] += r.responseDuration;
      counts[bucket]++;
      rps[bucket]++;
      const bucketKey = r.responseStatus >= 500 ? '5xx' : r.responseStatus >= 400 ? '4xx' : r.responseStatus >= 300 ? '3xx' : '2xx';
      statusCodes[bucket][bucketKey] = (statusCodes[bucket][bucketKey] ?? 0) + 1;
    }

    for (let i = 0; i < SPAN_RETENTION; i++) {
      if (counts[i] > 0) responseTime[i] /= counts[i];
    }

    return {
      interval: SPAN_INTERVAL_SEC,
      retention: SPAN_RETENTION,
      responseTime,
      rps,
      statusCodes,
    };
  }

  /** For plugin/collector registration later. */
  registerCollector(_name: string, _fn: () => unknown): void {
    // no-op for now; extend for plugins
  }
}
