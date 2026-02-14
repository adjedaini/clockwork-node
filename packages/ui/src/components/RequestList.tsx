import { ClockworkMetadata } from '../types/clockwork';
import { RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';

interface RequestListProps {
  requests: ClockworkMetadata[];
  selectedRequestId: string | null;
  onSelectRequest: (id: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return 'bg-[var(--cw-status-ok-bg)] text-[var(--cw-status-ok-text)]';
  if (status >= 400 && status < 500) return 'bg-[var(--cw-status-4xx-bg)] text-[var(--cw-status-4xx-text)]';
  if (status >= 500) return 'bg-[var(--cw-status-5xx-bg)] text-[var(--cw-status-5xx-text)]';
  return 'bg-[var(--cw-status-ok-bg)] text-[var(--cw-status-ok-text)]';
}

export function RequestList({ requests, selectedRequestId, onSelectRequest, loading, onRefresh }: RequestListProps) {
  const [filter, setFilter] = useState('');

  const filteredRequests = requests.filter(
    (req) =>
      req.uri.toLowerCase().includes(filter.toLowerCase()) ||
      req.method.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-[var(--cw-panel)]">
      <div className="requests-header flex flex-shrink-0 flex-col border-b border-[var(--cw-border)] p-2">
        <div className="requests-search relative mb-2.5">
          <Search className="ui-icon absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cw-text-muted)]" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search requests..."
            className="h-6 w-full rounded border border-[var(--cw-border)] bg-[var(--cw-input-bg)] pl-7 pr-2 text-[13px] text-[var(--cw-input-text)] placeholder:text-[var(--cw-input-placeholder)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-accent)]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded px-2 py-1 text-[13px] text-[var(--cw-accent)] hover:bg-[var(--cw-border)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      <div className="requests-container flex-1 overflow-auto p-1.5">
        {filteredRequests.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--cw-text-muted)] text-sm">
            {loading ? 'Loading...' : 'No requests found'}
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-left" style={{ lineHeight: 1.4 }}>
            <thead>
              <tr>
                <th className="h-7 whitespace-nowrap px-2 py-1.5 text-[90%] font-semibold text-[var(--cw-text)]">
                  Path
                </th>
                <th className="h-7 whitespace-nowrap px-2 py-1.5 text-[90%] font-semibold text-[var(--cw-text)]">
                  Controller
                </th>
                <th className="status w-[52px] text-center text-[90%] font-semibold text-[var(--cw-text)]">Status</th>
                <th className="duration w-[68px] text-right text-[90%] font-semibold text-[var(--cw-text)]">Time</th>
                <th className="w-[52px] text-right text-[90%] font-semibold text-[var(--cw-text)]">DB</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const selected = selectedRequestId === request.id;
                return (
                  <tr
                    key={request.id}
                    onClick={() => onSelectRequest(request.id)}
                    className={`cursor-pointer border-t border-[#242424] first:border-t-transparent ${
                      selected
                        ? 'selected !bg-[var(--cw-selected)] text-white [&_.method-text]:!text-white [&_.status-text]:!bg-transparent [&_.status-text]:!text-white [&_small]:!text-white'
                        : 'hover:bg-[var(--cw-border)]/50'
                    }`}
                  >
                    <td className="overflow-hidden truncate px-1.5 py-2 align-middle">
                      <div className="flex items-center gap-1">
                        <span className="type-text shrink-0 rounded px-0.5 py-0.5 text-[80%] bg-[var(--cw-type-badge-bg)] text-[var(--cw-type-badge-text)]">
                          {request.method}
                        </span>
                        <span className="truncate text-[var(--cw-text)]">{request.uri}</span>
                      </div>
                    </td>
                    <td className="overflow-hidden truncate px-1.5 py-2 align-middle text-[var(--cw-text-muted)] text-[90%]">
                      {request.controller ?? '–'}
                    </td>
                    <td className="status px-1.5 py-2 text-center align-middle">
                      <span
                        className={`status-text inline-block rounded px-1.5 py-0.5 text-[9px] uppercase ${statusClass(request.responseStatus)} ${selected ? '!bg-transparent !text-white' : ''}`}
                      >
                        {request.responseStatus}
                      </span>
                    </td>
                    <td className="duration px-1.5 py-2 text-right align-middle text-[var(--cw-text-muted)] text-[90%]">
                      {request.responseDuration.toFixed(0)} ms
                    </td>
                    <td className="px-1.5 py-2 text-right align-middle text-[var(--cw-text-muted)] text-[90%]">
                      –
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
