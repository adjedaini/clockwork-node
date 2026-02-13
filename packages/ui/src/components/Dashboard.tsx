import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ClockworkMetadata } from '../types/clockwork';
import { RequestList } from './RequestList';
import { RequestDetail } from './RequestDetail';
import { MetricsOverview } from './MetricsOverview';
import { Activity, List, Gauge } from 'lucide-react';

type Tab = 'requests' | 'metrics';

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('requests');
  const [requests, setRequests] = useState<ClockworkMetadata[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Clockwork</h1>
                <p className="text-sm text-slate-400">Node.js dev tools in your browser</p>
              </div>
            </div>
            <nav className="flex rounded-lg bg-slate-700/50 p-1">
              <button
                onClick={() => setTab('requests')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'requests' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" /> Requests
              </button>
              <button
                onClick={() => setTab('metrics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'metrics' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Gauge className="w-4 h-4" /> Metrics
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto p-6">
        {tab === 'metrics' ? (
          <MetricsOverview />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1">
              <RequestList
                requests={requests}
                selectedRequestId={selectedRequestId}
                onSelectRequest={setSelectedRequestId}
                loading={loading}
                onRefresh={fetchRequests}
              />
            </div>
            <div className="lg:col-span-1">
              {selectedRequestId ? (
                <RequestDetail requestId={selectedRequestId} />
              ) : (
                <div className="bg-slate-800 rounded-xl border border-slate-700 h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center text-slate-400">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50 text-blue-500" />
                    <p>Select a request to view details</p>
                    <p className="text-xs mt-2 text-slate-500">Layout inspired by Clockwork (PHP)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
