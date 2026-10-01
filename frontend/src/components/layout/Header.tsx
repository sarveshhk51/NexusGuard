import React from 'react';
import { 
  Wifi, 
  Database, 
  Server, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Flame
} from 'lucide-react';
import { NavigationTab } from '../../types/soc';
import { SYSTEM_STATUS_DATA } from '../../mock/socData';

interface HeaderProps {
  currentTab: NavigationTab;
  onRefresh?: () => void;
  onSimulateClick?: () => void;
  isStreaming?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentTab, 
  onRefresh,
  onSimulateClick,
  isStreaming = true 
}) => {
  const getTabTitle = (tab: NavigationTab): string => {
    switch (tab) {
      case 'dashboard': return 'SOC Dashboard';
      case 'targets': return 'Monitored Target Clusters';
      case 'schema-intelligence': return 'Schema Intelligence & Decoy Mapping';
      case 'deception': return 'Canary & Honey Asset Management';
      case 'alerts': return 'Incident & Threat Alerts';
      case 'events': return 'Real-time Security Event Ledger';
      case 'monitoring': return 'System Health & Decoy Telemetry';
      case 'users': return 'Security Team & Role Governance';
      case 'settings': return 'Platform Configurations';
      default: return 'SOC Dashboard';
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 select-none">
      {/* Left: View Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>SOC</span>
          <span>/</span>
          <span className="text-slate-100 font-semibold uppercase">{getTabTitle(currentTab)}</span>
        </div>
      </div>

      {/* Center / Right: Safe Operational Metrics Section */}
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono bg-slate-950/80 px-3.5 py-1.5 rounded border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">API:</span>
            <span className="text-emerald-400 font-medium">{SYSTEM_STATUS_DATA.apiStatus}</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Metadata DB:</span>
            <span className="text-emerald-400 font-medium">{SYSTEM_STATUS_DATA.metadataDbStatus}</span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <Wifi className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-400">WSS:</span>
            <span className={`${isStreaming ? 'text-emerald-400' : 'text-amber-400'} font-medium`}>
              {isStreaming ? SYSTEM_STATUS_DATA.wssStatus : 'Paused'}
            </span>
          </div>

          <span className="text-slate-700">|</span>

          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Version:</span>
            <span className="text-slate-300 font-medium">{SYSTEM_STATUS_DATA.version}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-3">
          {onSimulateClick && (
            <button
              onClick={onSimulateClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-md shadow-rose-950/40 transition-all cursor-pointer animate-pulse"
              title="Demonstrate Real-Time Attack & Containment"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulate Attack</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh telemetry"
              className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>UTC LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
};
