/**
 * @adjedaini/clockwork-core
 * Framework-agnostic monitoring engine. No Express, Fastify, or React.
 */

import type {
  RequestSnapshot,
  RequestMetadata,
  LogData,
  QueryData,
  EventData,
  Snapshot,
  CoreConfig,
} from '@adjedaini/clockwork-shared';
import { RequestRingBuffer } from './ring-buffer';

export type { RequestSnapshot, RequestMetadata, Snapshot, CoreConfig } from '@adjedaini/clockwork-shared';

const DEFAULT_MAX_REQUESTS = 100;

export class MonitorCore {
  private buffer: RequestRingBuffer;
  private current: Map<string, RequestSnapshot> = new Map();
  private startedAt: number = 0;
  private config: Required<Pick<CoreConfig, 'maxRequests'>>;

  constructor(config: CoreConfig = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? DEFAULT_MAX_REQUESTS,
    };
    this.buffer = new RequestRingBuffer(this.config.maxRequests);
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
    return {
      requests,
      metrics: {
        timestamp: Date.now() / 1000,
        spans: [],
      },
    };
  }

  /** For plugin/collector registration later. */
  registerCollector(_name: string, _fn: () => unknown): void {
    // no-op for now; extend for plugins
  }
}
