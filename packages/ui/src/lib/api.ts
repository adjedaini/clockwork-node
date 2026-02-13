import { RequestData, ClockworkMetadata, MetricsSnapshot } from '../types/clockwork';

const API_BASE = typeof window !== 'undefined'
  ? (import.meta.env.VITE_CLOCKWORK_API_BASE ?? '/__clockwork')
  : '';

export const api = {
  async getRequests(): Promise<ClockworkMetadata[]> {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch requests');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.requests ?? []);
  },
  async getRequest(id: string): Promise<RequestData> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch request');
    return res.json();
  },
  async getLatest(): Promise<RequestData> {
    const res = await fetch(`${API_BASE}/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest request');
    return res.json();
  },
  async getMetrics(): Promise<MetricsSnapshot> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },
};
