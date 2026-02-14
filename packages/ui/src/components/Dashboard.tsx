import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { ClockworkMetadata } from '../types/clockwork';
import { RequestList } from './RequestList';
import { RequestSidebar } from './RequestSidebar';
import { RequestDetail } from './RequestDetail';
import { MetricsOverview } from './MetricsOverview';
import { Settings } from './Settings';
import { Activity, List, Gauge } from 'lucide-react';
import type { ThemeMode } from '../lib/theme';

type Tab = 'requests' | 'metrics';

interface DashboardProps {
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

const MIN_REQUESTS = 15;
const MAX_REQUESTS = 50;
const MIN_SIDEBAR = 12;
const MAX_SIDEBAR = 40;
const MIN_DETAILS = 25;

export function Dashboard({ theme, onThemeChange }: DashboardProps) {
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<ClockworkMetadata[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [widths, setWidths] = useState({ requests: 22, sidebar: 20 });
  const splitRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: 1 | 2; startX: number; startW1: number; startW2: number } | null>(null);

  const handleMouseDown = useCallback((handle: 1 | 2, e: React.MouseEvent) => {
    e.preventDefault();
    const startW1 = widths.requests;
    const startW2 = widths.sidebar;
    dragRef.current = { handle, startX: e.clientX, startW1, startW2 };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !splitRef.current) return;
      const containerWidth = splitRef.current.clientWidth;
      const deltaPct = ((ev.clientX - d.startX) / containerWidth) * 100;
      if (d.handle === 1) {
        const newW1 = Math.min(MAX_REQUESTS, Math.max(MIN_REQUESTS, d.startW1 + deltaPct));
        const newW2 = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, d.startW2 - deltaPct));
        const details = 100 - newW1 - newW2;
        if (details >= MIN_DETAILS) setWidths({ requests: newW1, sidebar: newW2 });
      } else {
        const newW2 = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, d.startW2 + deltaPct));
        const details = 100 - d.startW1 - newW2;
        if (details >= MIN_DETAILS) setWidths((w) => ({ ...w, sidebar: newW2 }));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [widths.requests, widths.sidebar]);

  useEffect(() => {
    if (tab === 'requests') {
      fetchRequests();
      const interval = setInterval(fetchRequests, 2000);
      return () => clearInterval(interval);
    }
  }, [tab]);

  const fetchRequests = async () => {
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRequest = selectedRequestId
    ? requests.find((r) => r.id === selectedRequestId) ?? null
    : null;

  return (
    <div className="flex h-screen flex-col bg-[var(--cw-bg)] text-[var(--cw-text)]">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-[var(--cw-border)] bg-[var(--cw-panel)] px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--cw-accent)]" />
            <span className="font-semibold text-[var(--cw-text)]">Clockwork</span>
          </div>
          <span className="text-sm text-[var(--cw-text-muted)]">Node.js dev tools in your browser</span>
          <a
            href="https://underground.works/clockwork/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--cw-text-muted)] hover:text-[var(--cw-accent)]"
          >
            Inspired by Clockwork (PHP)
          </a>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 rounded p-0.5">
            <button
              onClick={() => setTab('requests')}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm ${
                tab === 'requests' ? 'bg-[var(--cw-border)] text-[var(--cw-accent)]' : 'text-[var(--cw-text-muted)] hover:text-[var(--cw-text)]'
              }`}
            >
              <List className="h-4 w-4" /> Requests
            </button>
            <button
              onClick={() => setTab('metrics')}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm ${
                tab === 'metrics' ? 'bg-[var(--cw-border)] text-[var(--cw-accent)]' : 'text-[var(--cw-text-muted)] hover:text-[var(--cw-text)]'
              }`}
            >
              <Gauge className="h-4 w-4" /> Metrics
            </button>
          </nav>
          <Settings theme={theme} onThemeChange={onThemeChange} />
        </div>
      </header>

      {tab === 'metrics' ? (
        <div className="flex-1 overflow-auto p-6">
          <MetricsOverview />
        </div>
      ) : (
        <div ref={splitRef} className="cw-split flex min-h-0 flex-1 flex-row overflow-hidden">
          <div className="cw-split-panel flex min-h-0 flex-col overflow-auto" style={{ width: `${widths.requests}%` }}>
            <RequestList
              requests={requests}
              selectedRequestId={selectedRequestId}
              onSelectRequest={setSelectedRequestId}
              loading={loading}
              onRefresh={fetchRequests}
            />
          </div>
          <div
            className="cw-resize-handle select-none"
            onMouseDown={(e) => handleMouseDown(1, e)}
            role="separator"
            aria-orientation="vertical"
          />
          <div className="cw-split-panel flex min-h-0 flex-col overflow-auto" style={{ width: `${widths.sidebar}%` }}>
            <RequestSidebar request={selectedRequest} />
          </div>
          <div
            className="cw-resize-handle select-none"
            onMouseDown={(e) => handleMouseDown(2, e)}
            role="separator"
            aria-orientation="vertical"
          />
          <div className="cw-split-details flex min-w-0 flex-1 flex-col overflow-hidden" style={{ minWidth: `${MIN_DETAILS}%` }}>
            {selectedRequestId ? (
              <RequestDetail requestId={selectedRequestId} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[var(--cw-text-muted)]">
                Select a request to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
