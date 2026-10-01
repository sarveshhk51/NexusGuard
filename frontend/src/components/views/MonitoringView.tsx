import { Server, Wifi, Database } from 'lucide-react';
import { SYSTEM_STATUS_DATA } from '../../mock/socData';

export const MonitoringView: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
          System Health & Decoy Telemetry
        </h2>
        <p className="text-xs text-slate-400">
          Operational metrics for NexusGuard interception proxies, real-time message brokers, and honey node clusters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-md p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
              API Cluster Health
            </span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mb-1">
            {SYSTEM_STATUS_DATA.apiStatus}
          </div>
          <div className="text-xs font-mono text-slate-400 space-y-1 mt-3 pt-3 border-t border-slate-750">
            <div className="flex justify-between">
              <span>Cluster Region:</span>
              <span className="text-slate-200">{SYSTEM_STATUS_DATA.nodeRegion}</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime:</span>
              <span className="text-slate-200">{SYSTEM_STATUS_DATA.uptimeHours} hrs</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-md p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
              Metadata Database
            </span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mb-1">
            {SYSTEM_STATUS_DATA.metadataDbStatus}
          </div>
          <div className="text-xs font-mono text-slate-400 space-y-1 mt-3 pt-3 border-t border-slate-750">
            <div className="flex justify-between">
              <span>Sync Latency:</span>
              <span className="text-emerald-400 font-semibold">1.4 ms</span>
            </div>
            <div className="flex justify-between">
              <span>Pool Utilization:</span>
              <span className="text-slate-200">18% (Healthy)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-md p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold text-slate-400 uppercase">
              WebSocket Broker
            </span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mb-1">
            {SYSTEM_STATUS_DATA.wssStatus}
          </div>
          <div className="text-xs font-mono text-slate-400 space-y-1 mt-3 pt-3 border-t border-slate-750">
            <div className="flex justify-between">
              <span>Active SOC Clients:</span>
              <span className="text-slate-200">4 connected</span>
            </div>
            <div className="flex justify-between">
              <span>Throughput:</span>
              <span className="text-slate-200">14.2 msg/sec</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
