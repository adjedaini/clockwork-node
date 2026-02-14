import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { RequestData, QueryData, LogData, EventData } from '../types/clockwork';
import { Database, FileText, Zap, Info, Clock, Activity } from 'lucide-react';

interface RequestDetailProps {
  requestId: string;
}

type Tab = 'request' | 'logs' | 'queries' | 'timeline';

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
      <div className="flex h-full items-center justify-center bg-[var(--cw-bg)]">
        <div className="text-[var(--cw-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--cw-bg)]">
        <div className="text-[var(--cw-text-muted)]">Request not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'request' as Tab, label: 'Request', icon: Info, count: null },
    { id: 'logs' as Tab, label: 'Log', icon: FileText, count: request.log?.length || 0 },
    { id: 'queries' as Tab, label: 'Database', icon: Database, count: request.databaseQueries?.length || 0 },
    { id: 'timeline' as Tab, label: 'Timeline', icon: Zap, count: request.timelineData?.length || 0 },
  ];

  return (
    <div className="details-pane flex h-full min-h-0 flex-col bg-[var(--cw-bg)]">
      {/* Clockwork-style details header – 34px tabs */}
      <div
        className="details-header flex h-[var(--cw-details-header-h)] flex-shrink-0 items-center border-b border-[var(--cw-border)] bg-[var(--cw-panel)] px-1"
        style={{ minHeight: 34 }}
      >
        <div className="details-header-tabs flex flex-1 gap-0 overflow-hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  active ? 'text-[var(--cw-accent)]' : 'text-[var(--cw-text-muted)] hover:text-[var(--cw-accent)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="rounded bg-[var(--cw-border)] px-1.5 py-0.5 text-xs">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="details-content flex-1 overflow-auto p-4">
        {activeTab === 'request' && <RequestTab request={request} />}
        {activeTab === 'logs' && <LogsTab logs={request.log || []} />}
        {activeTab === 'queries' && <QueriesTab queries={request.databaseQueries || []} />}
        {activeTab === 'timeline' && <TimelineTab events={request.timelineData || []} />}
      </div>
    </div>
  );
}

