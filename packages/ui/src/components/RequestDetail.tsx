import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { RequestData, QueryData, LogData, EventData } from '../types/clockwork';
import { Database, FileText, Zap, Info, Clock, Activity } from 'lucide-react';

interface RequestDetailProps {
  requestId: string;
}

type Tab = 'request' | 'logs' | 'queries' | 'performance';

export function RequestDetail({ requestId }: RequestDetailProps) {
  const [request, setRequest] = useState<RequestData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('request');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getRequest(requestId);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 flex items-center justify-center">
        <div className="text-slate-400">Request not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'request' as Tab, label: 'Request', icon: Info, count: null },
    { id: 'logs' as Tab, label: 'Log', icon: FileText, count: request.log?.length || 0 },
    { id: 'queries' as Tab, label: 'Database', icon: Database, count: request.databaseQueries?.length || 0 },
    { id: 'performance' as Tab, label: 'Performance', icon: Zap, count: request.timelineData?.length || 0 },
  ];

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 400 && status < 500) return 'text-yellow-400';
    if (status >= 500) return 'text-red-400';
    return 'text-slate-300';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
      {/* Request summary bar (like Clockwork PHP sidebar) */}
      <div className="border-b border-slate-700 bg-slate-800/80 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-mono font-semibold text-blue-400">{request.method}</span>
        <span className="text-slate-400 truncate max-w-[200px] sm:max-w-xs" title={request.uri}>{request.uri}</span>
        <span className={getStatusColor(request.responseStatus)}>{request.responseStatus}</span>
        <span className="text-slate-400">{request.responseDuration.toFixed(0)}ms</span>
        <span className="text-slate-500 text-xs">{new Date(request.time * 1000).toLocaleString()}</span>
        {request.controller && <span className="text-slate-500 text-xs truncate">{request.controller}</span>}
      </div>
      <div className="border-b border-slate-700">
        <div className="flex gap-1 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="bg-slate-600 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'request' && <RequestTab request={request} />}
        {activeTab === 'logs' && <LogsTab logs={request.log || []} />}
        {activeTab === 'queries' && <QueriesTab queries={request.databaseQueries || []} />}
        {activeTab === 'performance' && <PerformanceTab events={request.timelineData || []} />}
      </div>
    </div>
  );
}

function RequestTab({ request }: { request: RequestData }) {
  const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const InfoRow = ({ label, value }: { label: string; value: unknown }) => (
    <div className="py-3 border-b border-slate-700 last:border-0">
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-white font-mono text-sm break-all">{value ?? 'N/A'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Request</h3>
        </div>
        <div>
          <InfoRow label="Method" value={request.method} />
          <InfoRow label="URI" value={request.uri} />
          <InfoRow label="Status Code" value={request.responseStatus} />
          <InfoRow label="Duration" value={`${request.responseDuration.toFixed(2)}ms`} />
          <InfoRow label="Memory Usage" value={formatBytes(request.memoryUsage)} />
          <InfoRow label="Controller" value={request.controller} />
          <InfoRow label="Time" value={new Date(request.time * 1000).toLocaleString()} />
        </div>
      </div>
      {request.getData && Object.keys(request.getData).length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Query Parameters</h3>
          <pre className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 overflow-x-auto">
            {JSON.stringify(request.getData, null, 2)}
          </pre>
        </div>
      )}
      {request.postData && (
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Request Body</h3>
          <pre className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 overflow-x-auto">
            {JSON.stringify(request.postData, null, 2)}
          </pre>
        </div>
      )}
      {request.headers && Object.keys(request.headers).length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Headers</h3>
          <pre className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 overflow-x-auto">
            {JSON.stringify(request.headers, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function QueriesTab({ queries }: { queries: QueryData[] }) {
  if (queries.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No database queries recorded</p>
      </div>
    );
  }
  const totalDuration = queries.reduce((sum, q) => sum + (q.duration || 0), 0);
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Total Queries</div>
            <div className="text-2xl font-bold text-white">{queries.length}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">Total Duration</div>
            <div className="text-2xl font-bold text-white">{totalDuration.toFixed(2)}ms</div>
          </div>
        </div>
      </div>
      {queries.map((query, index) => (
        <div key={index} className="bg-slate-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Query #{index + 1}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {query.duration?.toFixed(2)}ms
              </span>
              <span className="bg-slate-700 px-2 py-1 rounded">{query.connection || 'default'}</span>
            </div>
          </div>
          <pre className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 overflow-x-auto mb-3">
            {query.query}
          </pre>
          {query.bindings && query.bindings.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-2">Bindings:</div>
              <pre className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 overflow-x-auto">
                {JSON.stringify(query.bindings, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LogsTab({ logs }: { logs: LogData[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No logs recorded. Use console.log/info/warn/error or req.clockwork?.info() — both appear here.</p>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-slate-600 text-slate-200';
      case 'info': return 'bg-blue-600 text-white';
      case 'warning': return 'bg-yellow-600 text-white';
      case 'error': return 'bg-red-600 text-white';
      default: return 'bg-slate-600 text-slate-200';
    }
  };

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div key={index} className="bg-slate-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getLevelColor(log.level)}`}>
              {log.level}
            </span>
            {log.source && (
              <span className={`px-2 py-1 rounded text-xs ${log.source === 'native' ? 'bg-cyan-600/30 text-cyan-200' : 'bg-violet-600/30 text-violet-200'}`}>
                {log.source === 'native' ? 'Console' : 'Clockwork'}
              </span>
            )}
            <span className="text-xs text-slate-400">{log.time.toFixed(3)}s</span>
          </div>
          <p className="text-white mb-2 whitespace-pre-wrap break-words">{log.message}</p>
          {log.context && Object.keys(log.context).length > 0 && (
            <pre className="bg-slate-950 p-3 rounded-lg text-sm text-slate-300 overflow-x-auto">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function PerformanceTab({ events }: { events: EventData[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-50 text-blue-500" />
        <p>No timeline events recorded</p>
        <p className="text-xs mt-2 text-slate-500">Add events via core.addEvent() to see a visual timeline</p>
      </div>
    );
  }
  const maxTime = Math.max(...events.map((e) => e.end || 0));
  const startTime = Math.min(...events.map((e) => e.start || 0));
  const duration = maxTime - startTime || 1;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Performance timeline
        </h3>
        <div className="space-y-3">
          {events.map((event, index) => {
            const eventStart = (event.start || 0) - startTime;
            const eventDuration = event.duration || 0;
            const startPercent = (eventStart / duration) * 100;
            const widthPercent = (eventDuration / duration) * 100;
            return (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white">{event.name}</span>
                  <span className="text-xs text-slate-400">{event.duration?.toFixed(2)}ms</span>
                </div>
                {event.description && <div className="text-xs text-slate-400 mb-1">{event.description}</div>}
                <div className="h-8 bg-slate-950 rounded-lg relative overflow-hidden">
                  <div
                    className="absolute h-full rounded-lg flex items-center px-2"
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(widthPercent, 1)}%`,
                      minWidth: '2px',
                      backgroundColor: event.color || '#3b82f6',
                    }}
                  >
                    {widthPercent > 10 && (
                      <span className="text-xs text-white font-medium truncate">{event.name}</span>
                    )}
                  </div>
                </div>
                {event.data && Object.keys(event.data).length > 0 && (
                  <pre className="mt-2 bg-slate-950 p-2 rounded text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
