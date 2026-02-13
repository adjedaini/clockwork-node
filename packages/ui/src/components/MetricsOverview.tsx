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
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
        <p>{error}</p>
        <p className="text-sm mt-2">Ensure the server is running and Clockwork is enabled.</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
        Loading metrics…
      </div>
    );
  }

  const spans = metrics.spans ?? [];
  const span = spans[0] ?? { responseTime: [], rps: [], statusCodes: [], interval: 1 };
  const chartData = span.responseTime.map((rt, i) => ({
    index: i,
    responseTime: Math.round(rt),
    rps: span.rps[i] != null ? Math.round(span.rps[i] * 10) / 10 : 0,
  }));

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-600/20 rounded-lg">
            <Cpu className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">CPU</p>
            <p className="text-lg font-semibold text-white">{os?.cpu != null ? `${os.cpu.toFixed(1)}%` : '—'}</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
          <div className="p-2 bg-emerald-600/20 rounded-lg">
            <HardDrive className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Memory</p>
            <p className="text-lg font-semibold text-white">
              {os?.memory != null ? `${os.memory.toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-400">{os?.heapUsed != null ? formatBytes(os.heapUsed) : '—'}</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Timer className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Event loop</p>
            <p className="text-lg font-semibold text-white">
              {processInfo?.eventLoopDelay != null ? `${Math.round(processInfo.eventLoopDelay)} ms` : '—'}
            </p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
          <div className="p-2 bg-violet-600/20 rounded-lg">
            <Activity className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Uptime</p>
            <p className="text-lg font-semibold text-white">
              {processInfo?.uptime != null ? formatUptime(processInfo.uptime) : '—'}
            </p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Response time (ms) — {span.interval}s span
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(value: number) => [value, 'Response time (ms)']}
                  />
                  <Area
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorResponseTime)"
                    name="Response time (ms)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Requests per second
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="index" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    formatter={(value: number) => [value, 'RPS']}
                  />
                  <Line type="monotone" dataKey="rps" stroke="#10b981" strokeWidth={2} dot={false} name="RPS" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {Object.keys(statusTotals).length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Status codes (recent)</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusTotals).map(([bucket, count]) => (
              <div key={bucket} className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    bucket === '2xx' ? 'bg-green-600/30 text-green-300'
                      : bucket === '3xx' ? 'bg-blue-600/30 text-blue-300'
                      : bucket === '4xx' ? 'bg-yellow-600/30 text-yellow-300'
                      : 'bg-red-600/30 text-red-300'
                  }`}
                >
                  {bucket}
                </span>
                <span className="text-slate-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.healthChecks && metrics.healthChecks.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Health checks</h3>
          <div className="space-y-2">
            {metrics.healthChecks.map((check, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-700/50">
                <div className="flex items-center gap-2">
                  {check.status === 'ok' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-slate-200 font-mono text-sm">{check.name || check.path}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {check.duration != null && <span className="text-slate-400">{check.duration} ms</span>}
                  {check.statusCode != null && <span className="text-slate-400">HTTP {check.statusCode}</span>}
                  {check.error && <span className="text-red-400">{check.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {chartData.length === 0 && !os && !processInfo && Object.keys(statusTotals).length === 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
          <p>No metrics data yet. Request data is collected per-request; aggregate metrics can be added via plugins.</p>
        </div>
      )}
    </div>
  );
}
