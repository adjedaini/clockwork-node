import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../lib/api';
import { MetricsSnapshot } from '../types/clockwork';
import { Cpu, HardDrive, Timer, Activity, BarChart3, CheckCircle, XCircle } from 'lucide-react';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function MetricsOverview() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getMetrics();
        setMetrics(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load metrics');
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 1000);
    return () => clearInterval(interval);
  }, []);

  if (error && !metrics) {
    return (
      <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-8 text-center text-[var(--cw-text-muted)]">
        <p>{error}</p>
        <p className="mt-2 text-sm">Ensure the server is running and Clockwork is enabled.</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-8 text-center text-[var(--cw-text-muted)]">
        Loading metrics…
      </div>
    );
  }

  const spans = metrics.spans ?? [];
  const span = spans[0] ?? { responseTime: [], rps: [], statusCodes: [], interval: 10 };
  const interval = span.interval ?? 10;
  const chartData = span.responseTime.map((rt, i) => {
    const secAgo = i === span.responseTime.length - 1 ? 0 : (span.responseTime.length - i) * interval;
    return {
      index: i,
      label: secAgo === 0 ? 'now' : `${secAgo}s ago`,
      responseTime: Math.round(rt),
      rps: span.rps[i] != null ? Math.round(span.rps[i] * 10) / 10 : 0,
    };
  });

  const totalRequests = span.rps?.reduce((a, b) => a + b, 0) ?? 0;
  const totalResponseTimeMs = chartData.reduce((a, d) => a + d.responseTime * d.rps, 0);
  const avgResponseTime = totalRequests > 0 ? Math.round(totalResponseTimeMs / totalRequests) : 0;
  const peakRps = chartData.length > 0 ? Math.max(...chartData.map((d) => d.rps), 0) : 0;

  const statusCodeData = span.statusCodes?.length
    ? span.statusCodes.flatMap((sc) => Object.entries(sc).map(([bucket, count]) => ({ bucket, count })))
    : [];
  const statusTotals = statusCodeData.reduce<Record<string, number>>((acc, { bucket, count }) => {
    acc[bucket] = (acc[bucket] ?? 0) + count;
    return acc;
  }, {});

  const os = metrics.os;
  const processInfo = metrics.process;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
          <div className="rounded-lg bg-amber-600/20 p-2">
            <Cpu className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">CPU</p>
            <p className="text-lg font-semibold text-[var(--cw-text)]">{os?.cpu != null ? `${os.cpu.toFixed(1)}%` : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
          <div className="rounded-lg bg-emerald-600/20 p-2">
            <HardDrive className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">Memory</p>
            <p className="text-lg font-semibold text-[var(--cw-text)]">
              {os?.memory != null ? `${os.memory.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-[var(--cw-text-muted)]">{os?.heapUsed != null ? formatBytes(os.heapUsed) : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
          <div className="rounded-lg bg-blue-600/20 p-2">
            <Timer className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">Event loop</p>
            <p className="text-lg font-semibold text-[var(--cw-text)]">
              {processInfo?.eventLoopDelay != null ? `${Math.round(processInfo.eventLoopDelay)} ms` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
          <div className="rounded-lg bg-violet-600/20 p-2">
            <Activity className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">Uptime</p>
            <p className="text-lg font-semibold text-[var(--cw-text)]">
              {processInfo?.uptime != null ? formatUptime(processInfo.uptime) : '—'}
            </p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">Avg response time</p>
              <p className="text-xl font-semibold text-[var(--cw-text)]">{avgResponseTime} ms</p>
              <p className="mt-0.5 text-xs text-[var(--cw-text-muted)]">Last 60 seconds</p>
            </div>
            <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">Peak throughput</p>
              <p className="text-xl font-semibold text-[var(--cw-text)]">{peakRps.toFixed(1)} req/s</p>
              <p className="mt-0.5 text-xs text-[var(--cw-text-muted)]">Last 60 seconds</p>
            </div>
            <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--cw-text-muted)]">Total requests</p>
              <p className="text-xl font-semibold text-[var(--cw-text)]">{Math.round(totalRequests)}</p>
              <p className="mt-0.5 text-xs text-[var(--cw-text-muted)]">Last 60 seconds</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cw-text)]">
                <BarChart3 className="h-4 w-4" /> Response time
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--cw-accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--cw-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cw-chart-grid)" />
                    <XAxis dataKey="label" stroke="var(--cw-chart-text)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--cw-chart-text)" tick={{ fontSize: 10 }} unit=" ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--cw-chart-tooltip-bg)',
                        border: '1px solid var(--cw-chart-tooltip-border)',
                      }}
                      labelStyle={{ color: 'var(--cw-text-muted)' }}
                      formatter={(value: number) => [value, 'Response time (ms)']}
                    />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="var(--cw-accent)"
                      fillOpacity={1}
                      fill="url(#colorResponseTime)"
                      name="Response time (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cw-text)]">
                <Activity className="h-4 w-4" /> Throughput
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cw-chart-grid)" />
                    <XAxis dataKey="label" stroke="var(--cw-chart-text)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--cw-chart-text)" tick={{ fontSize: 10 }} unit=" req/s" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--cw-chart-tooltip-bg)',
                        border: '1px solid var(--cw-chart-tooltip-border)',
                      }}
                      formatter={(value: number) => [value, 'Requests/s']}
                    />
                    <Line
                      type="monotone"
                      dataKey="rps"
                      stroke="var(--cw-accent)"
                      strokeWidth={2}
                      dot={false}
                      name="Requests/s"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {Object.keys(statusTotals).length > 0 && (
        <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--cw-text)]">Status codes (recent)</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusTotals).map(([bucket, count]) => (
              <div key={bucket} className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-sm font-medium ${
                    bucket === '2xx' ? 'bg-green-600/30 text-green-400'
                      : bucket === '3xx' ? 'bg-blue-600/30 text-blue-400'
                      : bucket === '4xx' ? 'bg-yellow-600/30 text-yellow-400'
                      : 'bg-red-600/30 text-red-400'
                  }`}
                >
                  {bucket}
                </span>
                <span className="text-[var(--cw-text-muted)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.healthChecks && metrics.healthChecks.length > 0 && (
        <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--cw-text)]">Health checks</h3>
          <div className="space-y-2">
            {metrics.healthChecks.map((check, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--cw-border)]/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  {check.status === 'ok' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-mono text-sm text-[var(--cw-text)]">{check.name || check.path}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {check.duration != null && <span className="text-[var(--cw-text-muted)]">{check.duration} ms</span>}
                  {check.statusCode != null && <span className="text-[var(--cw-text-muted)]">HTTP {check.statusCode}</span>}
                  {check.error && <span className="text-red-500">{check.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {chartData.length === 0 && !os && !processInfo && Object.keys(statusTotals).length === 0 && (
        <div className="rounded-xl border border-[var(--cw-border)] bg-[var(--cw-panel)] p-8 text-center text-[var(--cw-text-muted)]">
          <p>No metrics data yet. Request data is collected per-request; aggregate metrics can be added via plugins.</p>
        </div>
      )}
    </div>
  );
}
