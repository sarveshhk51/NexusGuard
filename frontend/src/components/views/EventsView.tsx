import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { SecurityEvent } from '../../types/soc';
import { SeverityBadge } from '../common/SeverityBadge';
import { getApiUrl } from '../../utils/apiConfig';

interface EventsViewProps {
  events: SecurityEvent[];
}

export const EventsView: React.FC<EventsViewProps> = ({ events: propEvents }) => {
  const [events, setEvents] = useState<SecurityEvent[]>(propEvents);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/events?page=1&page_size=100'));
      if (!res.ok) {
        setEvents(propEvents);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const mapped: SecurityEvent[] = data.items.map((item: any) => ({
          id: `evt-${item.id}`,
          timestamp: item.timestamp,
          relativeTime: '',
          sourceIp: item.source_ip,
          targetDatabase: `${item.database_name || 'target_demo'} (${item.schema_name || ''})`,
          eventType: item.event_type,
          query: item.query,
          severity: item.severity,
          detectionReason: item.detection_reason,
          isNew: false,
        }));
        setEvents(mapped);
        setTotal(data.total || mapped.length);
      } else {
        setEvents(propEvents);
        setTotal(propEvents.length);
      }
    } catch {
      setEvents(propEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Update from prop events when they change (live WebSocket feed)
  useEffect(() => {
    if (propEvents.length > events.length) {
      setEvents(propEvents);
    }
  }, [propEvents]);

  const handleExportCSV = () => {
    const header = 'Severity,Timestamp,Event Type,Source IP,Target DB,Query\n';
    const rows = events.map(evt =>
      `${evt.severity},"${evt.timestamp}","${evt.eventType}","${evt.sourceIp}","${evt.targetDatabase}","${evt.query.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexusguard_events_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Real-time Security Event Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Comprehensive audit log from the NexusGuard detection engine — {total > 0 ? `${total} events recorded` : 'fetching from backend...'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-850 text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-3">Severity</th>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Event Type</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Target DB</th>
                <th className="p-3">SQL Query Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750 text-slate-300">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-750/30 transition-colors">
                  <td className="p-3">
                    <SeverityBadge severity={evt.severity} size="sm" />
                  </td>
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-semibold text-slate-200 whitespace-nowrap">
                    {evt.eventType}
                  </td>
                  <td className="p-3 font-semibold text-blue-400 whitespace-nowrap">
                    {evt.sourceIp}
                  </td>
                  <td className="p-3 text-amber-300 whitespace-nowrap">
                    {evt.targetDatabase}
                  </td>
                  <td className="p-3 max-w-md truncate font-mono text-slate-300" title={evt.query}>
                    <code>{evt.query}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
