/**
 * In-memory ring buffer for request storage. Evicts oldest when at capacity.
 * Implements IRequestStorage for pluggable backends.
 */

import type { RequestSnapshot, IRequestStorage } from '@adjedaini/clockwork-shared';

export class RequestRingBuffer implements IRequestStorage {
  private buffer: Map<string, RequestSnapshot> = new Map();
  private order: string[] = [];
  private readonly capacity: number;

  constructor(capacity: number = 100) {
    this.capacity = Math.max(1, capacity);
  }

  push(id: string, request: RequestSnapshot): void {
    if (this.buffer.has(id)) {
      this.buffer.set(id, request);
      return;
    }
    while (this.order.length >= this.capacity && this.order.length > 0) {
      const oldest = this.order.shift()!;
      this.buffer.delete(oldest);
    }
    this.order.push(id);
    this.buffer.set(id, request);
  }

  get(id: string): RequestSnapshot | undefined {
    return this.buffer.get(id);
  }

  getAll(limit: number = 100): RequestSnapshot[] {
    const ids = this.order.slice(-limit).reverse();
    return ids.map((id) => this.buffer.get(id)!).filter(Boolean);
  }

  getLatest(): RequestSnapshot | undefined {
    if (this.order.length === 0) return undefined;
    return this.buffer.get(this.order[this.order.length - 1]);
  }

  count(): number {
    return this.buffer.size;
  }
}
