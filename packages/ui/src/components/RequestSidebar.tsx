import { ClockworkMetadata } from '../types/clockwork';

interface RequestSidebarProps {
  request: ClockworkMetadata | null;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return 'bg-[var(--cw-status-ok-bg)] text-[var(--cw-status-ok-text)]';
  if (status >= 400 && status < 500) return 'bg-[var(--cw-status-4xx-bg)] text-[var(--cw-status-4xx-text)]';
  if (status >= 500) return 'bg-[var(--cw-status-5xx-bg)] text-[var(--cw-status-5xx-text)]';
  return 'bg-[var(--cw-status-ok-bg)] text-[var(--cw-status-ok-text)]';
}

export function RequestSidebar({ request }: RequestSidebarProps) {
  if (!request) {
    return (
      <div className="cw-sidebar flex h-full w-full flex-col bg-[var(--cw-panel)] border-l border-[var(--cw-border)]">
        <div className="flex flex-1 items-center justify-center p-6 text-[var(--cw-text-muted)] text-sm">
          Select a request
        </div>
      </div>
    );
  }

  const dateStr = new Date(request.time * 1000).toLocaleString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(' ', ' ');

  return (
    <div className="cw-sidebar flex h-full w-full flex-shrink-0 flex-col bg-[var(--cw-panel)] border-l border-[var(--cw-border)] min-w-0">
      <div className="sidebar-header flex flex-shrink-0 flex-col border-b border-[var(--cw-border)] px-3 py-3.5 text-[13px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="type-text rounded px-1 py-0.5 text-[75%] bg-[var(--cw-type-badge-bg)] text-[var(--cw-type-badge-text)]">
            AJAX
          </span>
          <span className="method-text text-[var(--cw-text-muted)] text-[80%]">{request.method}</span>
          <span className={`status-text rounded px-1.5 py-0.5 text-[9px] uppercase font-medium ${statusClass(request.responseStatus)}`}>
            {request.responseStatus}
          </span>
        </div>
        <div className="info-main mt-1 truncate text-[110%] text-[var(--cw-text)]" title={request.uri}>
          {request.uri}
        </div>
        {request.controller && (
          <div className="info-details mt-1 truncate text-[95%] text-[var(--cw-text-muted)]">
            {request.controller}
          </div>
        )}
      </div>
      <div className="content-meta mt-auto px-3 py-2.5 text-center border-t border-[var(--cw-border)]">
        <div className="text-[var(--cw-text-muted)] text-[95%]">{dateStr}</div>
        <div className="meta-id mt-1 text-[var(--cw-text-muted)] text-xs">
          <span className="font-mono">{request.id}</span>
        </div>
      </div>
    </div>
  );
}
