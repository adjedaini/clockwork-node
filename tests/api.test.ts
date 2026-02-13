/**
 * Basic API surface tests. Run after build for full integration.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { startClockwork } from '../src/index';

describe('startClockwork', () => {
  let clock: ReturnType<typeof startClockwork>;

  beforeEach(() => {
    clock = startClockwork({ path: '/__clockwork', ui: false });
  });

  it('returns core, middleware, handler, uiPath', () => {
    expect(clock).toHaveProperty('core');
    expect(clock).toHaveProperty('middleware');
    expect(clock).toHaveProperty('handler');
    expect(clock).toHaveProperty('uiPath');
    expect(typeof clock.middleware).toBe('function');
    expect(typeof clock.handler).toBe('function');
    expect(clock.uiPath).toBeTruthy();
  });

  it('core captures request and returns snapshot', () => {
    const id = clock.core.captureRequest({ method: 'GET', uri: '/test' });
    expect(id).toBeTruthy();
    clock.core.captureLog(id, 'info', 'test log');
    clock.core.finalizeRequest(id, { responseStatus: 200, responseDuration: 10 });
    const snapshot = clock.core.getSnapshot(10);
    expect(snapshot.requests).toHaveLength(1);
    expect(snapshot.requests[0].method).toBe('GET');
    expect(snapshot.requests[0].uri).toBe('/test');
    expect(snapshot.requests[0].responseStatus).toBe(200);
    const full = clock.core.getRequest(id);
    expect(full?.log).toHaveLength(1);
    expect(full?.log[0].message).toBe('test log');
  });
});
