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

export function RequestList({ requests, selectedRequestId, onSelectRequest, loading, onRefresh }: RequestListProps) {
  const [filter, setFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.uri.toLowerCase().includes(filter.toLowerCase()) ||
      req.method.toLowerCase().includes(filter.toLowerCase());
    const matchesMethod = methodFilter === 'ALL' || req.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-green-600';
    if (status >= 300 && status < 400) return 'bg-blue-600';
    if (status >= 400 && status < 500) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-600';
      case 'POST': return 'bg-green-600';
      case 'PUT': return 'bg-yellow-600';
      case 'DELETE': return 'bg-red-600';
      case 'PATCH': return 'bg-purple-600';
      default: return 'bg-slate-600';
    }
  };

  const formatDuration = (ms: number) => `${ms.toFixed(0)}ms`;
  const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleTimeString();
  const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search requests..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {methods.map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                methodFilter === method ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            {loading ? 'Loading...' : 'No requests found'}
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredRequests.map((request) => (
              <button
                key={request.id}
                onClick={() => onSelectRequest(request.id)}
                className={`w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left ${
                  selectedRequestId === request.id ? 'bg-slate-700' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getMethodColor(request.method)}`}>
                    {request.method}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(request.responseStatus)}`} />
                  <span className="text-xs text-slate-400">{request.responseStatus}</span>
                  <span className="text-xs text-slate-400 ml-auto">{formatTime(request.time)}</span>
                </div>
                <div className="text-sm text-white font-medium mb-1 truncate">{request.uri}</div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{formatDuration(request.responseDuration)}</span>
                  {request.controller && <span className="truncate">{request.controller}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