function RequestTab({ request }: { request: RequestData }) {
  const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  const InfoRow = ({ label, value }: { label: string; value: unknown }) => (
    <div className="border-b border-[var(--cw-border)] py-3 last:border-0">
      <div className="mb-1 text-sm text-[var(--cw-text-muted)]">{label}</div>
      <div className="break-all font-mono text-sm text-[var(--cw-text)]">{value ?? 'N/A'}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[var(--cw-panel)] p-4">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--cw-accent)]" />
          <h3 className="text-[13px] font-semibold text-[var(--cw-text)]">Request</h3>
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
        <div className="rounded-lg bg-[var(--cw-panel)] p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--cw-text)]">Query Parameters</h3>
          <pre className="overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-3 text-sm text-[var(--cw-text)]">
            {JSON.stringify(request.getData, null, 2)}
          </pre>
        </div>
      )}
      {request.postData && (
        <div className="rounded-lg bg-[var(--cw-panel)] p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--cw-text)]">Request Body</h3>
          <pre className="overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-3 text-sm text-[var(--cw-text)]">
            {JSON.stringify(request.postData, null, 2)}
          </pre>
        </div>
      )}
      {request.headers && Object.keys(request.headers).length > 0 && (
        <div className="rounded-lg bg-[var(--cw-panel)] p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--cw-text)]">Headers</h3>
          <pre className="overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-3 text-sm text-[var(--cw-text)]">
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
      <div className="py-12 text-center text-[var(--cw-text-muted)]">
        <Database className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p>No database queries recorded</p>
      </div>
    );
  }
  const totalDuration = queries.reduce((sum, q) => sum + (q.duration || 0), 0);
  return (
    <div className="space-y-4">
      <div className="counters-row flex items-center justify-between rounded-lg border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-4">
        <div>
          <div className="text-[95%] uppercase text-[var(--cw-text-muted)]">Total Queries</div>
          <div className="text-[170%] font-bold text-[var(--cw-accent)]">{queries.length}</div>
        </div>
        <div>
          <div className="text-[95%] uppercase text-[var(--cw-text-muted)]">Total Duration</div>
          <div className="text-[170%] font-bold text-[var(--cw-accent)]">{totalDuration.toFixed(2)}ms</div>
        </div>
      </div>
      {queries.map((query, index) => (
        <div key={index} className="rounded-lg bg-[var(--cw-panel)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--cw-accent)]" />
              <span className="text-sm font-medium text-[var(--cw-text)]">Query #{index + 1}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--cw-text-muted)]">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {query.duration?.toFixed(2)}ms
              </span>
              <span className="rounded bg-[var(--cw-border)] px-2 py-1">{query.connection || 'default'}</span>
            </div>
          </div>
          <pre className="mb-3 overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-3 text-sm text-[var(--cw-text)]">
            {query.query}
          </pre>
          {query.bindings && query.bindings.length > 0 && (
            <div>
              <div className="mb-2 text-xs text-[var(--cw-text-muted)]">Bindings:</div>
              <pre className="overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-3 text-sm text-[var(--cw-text)]">
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
      <div className="py-12 text-center text-[var(--cw-text-muted)]">
        <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p>No logs recorded. Use console.log/info/warn/error or req.clockwork?.info() — both appear here.</p>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-[var(--cw-border)] text-[var(--cw-text-muted)]';
      case 'info': return 'bg-[var(--cw-type-badge-bg)] text-[var(--cw-type-badge-text)]';
      case 'warning': return 'bg-[var(--cw-status-4xx-bg)] text-[var(--cw-status-4xx-text)]';
      case 'error': return 'bg-[var(--cw-status-5xx-bg)] text-[var(--cw-status-5xx-text)]';
      default: return 'bg-[var(--cw-border)] text-[var(--cw-text-muted)]';
    }
  };

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div key={index} className="rounded-lg bg-[var(--cw-panel)] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${getLevelColor(log.level)}`}>
              {log.level}
            </span>
            {log.source && (
              <span className={`rounded px-2 py-1 text-xs ${log.source === 'native' ? 'bg-cyan-600/30 text-cyan-200' : 'bg-violet-600/30 text-violet-200'}`}>
                {log.source === 'native' ? 'Console' : 'Clockwork'}
              </span>
            )}
            <span className="text-xs text-[var(--cw-text-muted)]">{log.time.toFixed(3)}s</span>
          </div>
          <p className="mb-2 whitespace-pre-wrap break-words text-[var(--cw-text)]">{log.message}</p>
          {log.context && Object.keys(log.context).length > 0 && (
            <pre className="overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-3 text-sm text-[var(--cw-text)]">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ events }: { events: EventData[] }) {
  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--cw-text-muted)]">
        <Zap className="mx-auto mb-3 h-12 w-12 opacity-50 text-[var(--cw-accent)]" />
        <p>No timeline events recorded</p>
        <p className="mt-2 text-xs text-[var(--cw-text-muted)]">Add events via core.addEvent() to see a visual timeline</p>
      </div>
    );
  }
  const maxTime = Math.max(...events.map((e) => e.end || 0));
  const startTime = Math.min(...events.map((e) => e.start || 0));
  const duration = maxTime - startTime || 1;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[var(--cw-panel)] p-4">
        <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[var(--cw-text)]">
          <Clock className="h-5 w-5 text-[var(--cw-accent)]" />
          Timeline
        </h3>
        <div className="space-y-3">
          {events.map((event, index) => {
            const eventStart = (event.start || 0) - startTime;
            const eventDuration = event.duration || 0;
            const startPercent = (eventStart / duration) * 100;
            const widthPercent = (eventDuration / duration) * 100;
            return (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-[var(--cw-text)]">{event.name}</span>
                  <span className="text-xs text-[var(--cw-text-muted)]">{event.duration?.toFixed(2)}ms</span>
                </div>
                {event.description && <div className="mb-1 text-xs text-[var(--cw-text-muted)]">{event.description}</div>}
                <div className="relative h-8 overflow-hidden rounded bg-[var(--cw-code-bg)]">
                  <div
                    className="absolute flex h-full items-center rounded px-2"
                    style={{
                      left: `${startPercent}%`,
                      width: `${Math.max(widthPercent, 1)}%`,
                      minWidth: '2px',
                      backgroundColor: event.color || 'var(--cw-accent)',
                    }}
                  >
                    {widthPercent > 10 && (
                      <span className="truncate text-xs font-medium text-white">{event.name}</span>
                    )}
                  </div>
                </div>
                {event.data && Object.keys(event.data).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded border border-[var(--cw-code-border)] bg-[var(--cw-code-bg)] p-2 text-xs text-[var(--cw-text)]">
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
