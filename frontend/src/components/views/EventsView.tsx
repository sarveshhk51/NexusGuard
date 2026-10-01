import { Download } from 'lucide-react';
import { SecurityEvent } from '../../types/soc';
import { SeverityBadge } from '../common/SeverityBadge';

interface EventsViewProps {
  events: SecurityEvent[];
}

export const EventsView: React.FC<EventsViewProps> = ({ events }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Real-time Security Event Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Comprehensive audit log of all database decoy interceptions, honeypot hits, and canary triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors">
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
                    {evt.timestamp}
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
